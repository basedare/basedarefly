'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Hand,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Navigation,
  RefreshCw,
  Sparkles,
  Target,
  TimerReset,
} from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';
import { trackActivationFunnelEvent } from '@/lib/activation-funnel-client';
import type {
  VenueScoutCommandReport,
  VenueScoutLead,
  VenueScoutLeadPriority,
  VenueScoutSeedCandidate,
} from '@/lib/venue-scout-command-types';

type VenueLeadFollowUpStatus = 'NEW' | 'FOLLOWING_UP' | 'WAITING' | 'CONVERTED' | 'ARCHIVED';

type VenueLeadUpdatePatch = {
  action: 'assign' | 'schedule' | 'convert' | 'archive';
  followUpStatus?: VenueLeadFollowUpStatus;
  nextActionAt?: string | null;
};

type SeedLeadDraft = {
  email: string;
  name: string;
  organization: string;
  audience: 'venue' | 'sponsor';
  intent: 'claim' | 'activation' | 'repeat';
};

type ActivationHandoffItem = VenueScoutLead | VenueScoutSeedCandidate;

const DEFAULT_SEED_LEAD_DRAFT: SeedLeadDraft = {
  email: '',
  name: '',
  organization: '',
  audience: 'venue',
  intent: 'activation',
};

function priorityClasses(priority: VenueScoutLeadPriority) {
  if (priority.label === 'Immediate') return 'border-red-400/35 bg-red-500/10 text-red-100';
  if (priority.label === 'High') return 'border-yellow-300/35 bg-yellow-500/10 text-yellow-100';
  if (priority.label === 'Active') return 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100';
  return 'border-white/10 bg-white/[0.04] text-white/70';
}

function summaryTone(value: number, danger = false) {
  if (value === 0) return 'border-white/10 bg-white/[0.04] text-white/70';
  if (danger) return 'border-red-400/30 bg-red-500/10 text-red-100';
  return 'border-yellow-300/30 bg-yellow-500/10 text-yellow-100';
}

