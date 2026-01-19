'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAddress } from 'viem';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Frontend validation schema - matches API requirements
const CreateBountySchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title too long'),
  amount: z
    .number({ message: 'Amount must be a number' })
    .min(5, 'Minimum bounty is $5 USDC')
    .max(10000, 'Maximum bounty is $10,000 USDC'),
  streamerAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'),
  streamId: z.string().min(1, 'Stream ID is required'),
});

type CreateBountyFormData = z.infer<typeof CreateBountySchema>;

interface CreateBountyFormProps {
  defaultStreamId?: string;
}

export default function CreateBountyForm({ defaultStreamId = 'dev-stream-001' }: CreateBountyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ dareId: string; simulated?: boolean } | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBountyFormData>({
    resolver: zodResolver(CreateBountySchema),
    defaultValues: {
      title: '',
      amount: 5,
      streamerAddress: '',
      streamId: defaultStreamId,
    },
  });

  const onSubmit = async (data: CreateBountyFormData) => {
    setIsSubmitting(true);
    setSuccessData(null);

    // Additional checksum validation
    if (!isAddress(data.streamerAddress)) {
      toast({
        variant: 'destructive',
        title: 'Invalid address',
        description: 'Please enter a valid Ethereum address',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setSuccessData({
          dareId: result.data.dareId,
          simulated: result.simulated,
        });

        toast({
          title: 'Bounty Created',
          description: `Truth Machine Dare ID: ${result.data.dareId}${result.simulated ? ' (simulated)' : ''}`,
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

  return (
    <Card className="w-full max-w-md border-white/10 bg-black/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-white text-xl">Create Bounty</CardTitle>
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

          {/* Streamer Wallet Address */}
          <div className="space-y-2">
            <Label htmlFor="streamerAddress">Streamer Wallet Address</Label>
            <Input
              id="streamerAddress"
              placeholder="0x..."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 font-mono text-sm"
              {...register('streamerAddress')}
            />
            {errors.streamerAddress && (
              <p className="text-red-400 text-sm">{errors.streamerAddress.message}</p>
            )}
          </div>

          {/* Hidden Stream ID for dev/testing */}
          <input type="hidden" {...register('streamId')} />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold"
          >
            {isSubmitting ? 'Creating...' : 'Create Bounty'}
          </Button>

          {/* Success Message */}
          {successData && (
            <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 font-semibold text-sm">
                Bounty Created Successfully
              </p>
              <p className="text-green-400/80 text-xs mt-1 font-mono">
                Dare ID: {successData.dareId}
              </p>
              {successData.simulated && (
                <p className="text-yellow-400/80 text-xs mt-1">
                  (Simulated - contract not deployed)
                </p>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
