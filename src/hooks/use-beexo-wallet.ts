import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DOC_TOKEN_ABI,
  DOC_TOKEN_ADDRESS,
  ROOTSTOCK_CHAIN_ID_HEX,
  ROOTSTOCK_RPC_URL,
  TREASURY_POLICY,
  TROPYKUS_KDOC_ADDRESS,
  isRootstockChain,
} from '../lib/rootstock'

// Beexo inyecta window.XOConnect en su WebView
declare global {
  interface Window {
    XOConnect?: unknown
  }
}

export function isBeexoContext(): boolean {
  if (typeof window === 'undefined') return false
  if (window.XOConnect) return true

  const walletParam = new URLSearchParams(window.location.search).get('wallet')
  if (walletParam?.toLowerCase() === 'beexo') return true

  if (typeof navigator === 'undefined') return false

  return /XOLabs|BeexoWallet|XO\/\d/i.test(navigator.userAgent)
}

interface WalletSnapshot {
  account: string | null
  chainId: string | null
  isConnecting: boolean
  isSwitching: boolean
  isRefreshing: boolean
  status: 'idle' | 'ready' | 'wrong-network' | 'error'
  docBalance: number | null
  docSymbol: string
  allowanceToTropykus: number | null
  monthlyProjection: number | null
  reserveAmount: number | null
  deployableAmount: number | null
  error: string | null
}

const initialState: WalletSnapshot = {
  account: null,
  chainId: null,
  isConnecting: false,
  isSwitching: false,
  isRefreshing: false,
  status: 'idle',
  docBalance: null,
  docSymbol: 'DOC',
  allowanceToTropykus: null,
  monthlyProjection: null,
  reserveAmount: null,
  deployableAmount: null,
  error: null,
}

async function getXOProvider() {
  const { XOConnectProvider } = await import('xo-connect')
  return new XOConnectProvider({
    defaultChainId: ROOTSTOCK_CHAIN_ID_HEX,
    rpcs: {
      [ROOTSTOCK_CHAIN_ID_HEX]: ROOTSTOCK_RPC_URL,
    },
    debug: true, // Muestra panel de debug visible en el WebView para diagnosticar
  })
}

async function readDocBalanceFromProvider(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _provider: any,
  account: string,
) {
  const { JsonRpcProvider, Contract, formatUnits } = await import('ethers')

  // Usamos JsonRpcProvider directo al RPC — más confiable que BrowserProvider para reads
  // El XOConnectProvider de Beexo no garantiza eth_call via WebView
  const rpcProvider = new JsonRpcProvider(ROOTSTOCK_RPC_URL)
  const token = new Contract(DOC_TOKEN_ADDRESS, DOC_TOKEN_ABI, rpcProvider)

  console.log('[DOCFlow] Leyendo balance DOC para:', account)

  const [balanceRaw, decimals, symbol, allowanceRaw] = await Promise.all([
    token.balanceOf(account) as Promise<bigint>,
    token.decimals() as Promise<bigint>,
    token.symbol() as Promise<string>,
    token.allowance(account, TROPYKUS_KDOC_ADDRESS) as Promise<bigint>,
  ])

  const dec = Number(decimals)
  const balance = Number(formatUnits(balanceRaw, dec))
  const allowance = Number(formatUnits(allowanceRaw, dec))

  console.log('[DOCFlow] Balance DOC raw:', balanceRaw.toString(), '→', balance, symbol)
  console.log('[DOCFlow] Allowance kDOC:', allowance)

  const reserveAmount = balance * TREASURY_POLICY.reserveRatio
  const deployableAmount = Math.max(balance - reserveAmount, 0)
  const monthlyProjection = (deployableAmount * TREASURY_POLICY.sampleApy) / 100 / 12

  return { balance, symbol, allowance, reserveAmount, deployableAmount, monthlyProjection }
}