function formatDateTime(value: string | null) {
  if (!value) return 'not set';
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function maskWallet(wallet: string | null) {
  if (!wallet) return 'Unassigned';
  if (wallet === 'admin') return 'Admin';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function activationMailtoHref(lead: VenueScoutLead) {
  const subject = encodeURIComponent(lead.activationHandoff.outreachSubject);
  const body = encodeURIComponent(lead.activationHandoff.outreachBody);
  return `mailto:${lead.contact.email}?subject=${subject}&body=${body}`;
}

function handoffItemKey(item: ActivationHandoffItem) {
  return `${'venue' in item ? 'lead' : 'seed'}:${item.id}`;
}

function handoffVenue(item: ActivationHandoffItem) {
  if ('venue' in item) return item.venue;
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    city: item.city,
    country: item.country,
  };
}

function SummaryCard({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: number | string;
  tone: string;
  detail: string;
}) {
  return (
    <div className={`rounded-[1.75rem] border p-5 ${tone}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-60">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
      <p className="mt-3 text-xs font-bold leading-relaxed opacity-70">{detail}</p>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
      {label} {value}
    </span>
  );
}

function LeadCard({
  lead,
  copied,
  onCopy,
  handoffCopied,
  onCopyHandoff,
  onOpenActivationHandoff,
  canAssignOwner,
  isUpdating,
  onUpdateLead,
}: {
  lead: VenueScoutLead;
  copied: boolean;
  onCopy: (lead: VenueScoutLead) => void;
  handoffCopied: boolean;
  onCopyHandoff: (lead: VenueScoutLead) => void;
  onOpenActivationHandoff: (lead: VenueScoutLead, target: string) => void;
  canAssignOwner: boolean;
  isUpdating: boolean;
  onUpdateLead: (lead: VenueScoutLead, patch: VenueLeadUpdatePatch) => void;
}) {
  const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const inThreeDays = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const inSevenDays = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return (
    <article className="rounded-[2rem] border border-white/10 bg-[#080814]/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_70px_rgba(0,0,0,0.38)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${priorityClasses(lead.priority)}`}>
              {lead.priority.label} / {lead.priority.score}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
              {lead.routeCluster}
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-black uppercase italic tracking-[-0.03em] text-white">
            {lead.venue.name}
          </h3>
          <p className="mt-2 text-sm font-bold leading-relaxed text-white/55">
            {lead.opportunity}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onUpdateLead(lead, { action: 'assign' })}
            disabled={!canAssignOwner || isUpdating}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hand className="h-3.5 w-3.5" />}
            {canAssignOwner ? 'Assign' : 'Wallet needed'}
          </button>
          <Link
            href={lead.links.report}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/15"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Report
          </Link>
          <a
            href={activationMailtoHref(lead)}
            className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-300/15"
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </a>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <MetricPill label="check-ins" value={lead.metrics.checkIns + lead.metrics.memoryCheckIns} />
        <MetricPill label="dares" value={lead.metrics.dares + lead.metrics.memoryCompletedDares} />
        <MetricPill label="tags" value={lead.metrics.placeTags} />
        <MetricPill label="campaigns" value={lead.metrics.campaigns} />
        <MetricPill label="owner" value={maskWallet(lead.ownerWallet)} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Next action</p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-white/72">{lead.nextAction}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {lead.priority.reasons.slice(0, 6).map((reason) => (
              <span
                key={reason}
                className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45"
              >
                {reason}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-yellow-200/15 bg-yellow-400/[0.06] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-100/55">Starter dare</p>
            <p className="mt-2 text-sm font-black text-yellow-50">{lead.suggestedDare.title}</p>
            <p className="mt-1 text-xs font-bold leading-relaxed text-yellow-100/68">
              {lead.suggestedDare.bountyRange} / {lead.suggestedDare.proofHook}
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Pitch copy</p>
            <button
              type="button"
              onClick={() => onCopy(lead)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/62 transition hover:bg-white/[0.1] hover:text-white"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-sm font-black text-white">{lead.pitch.subject}</p>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/8 bg-white/[0.035] p-3 font-sans text-xs font-bold leading-relaxed text-white/62">
            {lead.pitch.emailBody}
          </pre>
          <div className="mt-3 rounded-2xl border border-yellow-200/14 bg-yellow-300/[0.055] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-100/55">Spark audit handoff</p>
                <p className="mt-2 text-xs font-bold leading-relaxed text-yellow-50/72">
                  {lead.activationHandoff.nextAction}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={lead.activationHandoff.href}
                  target="_blank"
                  onClick={() => onOpenActivationHandoff(lead, 'open-audit')}
                  className="inline-flex items-center gap-2 rounded-full border border-yellow-200/25 bg-yellow-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Open audit
                </Link>
                <button
                  type="button"
                  onClick={() => onCopyHandoff(lead)}
                  className="inline-flex items-center gap-2 rounded-full border border-yellow-100/20 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:bg-black/30"
                >
                  {handoffCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" /> : <Copy className="h-3.5 w-3.5" />}
                  {handoffCopied ? 'Copied' : 'Copy audit'}
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {lead.activationHandoff.approvalChecklist.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-yellow-100/12 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-50/50"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="text-xs font-bold text-white/42">
          Pipeline: {lead.pipeline.stageLabel} / latest {lead.pipeline.latestEventLabel}
          {lead.pipeline.latestEventAt ? ` / ${formatDateTime(lead.pipeline.latestEventAt)}` : ''}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={lead.links.venue}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition hover:bg-white/[0.08] hover:text-white"
          >
            <MapPin className="h-3.5 w-3.5" />
            Venue
          </Link>
          <Link
            href={lead.links.map}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition hover:bg-white/[0.08] hover:text-white"
          >
            <Navigation className="h-3.5 w-3.5" />
            Map
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Internal workflow</p>
            <p className="mt-1 text-xs font-bold text-white/45">
              Status {lead.followUpStatus.toLowerCase().replace(/_/g, ' ')} / next {formatDateTime(lead.nextActionAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateLead(lead, {
                  action: 'schedule',
                  followUpStatus: lead.followUpStatus === 'NEW' ? 'FOLLOWING_UP' : undefined,
                  nextActionAt: tomorrow(),
                })
              }
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:bg-yellow-300/15 disabled:opacity-45"
            >
              <TimerReset className="h-3.5 w-3.5" />
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateLead(lead, {
                  action: 'schedule',
                  followUpStatus: 'WAITING',
                  nextActionAt: inThreeDays(),
                })
              }
              disabled={isUpdating}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/58 transition hover:bg-white/[0.09] hover:text-white disabled:opacity-45"
            >
              Wait 3d
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateLead(lead, {
                  action: 'schedule',
                  followUpStatus: 'WAITING',
                  nextActionAt: inSevenDays(),
                })
              }
              disabled={isUpdating}
              className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/45 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-45"
            >
              Snooze 7d
            </button>
            <button
              type="button"
              onClick={() => onUpdateLead(lead, { action: 'convert', followUpStatus: 'CONVERTED' })}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-45"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Won
            </button>
            <button
              type="button"
              onClick={() => onUpdateLead(lead, { action: 'archive', followUpStatus: 'ARCHIVED' })}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/45 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-45"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SeedCandidateCard({
  candidate,
  draft,
  handoffCopied,
  canAssignOwner,
  isCreating,
  onDraftChange,
  onCopyHandoff,
  onOpenActivationHandoff,
  onCreateLead,
}: {
  candidate: VenueScoutSeedCandidate;
  draft: SeedLeadDraft;
  handoffCopied: boolean;
  canAssignOwner: boolean;
  isCreating: boolean;
  onDraftChange: (candidateId: string, patch: Partial<SeedLeadDraft>) => void;
  onCopyHandoff: (candidate: VenueScoutSeedCandidate) => void;
  onOpenActivationHandoff: (candidate: VenueScoutSeedCandidate, target: string) => void;
  onCreateLead: (candidate: VenueScoutSeedCandidate) => void;
}) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
            {candidate.routeCluster}
          </p>
          <h3 className="mt-2 text-lg font-black text-white">{candidate.name}</h3>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
          {candidate.score}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold leading-relaxed text-white/58">{candidate.suggestedAngle}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {candidate.reasons.slice(0, 4).map((reason) => (
          <span
            key={reason}
            className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45"
          >
            {reason}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={candidate.links.report}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/15"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Report
        </Link>
        <Link
          href={candidate.links.map}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition hover:bg-white/[0.08] hover:text-white"
        >
          <MapPin className="h-3.5 w-3.5" />
          Map
        </Link>
      </div>
      <div className="mt-4 rounded-[1.25rem] border border-yellow-200/14 bg-yellow-300/[0.055] p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-100/55">
          Spark audit packet
        </p>
        <p className="mt-2 text-xs font-bold leading-relaxed text-yellow-50/68">
          {candidate.activationHandoff.nextAction}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={candidate.activationHandoff.href}
            target="_blank"
            onClick={() => onOpenActivationHandoff(candidate, 'open-seed-audit')}
            className="inline-flex items-center gap-2 rounded-full border border-yellow-200/25 bg-yellow-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Open audit
          </Link>
          <button
            type="button"
            onClick={() => onCopyHandoff(candidate)}
            className="inline-flex items-center gap-2 rounded-full border border-yellow-100/20 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:bg-black/30"
          >
            {handoffCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" /> : <Copy className="h-3.5 w-3.5" />}
            {handoffCopied ? 'Copied' : 'Copy pitch'}
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/25 p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
          Create pipeline lead
        </p>
        <div className="mt-3 grid gap-2">
          <input
            type="email"
            value={draft.email}
            onChange={(event) => onDraftChange(candidate.id, { email: event.target.value })}
            placeholder="venue owner email"
            className="min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-bold text-white outline-none transition placeholder:text-white/28 focus:border-yellow-300/45"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={draft.name}
              onChange={(event) => onDraftChange(candidate.id, { name: event.target.value })}
              placeholder="contact name"
              className="min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-bold text-white outline-none transition placeholder:text-white/28 focus:border-yellow-300/45"
            />
            <input
              type="text"
              value={draft.organization}
              onChange={(event) => onDraftChange(candidate.id, { organization: event.target.value })}
              placeholder="organization"
              className="min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-bold text-white outline-none transition placeholder:text-white/28 focus:border-yellow-300/45"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={draft.audience}
              onChange={(event) => onDraftChange(candidate.id, { audience: event.target.value as SeedLeadDraft['audience'] })}
              className="min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white outline-none transition focus:border-yellow-300/45"
            >
              <option className="bg-[#080814]" value="venue">Venue</option>
              <option className="bg-[#080814]" value="sponsor">Sponsor</option>
            </select>
            <select
              value={draft.intent}
              onChange={(event) => onDraftChange(candidate.id, { intent: event.target.value as SeedLeadDraft['intent'] })}
              className="min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white outline-none transition focus:border-yellow-300/45"
            >
              <option className="bg-[#080814]" value="activation">Activation</option>
              <option className="bg-[#080814]" value="claim">Claim</option>
              <option className="bg-[#080814]" value="repeat">Repeat</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => onCreateLead(candidate)}
            disabled={isCreating || draft.email.trim().length === 0}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-yellow-300/25 bg-yellow-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[0_5px_0_rgba(118,74,0,0.72)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            {canAssignOwner ? 'Create + assign' : 'Create lead'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function VenueScoutCommandPage() {
  const { address, isConnected } = useAccount();
  const [report, setReport] = useState<VenueScoutCommandReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
    hasSessionAdminSecret,
  } = useSessionAdminSecret();
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);
  const [copiedHandoffId, setCopiedHandoffId] = useState<string | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [creatingSeedId, setCreatingSeedId] = useState<string | null>(null);
  const [leadActionMessage, setLeadActionMessage] = useState<string | null>(null);
  const [seedLeadDrafts, setSeedLeadDrafts] = useState<Record<string, SeedLeadDraft>>({});

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || hasAdminSession || adminSecretTrimmed);
  const hasReadyAdminAuth = Boolean(address || hasAdminSession);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (address) {
      headers['x-moderator-wallet'] = address;
    }
    return headers;
  }, [address]);

  const loadReport = useCallback(async () => {
    if (!hasAdminAuth) return;

    setLoading(true);
    setError(null);

    try {
      if (!address && !(await ensureAdminSession())) {
        throw new Error('Invalid admin secret');
      }

      const response = await fetch('/api/admin/venue-scout-command', {
        headers: adminAuthHeaders,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.hint || payload.error || 'Unable to load venue scout command');
      }

      setReport(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load venue scout command');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [address, adminAuthHeaders, ensureAdminSession, hasAdminAuth]);

  useEffect(() => {
    if (!hasReadyAdminAuth) return;
    let cancelled = false;

    async function loadInitialReport() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/venue-scout-command', {
          headers: adminAuthHeaders,
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.hint || payload.error || 'Unable to load venue scout command');
        }

        if (!cancelled) {
          setReport(payload.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load venue scout command');
          setReport(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialReport();

    return () => {
      cancelled = true;
    };
  }, [adminAuthHeaders, hasReadyAdminAuth]);

  const copyPitch = useCallback(async (lead: VenueScoutLead) => {
    try {
      await navigator.clipboard.writeText(lead.pitch.emailBody);
      setCopiedLeadId(lead.id);
      window.setTimeout(() => setCopiedLeadId(null), 1600);
    } catch {
      setCopiedLeadId(null);
    }
  }, []);

  const trackActivationHandoff = useCallback((item: ActivationHandoffItem, target: string) => {
    const venue = handoffVenue(item);
    void trackActivationFunnelEvent({
      eventType: 'ACTIVATION_CTA_CLICK',
      target,
      channel: 'venue-scout-command',
      attribution: {
        source: item.activationHandoff.source,
        venueId: venue.id,
        venueSlug: venue.slug,
        venueName: venue.name,
        packageId: item.activationHandoff.packageId,
        budgetRange: item.activationHandoff.budgetRange,
        goal: item.activationHandoff.buyerGoal,
        buyerType: 'venue',
      },
      metadata: {
        routeCluster: item.routeCluster,
        score: 'priority' in item ? item.priority.score : item.score,
        href: item.activationHandoff.href,
      },
    });
  }, []);

  const copyActivationHandoff = useCallback(
    async (item: ActivationHandoffItem) => {
      const copyText = [
        item.activationHandoff.outreachSubject,
        '',
        item.activationHandoff.outreachBody,
        '',
        'Spark Audit Brief',
        item.activationHandoff.auditBrief,
      ].join('\n');

      try {
        await navigator.clipboard.writeText(copyText);
        setCopiedHandoffId(handoffItemKey(item));
        trackActivationHandoff(item, 'copy-spark-audit-handoff');
        window.setTimeout(() => setCopiedHandoffId(null), 1800);
      } catch {
        setCopiedHandoffId(null);
      }
    },
    [trackActivationHandoff]
  );

  const updateLead = useCallback(
    async (lead: VenueScoutLead, patch: VenueLeadUpdatePatch) => {
      if (patch.action === 'assign' && !address) {
        setLeadActionMessage('Connect a moderator wallet before assigning lead ownership.');
        return;
      }

      const body: {
        leadId: string;
        followUpStatus?: VenueLeadFollowUpStatus;
        ownerWallet?: string | null;
        nextActionAt?: string | null;
      } = {
        leadId: lead.id,
      };

      if (patch.action === 'assign') {
        body.ownerWallet = address ?? null;
        if (lead.followUpStatus === 'NEW') {
          body.followUpStatus = 'FOLLOWING_UP';
        }
      }
      if (patch.followUpStatus !== undefined) {
        body.followUpStatus = patch.followUpStatus;
      }
      if (patch.nextActionAt !== undefined) {
        body.nextActionAt = patch.nextActionAt;
      }

      setUpdatingLeadId(lead.id);
      setLeadActionMessage(null);
      setError(null);

      try {
        const response = await fetch('/api/admin/venue-report-leads', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...adminAuthHeaders,
          },
          body: JSON.stringify(body),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.hint || payload.error || 'Unable to update venue lead');
        }

        const actionLabel =
          patch.action === 'assign'
            ? 'assigned'
            : patch.action === 'convert'
              ? 'marked won'
              : patch.action === 'archive'
                ? 'archived'
                : 'scheduled';
        setLeadActionMessage(`${lead.venue.name} ${actionLabel}.`);
        await loadReport();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : 'Unable to update venue lead');
      } finally {
        setUpdatingLeadId(null);
      }
    },
    [address, adminAuthHeaders, loadReport]
  );

  const updateSeedLeadDraft = useCallback((candidateId: string, patch: Partial<SeedLeadDraft>) => {
    setSeedLeadDrafts((prev) => ({
      ...prev,
      [candidateId]: {
        ...(prev[candidateId] ?? DEFAULT_SEED_LEAD_DRAFT),
        ...patch,
      },
    }));
  }, []);

  const createLeadFromSeed = useCallback(
    async (candidate: VenueScoutSeedCandidate) => {
      const draft = seedLeadDrafts[candidate.id] ?? DEFAULT_SEED_LEAD_DRAFT;
      const email = draft.email.trim();
      if (!email) {
        setLeadActionMessage('Add an email before creating a venue lead.');
        return;
      }

      setCreatingSeedId(candidate.id);
      setLeadActionMessage(null);
      setError(null);

      try {
        const nextActionAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const response = await fetch('/api/admin/venue-report-leads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...adminAuthHeaders,
          },
          body: JSON.stringify({
            venueId: candidate.id,
            audience: draft.audience,
            intent: draft.intent,
            email,
            name: draft.name.trim() || null,
            organization: draft.organization.trim() || null,
            ownerWallet: address ?? null,
            nextActionAt,
            notes: [
              `Created from Venue Scout Command seed venue.`,
              `Suggested angle: ${candidate.suggestedAngle}`,
              `Seed reasons: ${candidate.reasons.join(', ')}`,
              `Activation handoff: ${candidate.activationHandoff.absoluteHref}`,
              `Spark Audit:\n${candidate.activationHandoff.auditBrief}`,
            ].join('\n'),
          }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || payload.hint || 'Unable to create venue lead');
        }

        setLeadActionMessage(`${candidate.name} added to the venue lead queue.`);
        setSeedLeadDrafts((prev) => {
          const next = { ...prev };
          delete next[candidate.id];
          return next;
        });
        await loadReport();
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : 'Unable to create venue lead');
      } finally {
        setCreatingSeedId(null);
      }
    },
    [address, adminAuthHeaders, loadReport, seedLeadDrafts]
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] px-4 py-10 text-white sm:px-6 lg:px-10">
      <LiquidBackground />
      <GradualBlurOverlay />

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              Back to admin
            </Link>
            <p className="text-xs font-black uppercase tracking-[0.36em] text-yellow-200/70">
              Venue GTM
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-[-0.04em] sm:text-6xl">
              Venue <span className="text-yellow-300">Scout</span> Command
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold text-white/55 sm:text-base">
              A mapped sales loop for BaseDare venues: rank the lead, pick the route, copy the pitch,
              and turn place memory into a concrete activation ask.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-3 text-yellow-100">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                  MapiLeads lesson
                </p>
                <p className="max-w-sm text-sm font-black text-white">
                  The map only matters when it tells the operator who to contact, why, and what to say next.
                </p>
              </div>
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-6 text-sm font-bold text-yellow-100">
            Connect and sign in with a moderator wallet, or paste the admin secret below to load the venue scout queue.
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
              Admin secret fallback
            </span>
            <input
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder="Optional: paste ADMIN_SECRET"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-yellow-300/45"
            />
            <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              Session-only, reused across admin ops links
              {hasSessionAdminSecret && (
                <button
                  type="button"
                  onClick={() => void clearAdminSecret()}
                  className="text-yellow-100/75 underline-offset-4 hover:text-yellow-100 hover:underline"
                >
                  Forget
                </button>
              )}
            </span>
          </label>
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={!hasAdminAuth || loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/35 bg-yellow-300 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_8px_0_rgba(118,74,0,0.8)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>

        {!hasAdminAuth && (
          <div className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-8 text-center">
            <Lock className="mx-auto h-10 w-10 text-yellow-200" />
            <h2 className="mt-4 text-xl font-black">Authenticate to load venue command</h2>
            <p className="mt-2 text-sm font-bold text-white/55">
              Venue leads include operator contact and pipeline data, so this stays behind admin auth.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-sm font-black uppercase tracking-[0.22em] text-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-300" />
            Building venue scout command
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-[2rem] border border-red-400/30 bg-red-500/10 p-6 text-sm font-bold text-red-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {leadActionMessage && !error && (
          <div className="flex items-start gap-3 rounded-[2rem] border border-emerald-300/25 bg-emerald-500/10 p-5 text-sm font-bold text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            {leadActionMessage}
          </div>
        )}

        {report && (
          <>
            <section className="rounded-[2.5rem] border border-yellow-300/25 bg-yellow-500/10 p-6 text-yellow-100 shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-current/25 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-75">
                    <Target className="h-3.5 w-3.5" />
                    Current command
                  </div>
                  <h2 className="mt-4 text-3xl font-black uppercase italic tracking-[-0.03em] sm:text-5xl">
                    {report.currentCommand.title}
                  </h2>
                  <p className="mt-3 max-w-4xl text-sm font-bold leading-relaxed opacity-80 sm:text-base">
                    {report.currentCommand.detail}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-current/20 bg-black/20 p-4 lg:max-w-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-60">Do next</p>
                  <p className="mt-2 text-sm font-black leading-relaxed">{report.currentCommand.nextAction}</p>
                </div>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard
                label="Hot leads"
                value={report.summary.immediateLeads}
                tone={summaryTone(report.summary.immediateLeads, true)}
                detail="Immediate follow-ups that should be worked before adding new cold supply."
              />
              <SummaryCard
                label="Unowned"
                value={report.summary.unownedLeads}
                tone={summaryTone(report.summary.unownedLeads, true)}
                detail="Leads without a clear operator owner."
              />
              <SummaryCard
                label="Routes"
                value={report.summary.activeRoutes}
                tone="border-cyan-300/25 bg-cyan-500/10 text-cyan-100"
                detail={report.summary.topRoute ? `Top route: ${report.summary.topRoute}` : 'No active route cluster yet.'}
              />
              <SummaryCard
                label="Seed venues"
                value={report.summary.seedCandidates}
                tone="border-emerald-300/25 bg-emerald-500/10 text-emerald-100"
                detail="Venues with signals but no current report lead."
              />
            </div>

            <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[2.5rem] border border-white/10 bg-[#070712]/86 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/60">Route clusters</p>
                    <h2 className="mt-2 text-xl font-black uppercase tracking-[0.16em]">Today&apos;s field plan</h2>
                  </div>
                  <Navigation className="h-5 w-5 text-cyan-100/60" />
                </div>
                {report.routeClusters.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm font-bold text-white/50">
                    No route clusters yet. Create or qualify venue report leads first.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {report.routeClusters.map((cluster) => (
                      <article key={cluster.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black text-white">{cluster.label}</h3>
                            <p className="mt-1 text-xs font-bold text-white/42">
                              {cluster.leadCount} leads / top score {cluster.topScore}
                            </p>
                          </div>
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                            {cluster.immediateCount} hot
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-bold leading-relaxed text-white/58">{cluster.nextMove}</p>
                        <div className="mt-3 space-y-1">
                          {cluster.suggestedRoute.map((stop, index) => (
                            <div key={`${cluster.id}-${stop}`} className="flex items-center gap-2 text-xs font-bold text-white/48">
                              <span className="grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-black/25 text-[10px] text-white/45">
                                {index + 1}
                              </span>
                              {stop}
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[2.5rem] border border-white/10 bg-[#070712]/86 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200/60">Lead queue</p>
                    <h2 className="mt-2 text-xl font-black uppercase tracking-[0.16em]">Ranked by next action</h2>
                  </div>
                  <p className="text-xs font-bold text-white/35">Generated {formatDateTime(report.generatedAt)}</p>
                </div>
                <div className="grid gap-4">
                  {report.leads.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm font-bold text-white/50">
                      No active report leads. Use the seed venues below to create the next outreach batch.
                    </div>
                  ) : (
                    report.leads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        copied={copiedLeadId === lead.id}
                        onCopy={copyPitch}
                        handoffCopied={copiedHandoffId === handoffItemKey(lead)}
                        onCopyHandoff={copyActivationHandoff}
                        onOpenActivationHandoff={trackActivationHandoff}
                        canAssignOwner={Boolean(address)}
                        isUpdating={updatingLeadId === lead.id}
                        onUpdateLead={updateLead}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[2.5rem] border border-white/10 bg-[#070712]/86 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200/60">Unworked supply</p>
                  <h2 className="mt-2 text-xl font-black uppercase tracking-[0.16em]">Seed the next route</h2>
                </div>
                <Link
                  href="/map?source=scout-command"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/15"
                >
                  Open map
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {report.seedCandidates.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm font-bold text-white/50">
                  No seed venues surfaced. Add venue memory through check-ins, place tags, or venue reports.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {report.seedCandidates.map((candidate) => (
                    <SeedCandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      draft={seedLeadDrafts[candidate.id] ?? DEFAULT_SEED_LEAD_DRAFT}
                      handoffCopied={copiedHandoffId === handoffItemKey(candidate)}
                      canAssignOwner={Boolean(address)}
                      isCreating={creatingSeedId === candidate.id}
                      onDraftChange={updateSeedLeadDraft}
                      onCopyHandoff={copyActivationHandoff}
                      onOpenActivationHandoff={trackActivationHandoff}
                      onCreateLead={createLeadFromSeed}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
