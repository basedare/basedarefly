'use client'

import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { useBaseDare } from '@/hooks/useBaseDare'
import { Button } from '@/components/ui/button'
import { Zap, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { FundButton } from '@coinbase/onchainkit/fund'
import { USDC_ABI } from '@/abis/BaseDareBounty'

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`

interface DareInteractionsProps {
  dareId: bigint
  streamer: string
  creator: string
  status: number // 0=ACTIVE, 1=COMPLETED, 2=VERIFIED, 3=FAILED
  expiry?: number // Not used in current contract, but keeping for compatibility
}

export default function DareInteractions({
  dareId,
  streamer,
  creator,
  status
}: DareInteractionsProps) {
  const { address } = useAccount()
  const { toast } = useToast()
  const { injectCapital, isConfirming } = useBaseDare()
  const [injectAmount, setInjectAmount] = useState('')
  const [showInjectInput, setShowInjectInput] = useState(false)

  // Check user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const amountInUnits = injectAmount ? parseUnits(injectAmount, 6) : BigInt(0)
  const hasInsufficientBalance = usdcBalance !== undefined && amountInUnits > BigInt(0) && usdcBalance < amountInUnits
  const formattedBalance = usdcBalance ? formatUnits(usdcBalance, 6) : '0'

  // Only show actions if dare is ACTIVE
  const isActive = status === 0

  // Handle Inject Capital
  const handleInjectCapital = async () => {
    if (!address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to inject capital",
        variant: "destructive"
      })
      return
    }

    if (!injectAmount || parseFloat(injectAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      })
      return
    }

    try {
      await injectCapital(Number(dareId), injectAmount)
      toast({
        title: "Capital Injected!",
        description: `Added ${injectAmount} USDC to the pot`,
      })
      setInjectAmount('')
      setShowInjectInput(false)
    } catch (error: any) {
      console.error("Inject capital failed:", error)
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to inject capital",
        variant: "destructive"
      })
    }
  }

  if (!isActive) {
    return (
      <div className="text-xs text-slate-600 text-center py-2">
        {status === 2 && "✅ Dare completed and paid out"}
        {status === 3 && "❌ Dare failed or refunded"}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {!showInjectInput ? (
        <Button
          onClick={() => setShowInjectInput(true)}
          size="sm"
          className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/50 font-bold text-xs uppercase tracking-wider"
        >
          <Plus className="w-3 h-3 mr-1" />
          Inject Capital
        </Button>
      ) : (
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Amount (USDC)"
            value={injectAmount}
            onChange={(e) => setInjectAmount(e.target.value)}
            className="w-full bg-black/50 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
          />
          {hasInsufficientBalance ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 text-center">
                Balance: {parseFloat(formattedBalance).toFixed(2)} USDC
              </p>
              <FundButton className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-md py-2">
                Get {injectAmount} USDC
              </FundButton>
              <Button
                onClick={() => {
                  setShowInjectInput(false)
                  setInjectAmount('')
                }}
                size="sm"
                variant="outline"
                className="w-full border-slate-700 text-slate-400 hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleInjectCapital}
                disabled={isConfirming || !injectAmount}
                size="sm"
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                <Zap className="w-3 h-3 mr-1" />
                {isConfirming ? "Confirming..." : "Confirm"}
              </Button>
              <Button
                onClick={() => {
                  setShowInjectInput(false)
                  setInjectAmount('')
                }}
                size="sm"
                variant="outline"
                className="border-slate-700 text-slate-400 hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

