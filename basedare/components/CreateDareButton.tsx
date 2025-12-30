'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { Loader2, CheckCircle2, Wallet, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { PROTOCOL_ABI, USDC_ABI } from '@/abis/BaseDareProtocol'

// CONFIGURATION
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}` // Base Sepolia USDC
const PROTOCOL_ADDRESS = process.env.NEXT_PUBLIC_PROTOCOL_ADDRESS as `0x${string}`

interface CreateDareButtonProps {
  streamerAddress: `0x${string}`
  amount: string 
  referrerAddress?: `0x${string}`
}

export default function CreateDareButton({ 
  streamerAddress, 
  amount, 
  referrerAddress = '0x0000000000000000000000000000000000000000' 
}: CreateDareButtonProps) {
  const { address } = useAccount()
  const { toast } = useToast()
  const [step, setStep] = useState<'idle' | 'approving' | 'approved' | 'creating' | 'success'>('idle')
  
  const amountBigInt = amount ? parseUnits(amount, 6) : BigInt(0)
  const { writeContractAsync } = useWriteContract()

  // READ ALLOWANCE
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [address!, PROTOCOL_ADDRESS],
    query: { enabled: !!address && !!amount },
  })

  // TX WATCHERS
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>()
  const { isLoading: isWaitingApproval, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({ hash: approveHash })

  const [createHash, setCreateHash] = useState<`0x${string}` | undefined>()
  const { isLoading: isWaitingCreate, isSuccess: isCreateConfirmed } = useWaitForTransactionReceipt({ hash: createHash })

  // HANDLERS (Using useCallback to fix useEffect dependency)
  const handleCreateDare = useCallback(async () => {
    try {
      setStep('creating')
      const hash = await writeContractAsync({
        address: PROTOCOL_ADDRESS,
        abi: PROTOCOL_ABI,
        functionName: 'createDare',
        args: [streamerAddress, amountBigInt, referrerAddress],
      })
      setCreateHash(hash)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Transaction rejected',
        description: err.message || 'Create dare was cancelled',
        variant: 'destructive',
      })
      setStep('approved')
    }
  }, [writeContractAsync, streamerAddress, amountBigInt, referrerAddress, toast])

  const handleApprove = async () => {
    try {
      setStep('approving')
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [PROTOCOL_ADDRESS, amountBigInt],
      })
      setApproveHash(hash)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Approval rejected',
        description: err.message || 'Approval was cancelled',
        variant: 'destructive',
      })
      setStep('idle')
    }
  }

  // EFFECTS
  useEffect(() => {
    if (isApprovalConfirmed && step === 'approving') {
      toast({ 
        title: "USDC Approved", 
        description: "Now create the dare." 
      })
      setStep('approved')
      refetchAllowance()
      handleCreateDare() 
    }
  }, [isApprovalConfirmed, step, toast, refetchAllowance, handleCreateDare])

  useEffect(() => {
    if (isCreateConfirmed && step === 'creating') {
      toast({ 
        title: "DARE LIVE!", 
        description: "The trap is set." 
      })
      setStep('success')
    }
  }, [isCreateConfirmed, step, toast])

  // --- RENDER ---
  if (!address) {
    return (
      <Button disabled className="w-full bg-slate-900 border border-slate-800 text-slate-500 font-mono tracking-widest uppercase py-6 opacity-50 cursor-not-allowed">
        <Wallet className="mr-2 h-4 w-4" /> Wallet Disconnected
      </Button>
    )
  }

  if (step === 'success') {
    return (
      <Button className="w-full bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-widest py-6 shadow-[0_0_20px_rgba(34,197,94,0.6)] border border-green-400">
        <CheckCircle2 className="mr-2 h-6 w-6" /> BOUNTY ACTIVE
      </Button>
    )
  }

  const needsApproval = allowance !== undefined && allowance < amountBigInt && step === 'idle'

  return (
    <Button 
      onClick={needsApproval ? handleApprove : handleCreateDare}
      disabled={isWaitingApproval || isWaitingCreate || !amount || parseFloat(amount) <= 0}
      className={`
        w-full py-6 text-xl font-black italic uppercase tracking-widest transition-all duration-300 relative overflow-hidden group border
        ${needsApproval || step === 'approving' 
          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] border-blue-400' 
          : 'bg-[#FFD700] hover:bg-[#FFC000] text-black shadow-[0_0_30px_rgba(255,215,0,0.5)] border-yellow-300'
        }
      `}
    >
      <span className="relative z-10 flex items-center justify-center">
        {isWaitingApproval ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> APPROVING...</>
        ) : isWaitingCreate ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> MINTING...</>
        ) : needsApproval ? (
          <><Zap className="mr-2 h-5 w-5 fill-current" /> APPROVE FUNDS</>
        ) : (
          <><Zap className="mr-2 h-5 w-5 fill-current" /> LAUNCH DARE</>
        )}
      </span>
    </Button>
  )
}
