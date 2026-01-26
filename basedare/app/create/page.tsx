'use client';
import React, { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { Zap, Wallet, Clock, Users, ChevronRight, Loader2, CheckCircle, Copy, Share2, AlertTriangle, MessageCircle } from "lucide-react";
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { FundButton } from '@coinbase/onchainkit/fund';
import DareGenerator from "@/components/DareGenerator";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";
import { useToast } from '@/components/ui/use-toast';
import { useFeedback } from '@/hooks/useFeedback';
import { USDC_ABI } from '@/abis/BaseDareBounty';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

// Liquid Metal Contact Button Component
function ContactButton() {
  const { trigger } = useFeedback();

  return (
    <a
      href="https://x.com/lizardlarry7"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trigger('click')}
      className="relative group p-[1px] rounded-xl overflow-hidden inline-flex"
    >
      {/* Liquid metal border - spins on hover */}
      <div
        className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#525252_20%,#a1a1aa_25%,#525252_30%,#1a1a1a_50%,#525252_70%,#a1a1aa_75%,#525252_80%,#1a1a1a_100%)] opacity-60 group-hover:opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-opacity duration-500"
        aria-hidden="true"
      />

      {/* Button content */}
      <div className="relative flex items-center gap-2 bg-[#0a0a0a] backdrop-blur-xl px-4 py-2.5 rounded-[11px]">
        {/* Inner glass highlight */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.08] via-transparent to-white/[0.03] pointer-events-none rounded-[11px]" />

        <MessageCircle className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors relative z-10" />
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors relative z-10">
          Contact
        </span>
      </div>
    </a>
  );
}

