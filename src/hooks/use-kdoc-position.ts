import { useCallback, useEffect, useState } from 'react'
import {
  ROOTSTOCK_RPC_URL,
  TROPYKUS_KDOC_ADDRESS,
  TROPYKUS_KDOC_READ_ABI,
  supplyRateToApy,
} from '../lib/rootstock'

export interface KDocPosition {
  kDocBalance: number | null        // saldo en kDOC (tokens)
  underlyingDoc: number | null      // saldo en DOC equivalente
  exchangeRate: number | null       // 1 kDOC = N DOC
  liveApy: number | null            // APY real on-chain (%)
  isLoading: boolean
  error: string | null
}

const initial: KDocPosition = {
  kDocBalance: null,
  underlyingDoc: null,
  exchangeRate: null,
  liveApy: null,
  isLoading: false,
  error: null,
}

/**
 * Lee la posición kDOC del usuario y el APY real del contrato Tropykus.
 * Usa un JsonRpcProvider (sin wallet) para los reads —
 * el APY es público y no requiere firma.
 *
 * Para balanceOfUnderlying (función non-view que usa eth_call) usamos
 * exchangeRateStored + balanceOf para evitar txs.
 */
export function useKDocPosition(account: string | null, isOnRootstock: boolean) {
  const [position, setPosition] = useState<KDocPosition>(initial)

  const fetchPosition = useCallback(async () => {
    if (!account || !isOnRootstock) {
      setPosition(initial)
      return
    }

    setPosition((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const { JsonRpcProvider, Contract, formatUnits } = await import('ethers')
      const provider = new JsonRpcProvider(ROOTSTOCK_RPC_URL)
      const kdoc = new Contract(TROPYKUS_KDOC_ADDRESS, TROPYKUS_KDOC_READ_ABI, provider)

      const [kBalRaw, exchangeRaw, supplyRateRaw, decimalsRaw] = await Promise.all([
        kdoc.balanceOf(account) as Promise<bigint>,
        kdoc.exchangeRateStored() as Promise<bigint>,
        kdoc.supplyRatePerBlock() as Promise<bigint>,
        kdoc.decimals() as Promise<bigint>,
      ])

      const decimals = Number(decimalsRaw)
      const kDocBalance = Number(formatUnits(kBalRaw, decimals))

      // exchangeRateStored viene en mantissa 1e18: 1 kDOC = exchangeRate DOC
      // DOC tiene 18 decimales, kDOC tiene 8 → ajuste: rate / 1e(18 - 8 + 18)
      // Fórmula estándar Compound: underlying = kDocBalance * exchangeRate / 1e18
      // pero kDOC tiene 8 decimales → exchangeRate está escalado por 1e18
      const exchangeScaled = Number(exchangeRaw) / 1e18
      const underlyingDoc = kDocBalance * exchangeScaled

      const liveApy = supplyRateToApy(supplyRateRaw)

      setPosition({
        kDocBalance,
        underlyingDoc,
        exchangeRate: exchangeScaled,
        liveApy,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo leer la posición kDOC.'
      setPosition((prev) => ({ ...prev, isLoading: false, error: msg }))
    }
  }, [account, isOnRootstock])

  useEffect(() => {
    void fetchPosition()
  }, [fetchPosition])

  return { position, refetch: fetchPosition }
}