export function useBeexoWallet() {
  const [wallet, setWallet] = useState<WalletSnapshot>(initialState)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [xoProvider, setXoProvider] = useState<any>(null)

  const syncAccountState = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (account: string, chainId: string, provider: any) => {
      const nextStatus = isRootstockChain(chainId) ? 'ready' : 'wrong-network'
      setWallet((prev) => ({ ...prev, account, chainId, status: nextStatus, error: null }))

      if (!isRootstockChain(chainId)) return

      try {
        const snapshot = await readDocBalanceFromProvider(provider, account)
        setWallet((prev) => ({
          ...prev,
          account,
          chainId,
          status: 'ready',
          docBalance: snapshot.balance,
          docSymbol: snapshot.symbol,
          allowanceToTropykus: snapshot.allowance,
          reserveAmount: snapshot.reserveAmount,
          deployableAmount: snapshot.deployableAmount,
          monthlyProjection: snapshot.monthlyProjection,
          error: null,
        }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo leer el balance DOC.'
        setWallet((prev) => ({ ...prev, status: 'error', error: msg }))
      }
    },
    [],
  )

  const connect = useCallback(async () => {
    setWallet((prev) => ({ ...prev, isConnecting: true, error: null }))

    try {
      const provider = await getXOProvider()
      setXoProvider(provider)

      // Usamos XOConnect directamente para ver TODAS las currencies y encontrar RSK
      const { XOConnect } = await import('xo-connect')
      const client = await XOConnect.getClient()
      const currencies = ((client?.currencies ?? []) as Array<{
        id?: string
        address?: string
        chainId?: string | number
      }>)

      console.log('[DOCFlow] Client currencies:', JSON.stringify(currencies, null, 2))

      // Buscamos la dirección RSK con múltiples estrategias de chainId
      // Beexo mainnet usa "0x1e" (30 decimal), pero también intentamos fallbacks
      const RSK_CHAIN_IDS = ['0x1e', '30', '0x1E', '0x1f', '31', '0x1F']
      let account: string | null = null

      // Estrategia 1: buscar por chainId exacto (hex o decimal)
      for (const c of currencies) {
        const cid = String(c.chainId ?? '').toLowerCase()
        if (RSK_CHAIN_IDS.map(x => x.toLowerCase()).includes(cid) && c.address) {
          account = c.address ?? null
          console.log('[DOCFlow] Cuenta RSK encontrada por chainId:', cid, account)
          break
        }
      }

      // Estrategia 2: buscar por id de currency que contenga "rootstock"
      if (!account) {
        for (const c of currencies) {
          if (String(c.id ?? '').toLowerCase().includes('rootstock') && c.address) {
            account = c.address ?? null
            console.log('[DOCFlow] Cuenta RSK encontrada por currency id:', c.id, account)
            break
          }
        }
      }

      // Estrategia 3: tomar la primera EVM address disponible (todas comparten dirección en EVM)
      if (!account) {
        const evmCurrency = currencies.find(c =>
          c.address && /^0x[0-9a-fA-F]{40}$/.test(c.address)
        )
        if (evmCurrency) {
          account = evmCurrency.address ?? null
          console.log('[DOCFlow] Cuenta EVM fallback:', evmCurrency.id, account)
        }
      }

      if (!account) {
        throw new Error(`Beexo no tiene una cuenta EVM. Currencies: ${currencies.map(c => c.id).join(', ')}`)
      }

      await syncAccountState(account, ROOTSTOCK_CHAIN_ID_HEX, provider)
    } catch (err) {
      console.error('[DOCFlow] Error en connect:', err)
      const msg = err instanceof Error ? err.message : 'No se pudo conectar con Beexo.'
      setWallet((prev) => ({ ...prev, status: 'error', error: msg }))
    } finally {
      setWallet((prev) => ({ ...prev, isConnecting: false }))
    }
  }, [syncAccountState])

  const switchToRootstock = useCallback(async () => {
    if (!xoProvider) return
    setWallet((prev) => ({ ...prev, isSwitching: true, error: null }))

    try {
      await xoProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ROOTSTOCK_CHAIN_ID_HEX }],
      })

      const accounts = (await xoProvider.request({ method: 'eth_accounts' })) as string[]
      const chainId = (await xoProvider.request({ method: 'eth_chainId' })) as string

      if (!accounts.length) throw new Error('Sin cuentas tras cambiar de red.')
      await syncAccountState(accounts[0], chainId, xoProvider)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cambiar a Rootstock.'
      setWallet((prev) => ({ ...prev, status: 'error', error: msg }))
    } finally {
      setWallet((prev) => ({ ...prev, isSwitching: false }))
    }
  }, [xoProvider, syncAccountState])

  const refresh = useCallback(async () => {
    if (!wallet.account || !wallet.chainId || !xoProvider) return
    setWallet((prev) => ({ ...prev, isRefreshing: true, error: null }))
    await syncAccountState(wallet.account, wallet.chainId, xoProvider)
    setWallet((prev) => ({ ...prev, isRefreshing: false }))
  }, [wallet.account, wallet.chainId, xoProvider, syncAccountState])

  const disconnect = useCallback(() => {
    setWallet(initialState)
    setXoProvider(null)
  }, [])

  // Escuchar eventos de cambio de cuenta/red del provider XO
  useEffect(() => {
    if (!xoProvider) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts.length) {
        setWallet(initialState)
        return
      }
      void syncAccountState(accounts[0], wallet.chainId ?? ROOTSTOCK_CHAIN_ID_HEX, xoProvider)
    }

    const handleChainChanged = (chainId: string) => {
      if (wallet.account) {
        void syncAccountState(wallet.account, chainId, xoProvider)
      }
    }

    xoProvider.on('accountsChanged', handleAccountsChanged)
    xoProvider.on('chainChanged', handleChainChanged)

    return () => {
      xoProvider.removeListener('accountsChanged', handleAccountsChanged)
      xoProvider.removeListener('chainChanged', handleChainChanged)
    }
  }, [xoProvider, wallet.account, wallet.chainId, syncAccountState])

  const flags = useMemo(
    () => ({
      isConnected: Boolean(wallet.account),
      isOnRootstock: isRootstockChain(wallet.chainId),
      isBeexo: isBeexoContext(),
    }),
    [wallet.account, wallet.chainId],
  )

  return { wallet, flags, connect, switchToRootstock, refresh, disconnect, xoProvider }
}