// Validation schema matching the API
const CreateBountySchema = z.object({
  streamerTag: z
    .string()
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^(@[a-zA-Z0-9_]+)?$/, 'Tag must start with @ (e.g., @KaiCenat)')
    .optional()
    .or(z.literal('')), // Allow empty string for open bounties
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

interface SuccessData {
  dareId: string;
  simulated?: boolean;
  awaitingClaim?: boolean;
  inviteLink?: string | null;
  claimDeadline?: string | null;
  streamerTag?: string | null;
  shortId?: string;
  isOpenBounty?: boolean;
}

export default function CreateDare() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { trigger } = useFeedback();

  // Wallet & Balance Check
  const { address, isConnected } = useAccount();
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

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

  // Pre-fill form from URL params (coming from home page)
  useEffect(() => {
    const streamer = searchParams.get('streamer');
    const title = searchParams.get('title');
    if (streamer) setValue('streamerTag', streamer);
    if (title) setValue('title', title);
  }, [searchParams, setValue]);

  const watchAmount = watch('amount');

  // Balance check for FundButton
  const requiredAmount = watchAmount ? parseUnits(String(watchAmount), 6) : BigInt(0);
  const hasInsufficientBalance = isConnected && usdcBalance !== undefined && usdcBalance < requiredAmount;
  const formattedBalance = usdcBalance ? formatUnits(usdcBalance, 6) : '0';

  // Debug: log validation errors
  const onError = (errors: any) => {
    console.log('[CREATE] Validation errors:', errors);
  };

  const onSubmit = async (data: FormData) => {
    trigger('fund');
    console.log('[CREATE] Form submitted with data:', data);
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
        trigger('success');
        setSuccessData({
          dareId: result.data.dareId,
          simulated: result.simulated,
          awaitingClaim: result.data.awaitingClaim,
          inviteLink: result.data.inviteLink,
          claimDeadline: result.data.claimDeadline,
          streamerTag: result.data.streamerTag,
          shortId: result.data.shortId,
          isOpenBounty: result.data.isOpenBounty,
        });

        toast({
          title: result.data.isOpenBounty
            ? '🎯 OPEN DARE DEPLOYED'
            : result.data.awaitingClaim
            ? '⏳ BOUNTY ESCROWED'
            : result.simulated
            ? '🧪 SIMULATION SUCCESS'
            : '✅ CONTRACT DEPLOYED',
          description: result.data.isOpenBounty
            ? 'Anyone can complete this dare!'
            : result.data.awaitingClaim
            ? 'Share the invite link with the creator!'
            : `Dare ID: ${result.data.dareId}`,
          duration: 6000,
        });

        // Reset form after successful submission
        reset();
      } else {
        trigger('error');
        toast({
          variant: 'destructive',
          title: 'Deploy Failed',
          description: result.error || 'Unknown error',
        });
      }
    } catch (error: unknown) {
      trigger('error');
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
    <div className="relative min-h-screen flex flex-col pt-20 pb-12 px-4 md:px-8 md:py-24">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>

      <div className="container mx-auto px-2 md:px-6 relative z-10 max-w-4xl flex-grow">

        {/* HEADER */}
        <div className="text-center mb-8 md:mb-12">
          {/* Contact button - top right on mobile, integrated on desktop */}
          <div className="flex justify-end mb-4 md:absolute md:right-6 md:top-0">
            <ContactButton />
          </div>

          <h1 className="text-4xl md:text-7xl font-display font-black uppercase italic tracking-tighter mb-3 md:mb-4">
            INIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FACC15] to-[#FACC15]/70">PROTOCOL</span>
          </h1>
          <p className="text-gray-400 font-mono tracking-widest uppercase text-[10px] md:text-sm px-4">
            Deploy a new smart contract dare on Base L2
          </p>
        </div>

        {/* SUCCESS STATE - Liquid Glass */}
        {successData && (
          <div className={`mb-6 md:mb-8 p-4 md:p-6 rounded-xl md:rounded-2xl backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
            successData.awaitingClaim
              ? 'bg-yellow-500/10 border border-yellow-500/20'
              : 'bg-green-500/10 border border-green-500/20'
          }`}>
            <div className="flex items-start md:items-center gap-3 md:gap-4">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                successData.awaitingClaim ? 'bg-yellow-500/20' : 'bg-green-500/20'
              }`}>
                {successData.awaitingClaim ? (
                  <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base md:text-xl font-black uppercase tracking-wider ${
                  successData.awaitingClaim ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {successData.awaitingClaim
                    ? 'Awaiting Claim'
                    : successData.simulated
                    ? 'Simulation Success'
                    : 'Contract Deployed'}
                </h3>
                <p className={`text-xs md:text-sm font-mono mt-1 truncate ${
                  successData.awaitingClaim ? 'text-yellow-400/80' : 'text-green-400/80'
                }`}>
                  {successData.awaitingClaim
                    ? `Escrowed for ${successData.streamerTag}`
                    : successData.streamerTag
                      ? `Dare ID: ${successData.dareId}`
                      : 'Open dare - anyone can complete!'}
                </p>
              </div>
              {successData.simulated && !successData.awaitingClaim && (
                <span className="hidden md:inline-flex ml-auto px-3 py-1 text-xs font-mono uppercase bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                  Testnet
                </span>
              )}
            </div>

            {/* Awaiting Claim - Show Invite Link */}
            {successData.awaitingClaim && successData.inviteLink && (
              <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
                <div className="p-3 md:p-4 bg-black/30 rounded-xl border border-white/10">
                  <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Share with {successData.streamerTag}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2 md:px-3 py-2 bg-black/40 rounded-lg text-xs md:text-sm text-yellow-400 font-mono truncate">
                      {typeof window !== 'undefined' ? `${window.location.origin}${successData.inviteLink}` : successData.inviteLink}
                    </code>
                    <button
                      onClick={() => {
                        trigger('click');
                        const fullUrl = `${window.location.origin}${successData.inviteLink}`;
                        navigator.clipboard.writeText(fullUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition-colors flex-shrink-0"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Share on X Button - Liquid Metal Style */}
                <div className="relative group p-[1px] rounded-xl overflow-hidden">
                  <div
                    className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#525252_20%,#a1a1aa_25%,#525252_30%,#1a1a1a_50%,#525252_70%,#a1a1aa_75%,#525252_80%,#1a1a1a_100%)] opacity-60 group-hover:opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-opacity duration-500"
                    aria-hidden="true"
                  />
                  <button
                    onClick={() => {
                      trigger('click');
                      const fullUrl = `${window.location.origin}${successData.inviteLink}`;
                      const text = `Hey ${successData.streamerTag}! Someone just put up a bounty for you on BaseDare. Claim it before it expires!\n\n${fullUrl}`;
                      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                      window.open(twitterUrl, '_blank', 'width=550,height=420');
                    }}
                    className="relative w-full py-3 bg-[#0a0a0a] text-white font-bold text-xs md:text-sm uppercase tracking-wider rounded-[11px] transition-all flex items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.08] via-transparent to-white/[0.03] pointer-events-none rounded-[11px]" />
                    <Share2 className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Share on X</span>
                  </button>
                </div>

                {/* Refund Deadline */}
                {successData.claimDeadline && (
                  <p className="text-[10px] md:text-xs text-gray-500 text-center font-mono">
                    Auto-refund if unclaimed by{' '}
                    {new Date(successData.claimDeadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Normal Success - Show Share Link */}
            {!successData.awaitingClaim && successData.shortId && (
              <div className="mt-4 flex items-center gap-2">
                <a
                  href={`/dare/${successData.shortId}`}
                  className="text-sm text-purple-400 hover:text-purple-300 font-mono transition-colors"
                >
                  View dare →
                </a>
              </div>
            )}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          {/* Error Summary - Liquid Glass Style */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-4 md:mb-6 p-3 md:p-4 rounded-xl backdrop-blur-xl bg-red-500/10 border border-red-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-red-400 font-bold text-xs md:text-sm mb-2">Please fix the following:</p>
              <ul className="list-disc list-inside text-red-400/80 text-xs md:text-sm space-y-1">
                {errors.streamerTag && <li>{errors.streamerTag.message}</li>}
                {errors.title && <li>{errors.title.message}</li>}
                {errors.amount && <li>{errors.amount.message}</li>}
                {errors.timeValue && <li>{errors.timeValue.message}</li>}
              </ul>
            </div>
          )}

          {/* Apple Liquid Glass Card */}
          <div className="backdrop-blur-2xl bg-white/[0.02] border border-white/[0.06] rounded-2xl md:rounded-3xl p-5 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden">
            {/* Liquid glass gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/30 pointer-events-none rounded-2xl md:rounded-3xl" />
            {/* Top highlight line */}
            <div className="absolute top-0 left-4 right-4 md:left-0 md:right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            {/* Golden accent line */}
            <div className="absolute top-[1px] left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#FACC15]/40 to-transparent" />
            <div className="space-y-8 md:space-y-12">

              {/* 1. TARGET (Optional) */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-purple-400 uppercase tracking-widest">
                  <Users className="w-3.5 h-3.5 md:w-4 md:h-4" /> Target <span className="text-gray-500 text-[9px] md:text-[10px] font-normal lowercase">(optional)</span>
                </label>
                <input
                  {...register('streamerTag')}
                  placeholder="@username or leave empty for open dare"
                  className="w-full h-14 md:h-16 backdrop-blur-2xl bg-white/[0.03] border border-white/[0.06] text-lg md:text-xl font-bold text-white placeholder:text-white/20 rounded-xl pl-5 md:pl-6 focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                />
                {errors.streamerTag && (
                  <p className="text-red-400 text-xs md:text-sm">{errors.streamerTag.message}</p>
                )}
              </div>

              {/* 2. MISSION */}
              <div className="space-y-3">
                <div className="flex justify-between items-end gap-2">
                  <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-purple-400 uppercase tracking-widest">
                    <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" /> Mission Objective
                  </label>
                  <span className="text-[9px] md:text-[10px] text-gray-500 font-mono whitespace-nowrap">AI ASSIST ↓</span>
                </div>
                <DareGenerator onSelect={(text) => setValue('title', text)} />
                <textarea
                  {...register('title')}
                  placeholder="Describe the dare in detail..."
                  className="w-full min-h-[120px] md:min-h-[150px] backdrop-blur-2xl bg-white/[0.03] border border-white/[0.06] text-base md:text-lg text-white placeholder:text-white/20 rounded-xl p-4 md:p-6 focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none transition-all resize-none font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                />
                {errors.title && (
                  <p className="text-red-400 text-xs md:text-sm">{errors.title.message}</p>
                )}
              </div>

              {/* 3. BOUNTY & TIME */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-[#FACC15] uppercase tracking-widest">
                    <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4" /> Total Bounty
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      {...register('amount', { valueAsNumber: true })}
                      placeholder="100"
                      className="w-full h-14 md:h-16 backdrop-blur-2xl bg-white/[0.03] border border-white/[0.06] text-xl md:text-2xl font-black text-[#FACC15] placeholder:text-white/20 rounded-xl pl-5 md:pl-6 pr-20 md:pr-24 focus:border-[#FACC15]/50 focus:bg-white/[0.05] focus:outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    />
                    <span className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 text-xs md:text-sm font-bold text-gray-400">
                      USDC
                    </span>
                  </div>
                  {errors.amount && (
                    <p className="text-red-400 text-xs md:text-sm">{errors.amount.message}</p>
                  )}
                  <p className="text-[10px] md:text-xs text-gray-500 font-mono">Min: $5 • Max: $10,000</p>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-purple-400 uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" /> Time Limit
                  </label>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <input
                      type="number"
                      {...register('timeValue', { valueAsNumber: true })}
                      placeholder="24"
                      className="w-full h-14 md:h-16 backdrop-blur-2xl bg-white/[0.03] border border-white/[0.06] text-lg md:text-xl font-bold text-white text-center rounded-xl focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    />
                    <select
                      {...register('timeUnit')}
                      className="h-14 md:h-16 backdrop-blur-2xl bg-white/[0.03] border border-white/[0.06] text-white rounded-xl px-3 md:px-4 focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none font-bold uppercase cursor-pointer transition-all text-sm md:text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    >
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                      <option value="Weeks">Weeks</option>
                    </select>
                  </div>
                  {errors.timeValue && (
                    <p className="text-red-400 text-xs md:text-sm">{errors.timeValue.message}</p>
                  )}
                </div>
              </div>

              {/* BALANCE & FUND BUTTON */}
              {isConnected && (
                <div className="pt-4 md:pt-6 space-y-3">
                  {/* Balance Display */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-gray-400 font-mono">Your Balance:</span>
                    <span className={`text-sm font-bold font-mono ${hasInsufficientBalance ? 'text-red-400' : 'text-green-400'}`}>
                      {parseFloat(formattedBalance).toFixed(2)} USDC
                    </span>
                  </div>

                  {/* FundButton when insufficient balance */}
                  {hasInsufficientBalance && (
                    <div className="relative group p-[1px] rounded-xl overflow-hidden">
                      <div
                        className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#525252_20%,#a1a1aa_25%,#525252_30%,#1a1a1a_50%,#525252_70%,#a1a1aa_75%,#525252_80%,#1a1a1a_100%)] opacity-60 group-hover:opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-opacity duration-500"
                        aria-hidden="true"
                      />
                      <div className="relative bg-[#0a0a0a] rounded-[11px] p-4 flex flex-col items-center gap-3">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] via-transparent to-white/[0.02] pointer-events-none rounded-[11px]" />
                        <p className="text-xs text-gray-400 font-mono text-center relative z-10">
                          You need {watchAmount} USDC to deploy this bounty
                        </p>
                        <FundButton className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-all relative z-10">
                          Get USDC
                        </FundButton>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DEPLOY BUTTON - Liquid Metal Style */}
              <div className={isConnected ? "pt-3" : "pt-4 md:pt-6"}>
                {hasInsufficientBalance ? (
                  /* Disabled state - no spinning border */
                  <button
                    type="button"
                    disabled
                    className="w-full h-16 md:h-20 text-lg md:text-2xl font-black uppercase tracking-widest bg-[#FACC15]/50 text-black/50 rounded-xl flex items-center justify-center cursor-not-allowed"
                  >
                    Insufficient Balance
                  </button>
                ) : (
                  /* Active state - with liquid metal border */
                  <div className="relative group p-[1.5px] rounded-xl overflow-hidden">
                    <div
                      className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#78350f_0%,#facc15_25%,#78350f_50%,#facc15_75%,#78350f_100%)] opacity-80 group-hover:animate-[spin_2s_linear_infinite] transition-opacity duration-500"
                      aria-hidden="true"
                    />

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="relative w-full h-16 md:h-20 text-lg md:text-2xl font-black uppercase tracking-widest bg-[#FACC15] text-black hover:bg-[#FDE047] transition-all rounded-[10px] flex items-center justify-center gap-2 md:gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {/* Inner glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/20 pointer-events-none rounded-[10px]" />

                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-6 h-6 md:w-8 md:h-8 relative animate-spin" />
                          <span className="relative">Deploying...</span>
                        </>
                      ) : (
                        <>
                          <span className="relative">Deploy Contract</span>
                          <ChevronRight className="w-6 h-6 md:w-8 md:h-8 relative" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                <p className="text-center text-[9px] md:text-[10px] text-gray-500 font-mono mt-3 md:mt-4 uppercase px-4">
                  {hasInsufficientBalance
                    ? '* Fund your wallet with USDC to deploy'
                    : '* Gas fees apply. Smart contract is immutable once deployed.'
                  }
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
