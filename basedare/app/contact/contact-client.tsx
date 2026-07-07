'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bug,
  HelpCircle,
  MessageCircle,
  Send,
  Store,
} from 'lucide-react';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import CosmicButton from '@/components/ui/CosmicButton';
import { SIGNAL_ROOM_URL } from '@/lib/signal-room';

const raisedPanelClass =
  'relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';

const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';

const insetDentClass =
  'bd-dent-surface bd-dent-surface--soft rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)]';

const sectionLabelClass =
  'inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]';

const CHANNELS = [
  {
    title: 'DM on X',
    body: 'Fastest lane for bugs, ideas, collabs, and press. If it is a good idea, we build it. If it is a bug, we fix it.',
    icon: MessageCircle,
    tone: 'text-cyan-100 border-cyan-400/18 bg-cyan-500/[0.08]',
    cta: '@basedare_xyz',
    href: 'https://x.com/basedare_xyz',
    external: true,
    variant: 'blue' as const,
  },
  {
    title: 'Telegram Signal Room',
    body: 'Announcements, drops, and what is happening on the grid tonight. Join the room, lurk freely.',
    icon: Send,
    tone: 'text-fuchsia-100 border-fuchsia-400/18 bg-fuchsia-500/[0.08]',
    cta: 'Join the room',
    href: SIGNAL_ROOM_URL,
    external: true,
    variant: 'purple' as const,
  },
] as const;

export default function ContactClient() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute -right-32 top-40 h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]" />
      </div>

      <div className="relative z-20 mt-12 px-4 pb-32 pt-16 md:pt-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${raisedPanelClass} mb-8 px-6 py-10 text-center md:px-10 md:py-12`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />

            <div className="relative mx-auto mb-5 inline-flex">
              <div className={sectionLabelClass}>
                <MessageCircle className="h-4 w-4 text-fuchsia-300" />
                CONTACT
              </div>
            </div>

            <h1 className="relative mb-4 text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
              Talk To A <span className="text-yellow-400">Human</span>
            </h1>
            <p className="relative mx-auto max-w-xl font-mono text-sm text-gray-400 md:text-base">
              Verified one, obviously. Pick a channel — we actually read these.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6 grid gap-5 md:grid-cols-2"
          >
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;

              return (
                <div key={channel.title} className={`${softCardClass} flex flex-col p-6`}>
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                  <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] shadow-[0_12px_20px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] ${channel.tone}`}>
                    <Icon className="h-4 w-4" />
                    Channel
                  </div>
                  <h2 className="mt-5 text-2xl font-black italic text-white">{channel.title}</h2>
                  <p className="mt-3 flex-1 font-mono text-xs leading-relaxed text-gray-400 md:text-sm">
                    {channel.body}
                  </p>
                  <div className={`${insetDentClass} mt-5 px-4 py-4 text-center`}>
                    <CosmicButton
                      href={channel.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant={channel.variant}
                      size="lg"
                      className="w-full min-w-0"
                    >
                      <Icon className="h-5 w-5" />
                      {channel.cta}
                    </CosmicButton>
                  </div>
                </div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`${softCardClass} mb-6 p-6 md:p-8`}
          >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/28 to-transparent" />
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/35">
                  <Store className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase italic text-white md:text-2xl">
                    Venues &amp; Brands
                  </h2>
                  <p className="mt-2 max-w-md font-mono text-xs leading-relaxed text-gray-400 md:text-sm">
                    Claim your venue page or plan a proof-backed night. Short form, human follow-up — no spam funnel.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact?topic=venue-claim"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f5c518]/24 bg-[linear-gradient(180deg,rgba(245,197,24,0.14)_0%,rgba(74,52,6,0.14)_100%)] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#fff1ba] shadow-[0_14px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-[#f5c518]/38"
                >
                  Claim your venue
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact?topic=venue-partnership"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white/78 shadow-[0_14px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/24 hover:text-white"
                >
                  Partner with us
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-white/22 hover:text-white"
            >
              <HelpCircle className="h-4 w-4" />
              Read the FAQ first
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-white/22 hover:text-white"
            >
              <Bug className="h-4 w-4" />
              How it works
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
