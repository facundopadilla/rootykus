import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEMO_MODE,
  DOC_TOKEN_ABI,
  DOC_TOKEN_ADDRESS,
  ROOTSTOCK_CHAIN_ID_HEX,
  ROOTSTOCK_EXPLORER_URL,
  ROOTSTOCK_NATIVE_SYMBOL,
  ROOTSTOCK_NETWORK_NAME,
  ROOTSTOCK_RPC_URL,
  TREASURY_POLICY,
  TROPYKUS_KDOC_ADDRESS,
  isRootstockChain,
} from '../lib/rootstock'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
      on?: (event: string, listener: (...args: unknown[]) => void) => void
      removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
      isMetaMask?: boolean
    }
  }
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
  isDemoMode: boolean
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
  isDemoMode: false,
  error: null,
}

function getEthereumProvider() {
  if (!window.ethereum) {
    throw new Error('MetaMask no fue encontrado en este browser.')
  }

  return window.ethereum
}

async function readDocBalance(account: string) {
  const { BrowserProvider, Contract, formatUnits } = await import('ethers')
  const provider = new BrowserProvider(getEthereumProvider())
  const token = new Contract(DOC_TOKEN_ADDRESS, DOC_TOKEN_ABI, provider)
  const [balanceRaw, decimals, symbol, allowanceRaw] = await Promise.all([
    token.balanceOf(account),
    token.decimals(),
    token.symbol(),
    token.allowance(account, TROPYKUS_KDOC_ADDRESS),
  ])

  const realBalance = Number(formatUnits(balanceRaw, decimals))
  const allowance = Number(formatUnits(allowanceRaw, decimals))

  // Si no hay DOC real, activamos demo mode con un balance simulado
  const isDemoMode = realBalance === 0
  const balance = isDemoMode ? DEMO_MODE.demoBalance : realBalance

  const reserveAmount = balance * TREASURY_POLICY.reserveRatio
  const deployableAmount = Math.max(balance - reserveAmount, 0)
  const monthlyProjection = (deployableAmount * TREASURY_POLICY.sampleApy) / 100 / 12

  return {
    balance,
    symbol,
    allowance,
    reserveAmount,
    deployableAmount,
    monthlyProjection,
    isDemoMode,
  }
}

export function useEvmWallet() {
  const [wallet, setWallet] = useState<WalletSnapshot>(initialState)

  const syncAccountState = useCallback(async (account: string, chainId: string) => {
    const nextStatus = isRootstockChain(chainId) ? 'ready' : 'wrong-network'

    setWallet((prev) => ({
      ...prev,
      account,
      chainId,
      status: nextStatus,
      error: null,
    }))

    if (!isRootstockChain(chainId)) {
      return
    }

    try {
      const snapshot = await readDocBalance(account)
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
        isDemoMode: snapshot.isDemoMode,
        error: null,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo leer el balance DOC.'
      setWallet((prev) => ({
        ...prev,
        status: 'error',
        error: message,
      }))
    }
  }, [])

  const connect = useCallback(async () => {
    setWallet((prev) => ({ ...prev, isConnecting: true, error: null }))

    try {
      const provider = getEthereumProvider()
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string

      if (!accounts.length) {
        throw new Error('MetaMask no devolvió ninguna cuenta.')
      }

      await syncAccountState(accounts[0], chainId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo conectar con MetaMask.'
      setWallet((prev) => ({ ...prev, status: 'error', error: message }))
    } finally {
      setWallet((prev) => ({ ...prev, isConnecting: false }))
    }
  }, [syncAccountState])

  const switchToRootstock = useCallback(async () => {
    setWallet((prev) => ({ ...prev, isSwitching: true, error: null }))

    try {
      const provider = getEthereumProvider()

      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ROOTSTOCK_CHAIN_ID_HEX }],
        })
      } catch {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: ROOTSTOCK_CHAIN_ID_HEX,
              chainName: ROOTSTOCK_NETWORK_NAME,
              nativeCurrency: {
                name: ROOTSTOCK_NATIVE_SYMBOL,
                symbol: ROOTSTOCK_NATIVE_SYMBOL,
                decimals: 18,
              },
              rpcUrls: [ROOTSTOCK_RPC_URL],
              blockExplorerUrls: [ROOTSTOCK_EXPLORER_URL],
            },
          ],
        })
      }

      const accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string

      if (!accounts.length) {
        throw new Error('La wallet cambió de red pero no hay ninguna cuenta conectada.')
      }

      await syncAccountState(accounts[0], chainId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar a Rootstock.'
      setWallet((prev) => ({ ...prev, status: 'error', error: message }))
    } finally {
      setWallet((prev) => ({ ...prev, isSwitching: false }))
    }
  }, [syncAccountState])

  const refresh = useCallback(async () => {
    if (!wallet.account || !wallet.chainId) {
      return
    }

    setWallet((prev) => ({ ...prev, isRefreshing: true, error: null }))
    await syncAccountState(wallet.account, wallet.chainId)
    setWallet((prev) => ({ ...prev, isRefreshing: false }))
  }, [syncAccountState, wallet.account, wallet.chainId])

  const disconnect = useCallback(() => {
    setWallet(initialState)
  }, [])

  useEffect(() => {
    if (!window.ethereum) {
      return
    }

    void getEthereumProvider()
      .request({ method: 'eth_accounts' })
      .then(async (accounts) => {
        const nextAccounts = Array.isArray(accounts) ? (accounts as string[]) : []

        if (!nextAccounts.length) {
          return
        }

        const chainId = (await getEthereumProvider().request({ method: 'eth_chainId' })) as string
        await syncAccountState(nextAccounts[0], chainId)
      })
      .catch(() => {
        setWallet((prev) => ({
          ...prev,
          error: null,
        }))
      })
  }, [syncAccountState])

  const flags = useMemo(
    () => ({
      isConnected: Boolean(wallet.account),
      isOnRootstock: isRootstockChain(wallet.chainId),
      hasMetaMask: Boolean(window.ethereum),
    }),
    [wallet.account, wallet.chainId],
  )

  return {
    wallet,
    flags,
    connect,
    switchToRootstock,
    refresh,
    disconnect,
  }
}
