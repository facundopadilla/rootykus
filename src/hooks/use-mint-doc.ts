import { useCallback, useState } from 'react'
import { MOC_DOC_MINT_ADDRESS, MOC_DOC_MINT_ABI } from '../lib/rootstock'

export type MintStep = 'idle' | 'minting' | 'done' | 'error'

interface MintState {
  step: MintStep
  txHash: string | null
  error: string | null
}

const initialState: MintState = {
  step: 'idle',
  txHash: null,
  error: null,
}

function getEthereumProvider() {
  if (!window.ethereum) throw new Error('MetaMask no encontrado.')
  return window.ethereum
}

export function useMintDoc() {
  const [state, setState] = useState<MintState>(initialState)

  /**
   * Llama a mintDoc() en el contrato MoC enviando `tRBTCAmount` como value.
   * El parámetro btcToMint debe ser igual al value enviado (en wei).
   */
  const mintDoc = useCallback(async (tRBTCAmount: string) => {
    setState({ step: 'minting', txHash: null, error: null })

    try {
      const { BrowserProvider, Contract, parseEther } = await import('ethers')
      const provider = new BrowserProvider(getEthereumProvider())
      const signer = await provider.getSigner()

      const amountWei = parseEther(tRBTCAmount)
      const moc = new Contract(MOC_DOC_MINT_ADDRESS, MOC_DOC_MINT_ABI, signer)

      // btcToMint = el mismo valor que mandamos como value
      const tx = await moc.mintDoc(amountWei, { value: amountWei })
      const hash = (tx as { hash: string }).hash
      setState((prev) => ({ ...prev, txHash: hash }))

      await (tx as { wait: () => Promise<unknown> }).wait()
      setState((prev) => ({ ...prev, step: 'done' }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo mintear DOC.'
      setState({ step: 'error', txHash: null, error: message })
    }
  }, [])

  const reset = useCallback(() => setState(initialState), [])

  return { mint: state, mintDoc, reset }
}
