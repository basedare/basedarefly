'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    <Card className="w-full max-w-md border-white/10 bg-black/60 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-xl">Create Bounty</CardTitle>
          <ContractStatusBadge />
        </div>
        <CardDescription className="text-white/60">
          Stake USDC on a dare for your favorite streamer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Dare Title</Label>
            <Input
              id="title"
              placeholder="I dare you to..."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-red-400 text-sm">{errors.title.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              min={5}
              max={10000}
              step={1}
              placeholder="5"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-red-400 text-sm">{errors.amount.message}</p>
            )}
          </div>

          {/* Streamer Tag */}
          <div className="space-y-2">
            <Label htmlFor="streamerTag">Streamer Tag</Label>
            <Input
              id="streamerTag"
              placeholder="@KaiCenat"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
              {...register('streamerTag')}
            />
            {errors.streamerTag && (
              <p className="text-red-400 text-sm">{errors.streamerTag.message}</p>
            )}
            <p className="text-white/40 text-xs">
              We'll map your tag to an address later
            </p>
          </div>

          {/* Referrer Tag (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="referrerTag">Referrer Tag (Optional)</Label>
            <Input
              id="referrerTag"
              placeholder="@recruiter"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
              {...register('referrerTag')}
            />
            {errors.referrerTag && (
              <p className="text-red-400 text-sm">{errors.referrerTag.message}</p>
            )}
            <p className="text-white/40 text-xs">
              Earn 1% if your referral completes the dare
            </p>
          </div>

          {/* Allowance Warning */}
          {showAllowanceWarning && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-yellow-400 text-sm font-medium">USDC Approval Needed</p>
                <p className="text-yellow-400/70 text-xs mt-1">
                  Current allowance: {checkResult?.usdcAllowance || '0'} USDC. Need: {watchAmount} USDC
                </p>
                <Button
                  type="button"
                  onClick={handleApproveClick}
                  className="mt-2 h-8 text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                >
                  Approve USDC
                </Button>
              </div>
            </div>
          )}

          {/* Hidden Stream ID for dev/testing */}
          <input type="hidden" {...register('streamId')} />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || isChecking}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold"
          >
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
          </Button>

          {/* Success Message */}
          {successData && (
            <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
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
      </CardContent>
    </Card>
  );
}
