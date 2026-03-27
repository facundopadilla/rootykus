import { useCallback, useState } from 'react'
import {
  DOC_TOKEN_ADDRESS,
  DOC_TOKEN_WRITE_ABI,
  TROPYKUS_KDOC_ABI,
  TROPYKUS_KDOC_ADDRESS,
} from '../lib/rootstock'

export type AllocationStep = 'idle' | 'approving' | 'depositing' | 'done' | 'error'

interface AllocationState {
  step: AllocationStep
  approveTxHash: string | null
  depositTxHash: string | null
  error: string | null
}

const initialState: AllocationState = {
  step: 'idle',
  approveTxHash: null,
  depositTxHash: null,
  error: null,
}

async function runRealFlow(
  amountDOC: number,
  onApprove: (hash: string) => void,
  onDeposit: (hash: string) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  externalProvider?: any,
) {
  if (!externalProvider) throw new Error('No hay proveedor de wallet disponible.')

  const { BrowserProvider, Contract, parseUnits } = await import('ethers')
  const provider = new BrowserProvider(externalProvider)
  const signer = await provider.getSigner()

  // Parseamos con 18 decimales (DOC usa 18)
  const amountWei = parseUnits(String(amountDOC), 18)

  // Paso 1: approve
  const docToken = new Contract(DOC_TOKEN_ADDRESS, DOC_TOKEN_WRITE_ABI, signer)
  const approveTx = await docToken.approve(TROPYKUS_KDOC_ADDRESS, amountWei)
  onApprove((approveTx as { hash: string }).hash)
  await (approveTx as { wait: () => Promise<unknown> }).wait()

  // Paso 2: mint/deposit en kDOC
  const kDoc = new Contract(TROPYKUS_KDOC_ADDRESS, TROPYKUS_KDOC_ABI, signer)
  const depositTx = await kDoc.mint(amountWei)
  onDeposit((depositTx as { hash: string }).hash)
  await (depositTx as { wait: () => Promise<unknown> }).wait()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAllocation(externalProvider?: any) {
  const [state, setState] = useState<AllocationState>(initialState)

  const allocate = useCallback(
    async (amountDOC: number) => {
      if (amountDOC <= 0) return

      setState({ step: 'approving', approveTxHash: null, depositTxHash: null, error: null })

      try {
        const onApprove = (hash: string) =>
          setState((prev) => ({ ...prev, step: 'depositing', approveTxHash: hash }))

        const onDeposit = (hash: string) =>
          setState((prev) => ({ ...prev, step: 'done', depositTxHash: hash }))

        await runRealFlow(amountDOC, onApprove, onDeposit, externalProvider)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'La transacción falló.'
        setState((prev) => ({ ...prev, step: 'error', error: message }))
      }
    },
    [externalProvider],
  )

  const reset = useCallback(() => setState(initialState), [])

  return { allocation: state, allocate, reset }
}
