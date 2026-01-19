'use client';
import React, { useState } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Wallet, Clock, Users, ChevronRight, Loader2, CheckCircle } from "lucide-react";
import DareGenerator from "@/components/DareGenerator";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";
import { useToast } from '@/components/ui/use-toast';

// Validation schema matching the API
const CreateBountySchema = z.object({
  streamerTag: z
    .string()
    .min(3, 'Tag must be at least 3 characters')
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^@[a-zA-Z0-9_]+$/, 'Tag must start with @ (e.g., @KaiCenat)'),
  title: z
    .string()
    .min(3, 'Mission must be at least 3 characters')
    .max(100, 'Mission too long'),
  amount: z
    .number({ message: 'Amount must be a number' })
    .min(5, 'Minimum bounty is $5 USDC')
    .max(10000, 'Maximum bounty is $10,000 USDC'),
  timeValue: z.number().min(1, 'Time value required'),
  timeUnit: z.enum(['Hours', 'Days', 'Weeks']),
  streamId: z.string().default('dev-stream-001'),
});

type FormData = z.infer<typeof CreateBountySchema>;

export default function CreateDare() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ dareId: string; simulated?: boolean } | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(CreateBountySchema),
    defaultValues: {
      streamerTag: '',
      title: '',
      amount: 100,
      timeValue: 24,
      timeUnit: 'Hours',
      streamId: 'dev-stream-001',
    },
  });

  const watchAmount = watch('amount');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSuccessData(null);

    try {
      const response = await fetch('/api/bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          amount: data.amount,
          streamerTag: data.streamerTag,
          streamId: data.streamId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccessData({
          dareId: result.data.dareId,
          simulated: result.simulated,
        });

        toast({
          title: result.simulated ? '🧪 SIMULATION SUCCESS' : '✅ CONTRACT DEPLOYED',
          description: `Dare ID: ${result.data.dareId}`,
          duration: 6000,
        });

        // Reset form after successful submission
        reset();
      } else {
        toast({
          variant: 'destructive',
          title: 'Deploy Failed',
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
    <div className="relative min-h-screen flex flex-col py-24 px-4 md:px-8">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>

      <div className="container mx-auto px-6 relative z-10 max-w-4xl flex-grow">

        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">
            INIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-orange-500">PROTOCOL</span>
          </h1>
          <p className="text-gray-400 font-mono tracking-widest uppercase text-xs md:text-sm">
            Deploy a new smart contract dare on Base L2
          </p>
        </div>

        {/* SUCCESS STATE */}
        {successData && (
          <div className="mb-8 p-6 rounded-2xl bg-green-500/10 border border-green-500/30 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-green-400 uppercase tracking-wider">
                  {successData.simulated ? 'Simulation Success' : 'Contract Deployed'}
                </h3>
                <p className="text-green-400/80 text-sm font-mono mt-1">
                  Dare ID: {successData.dareId}
                </p>
              </div>
              {successData.simulated && (
                <span className="ml-auto px-3 py-1 text-xs font-mono uppercase bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                  Testnet Mode
                </span>
              )}
            </div>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="backdrop-blur-xl bg-black/10 border border-white/10 rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(168,85,247,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50" />
            <div className="space-y-12">

              {/* 1. TARGET */}
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm font-bold text-purple-400 uppercase tracking-widest">
                  <Users className="w-4 h-4" /> Target Identity
                </label>
                <input
                  {...register('streamerTag')}
                  placeholder="@xQc, @KaiCenat..."
                  className="w-full h-16 backdrop-blur-md bg-black/10 border border-white/10 text-xl font-bold text-white placeholder:text-gray-600 rounded-xl pl-6 focus:border-purple-500 focus:outline-none transition-colors"
                />
                {errors.streamerTag && (
                  <p className="text-red-400 text-sm">{errors.streamerTag.message}</p>
                )}
              </div>

              {/* 2. MISSION */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="flex items-center gap-3 text-sm font-bold text-purple-400 uppercase tracking-widest">
                    <Zap className="w-4 h-4" /> Mission Objective
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">STUCK? USE AI ASSIST</span>
                </div>
                <DareGenerator onSelect={(text) => setValue('title', text)} />
                <textarea
                  {...register('title')}
                  placeholder="Describe the dare in detail..."
                  className="w-full min-h-[150px] backdrop-blur-md bg-black/10 border border-white/10 text-lg text-white placeholder:text-gray-600 rounded-xl p-6 focus:border-purple-500 focus:outline-none transition-colors resize-none font-mono"
                />
                {errors.title && (
                  <p className="text-red-400 text-sm">{errors.title.message}</p>
                )}
              </div>

              {/* 3. BOUNTY & TIME */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 text-sm font-bold text-[#FFD700] uppercase tracking-widest">
                    <Wallet className="w-4 h-4" /> Total Bounty
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      {...register('amount', { valueAsNumber: true })}
                      placeholder="100"
                      className="w-full h-16 backdrop-blur-md bg-black/10 border border-white/10 text-2xl font-black text-[#FFD700] placeholder:text-gray-700 rounded-xl pl-6 pr-24 focus:border-[#FFD700] focus:outline-none"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                      USDC
                    </span>
                  </div>
                  {errors.amount && (
                    <p className="text-red-400 text-sm">{errors.amount.message}</p>
                  )}
                  <p className="text-xs text-gray-500 font-mono">Min: $5 • Max: $10,000</p>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 text-sm font-bold text-blue-400 uppercase tracking-widest">
                    <Clock className="w-4 h-4" /> Time Limit
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      {...register('timeValue', { valueAsNumber: true })}
                      placeholder="24"
                      className="w-full h-16 backdrop-blur-md bg-black/10 border border-white/10 text-xl font-bold text-white text-center rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                    <select
                      {...register('timeUnit')}
                      className="h-16 backdrop-blur-md bg-black/10 border border-white/10 text-white rounded-xl px-4 focus:border-blue-500 focus:outline-none font-bold uppercase cursor-pointer"
                    >
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                      <option value="Weeks">Weeks</option>
                    </select>
                  </div>
                  {errors.timeValue && (
                    <p className="text-red-400 text-sm">{errors.timeValue.message}</p>
                  )}
                </div>
              </div>

              {/* DEPLOY BUTTON */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-20 text-2xl font-black uppercase tracking-widest bg-[#FFD700] text-black hover:bg-[#FFD700] hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] transition-all rounded-xl relative overflow-hidden group flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <div className="absolute inset-0 bg-white/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12 pointer-events-none" />
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-8 h-8 relative animate-spin" />
                      <span className="relative">Deploying...</span>
                    </>
                  ) : (
                    <>
                      <span className="relative">Deploy Contract</span>
                      <ChevronRight className="w-8 h-8 relative" />
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-gray-500 font-mono mt-4 uppercase">
                  * Gas fees apply. Smart contract is immutable once deployed.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
