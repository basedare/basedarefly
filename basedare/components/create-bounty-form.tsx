'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAllowanceCheck } from '@/hooks/useAllowanceCheck';
import { ContractStatusBadge } from '@/components/ContractStatus';
import { useAccount } from 'wagmi';

// Frontend validation schema - uses streamerTag instead of address
const CreateBountySchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title too long'),
  amount: z
    .number({ message: 'Amount must be a number' })
    .min(5, 'Minimum bounty is $5 USDC')
    .max(10000, 'Maximum bounty is $10,000 USDC'),
  streamerTag: z
    .string()
    .min(3, 'Tag must be at least 3 characters')
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^@[a-zA-Z0-9_]+$/, 'Tag must start with @ and contain only letters, numbers, and underscores'),
  referrerTag: z
    .string()
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^(@[a-zA-Z0-9_]+)?$/, 'Tag must start with @ if provided')
    .optional()
    .or(z.literal('')),
  streamId: z.string().min(1, 'Stream ID is required'),
});

type CreateBountyFormData = z.infer<typeof CreateBountySchema>;

interface CreateBountyFormProps {
  defaultStreamId?: string;
}

export default function CreateBountyForm({ defaultStreamId = 'dev-stream-001' }: CreateBountyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ dareId: string; simulated?: boolean } | null>(null);
  const [showAllowanceWarning, setShowAllowanceWarning] = useState(false);
  const { toast } = useToast();
  const { checkAllowance, isChecking, checkResult } = useAllowanceCheck();
  const { address } = useAccount();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateBountyFormData>({
    resolver: zodResolver(CreateBountySchema),
    defaultValues: {
      title: '',
      amount: 5,
      streamerTag: '',
      referrerTag: '',
      streamId: defaultStreamId,
    },
  });

  const watchAmount = watch('amount');

  const onSubmit = async (data: CreateBountyFormData) => {
    // Pre-submit: Check allowance and gas
    const check = await checkAllowance(data.amount);

    if (!check.hasEnoughGas) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Gas',
        description: `Referee wallet needs at least 0.001 ETH for gas. Current: ${check.ethBalance} ETH`,
      });
      return;
    }

    if (check.needsApproval) {
      setShowAllowanceWarning(true);
      toast({
        variant: 'destructive',
        title: 'USDC Allowance Required',
        description: `Need ${data.amount} USDC allowance. Current: ${check.usdcAllowance} USDC. Approve first!`,
      });
      return;
    }

    setIsSubmitting(true);
    setSuccessData(null);
    setShowAllowanceWarning(false);

    try {
      const response = await fetch('/api/bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          referrerTag: data.referrerTag || undefined,
          stakerAddress: address || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccessData({
          dareId: result.data.dareId,
          simulated: result.simulated,
        });

        toast({
          title: result.simulated ? 'SIMULATION SUCCESS' : 'Bounty Created',
          description: `Truth Machine Dare ID: ${result.data.dareId}`,
          duration: 6000,
        });

        reset();
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to create bounty',
          description: result.error || 'Unknown error',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network error';
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveClick = async () => {
    // Mock approve - in production, this would trigger a wallet transaction
    toast({
      title: 'Approval Required',
      description: 'Connect wallet to approve USDC spend. (Simulation mode: approval skipped)',
    });
    setShowAllowanceWarning(false);
  };

  return (
    <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Glassmorphic overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-white/[0.02] pointer-events-none rounded-3xl" />

      <div className="relative p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Create Bounty</h2>
            <ContractStatusBadge />
          </div>
          <p className="text-white/50 text-sm">
            Stake USDC on a dare for your favorite streamer
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/70 text-xs font-mono uppercase tracking-wider">Dare Title</Label>
            <Input
              id="title"
              placeholder="I dare you to..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/10 transition-all"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-red-400 text-xs">{errors.title.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white/70 text-xs font-mono uppercase tracking-wider">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              min={5}
              max={10000}
              step={1}
              placeholder="5"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/10 transition-all"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-red-400 text-xs">{errors.amount.message}</p>
            )}
          </div>

          {/* Streamer Tag */}
          <div className="space-y-2">
            <Label htmlFor="streamerTag" className="text-white/70 text-xs font-mono uppercase tracking-wider">Streamer Tag</Label>
            <Input
              id="streamerTag"
              placeholder="@KaiCenat"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/10 transition-all"
              {...register('streamerTag')}
            />
            {errors.streamerTag && (
              <p className="text-red-400 text-xs">{errors.streamerTag.message}</p>
            )}
            <p className="text-white/30 text-xs">
              We'll map your tag to an address later
            </p>
          </div>

          {/* Referrer Tag (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="referrerTag" className="text-white/70 text-xs font-mono uppercase tracking-wider">Referrer Tag (Optional)</Label>
            <Input
              id="referrerTag"
              placeholder="@recruiter"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/10 transition-all"
              {...register('referrerTag')}
            />
            {errors.referrerTag && (
              <p className="text-red-400 text-xs">{errors.referrerTag.message}</p>
            )}
            <p className="text-white/30 text-xs">
              Earn 1% if your referral completes the dare
            </p>
          </div>

          {/* Allowance Warning */}
          {showAllowanceWarning && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-yellow-400 text-sm font-medium">USDC Approval Needed</p>
                <p className="text-yellow-400/70 text-xs mt-1">
                  Current allowance: {checkResult?.usdcAllowance || '0'} USDC. Need: {watchAmount} USDC
                </p>
                <button
                  type="button"
                  onClick={handleApproveClick}
                  className="mt-2 h-8 px-4 text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors"
                >
                  Approve USDC
                </button>
              </div>
            </div>
          )}

          {/* Hidden Stream ID for dev/testing */}
          <input type="hidden" {...register('streamId')} />

          {/* Submit Button - Liquid Metal Style */}
          <div className="relative group p-[1.5px] rounded-xl overflow-hidden">
            {/* Spinning liquid metal border */}
            <div
              className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#737373_20%,#fff_25%,#737373_30%,#1a1a1a_50%,#737373_70%,#fff_75%,#737373_80%,#1a1a1a_100%)] animate-[spin_3s_linear_infinite] opacity-60 group-hover:opacity-100 transition-opacity duration-500"
              aria-hidden="true"
            />
            <button
              type="submit"
              disabled={isSubmitting || isChecking}
              className="relative w-full flex items-center justify-center bg-[#050505] backdrop-blur-xl px-6 py-3 rounded-[10px] font-bold text-white uppercase tracking-wider text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none rounded-[10px]" />
              <span className="relative z-10 flex items-center">
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking Allowance...
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Bounty'
                )}
              </span>
            </button>
          </div>

          {/* Success Message */}
          {successData && (
            <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <p className="text-green-400 font-semibold text-sm">
                  {successData.simulated ? 'SIMULATION SUCCESS' : 'Bounty Created'}
                </p>
                {successData.simulated && (
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-yellow-500/20 text-yellow-400 rounded">
                    Simulated
                  </span>
                )}
              </div>
              <p className="text-green-400/80 text-xs mt-1 font-mono">
                Dare ID: {successData.dareId}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
