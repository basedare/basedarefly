'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clipboard,
  Clock3,
  DollarSign,
  ExternalLink,
  FileText,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  UserRoundSearch,
  XCircle,
} from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type IntakeStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'NEEDS_INFO'
  | 'READY_TO_INVOICE'
  | 'PAYMENT_SENT'
  | 'PAID_CONFIRMED'
  | 'LAUNCHED'
  | 'REJECTED';
type StatusFilter = IntakeStatus | 'ALL';

type ActivationIntake = {
  id: string;
  title: string;
  status: IntakeStatus;
  statusLabel: string;
  company: string;
  contactName: string;
  email: string;
  buyerType: string;
  city: string;
  venue: string;
  budgetLabel: string;
  timelineLabel: string;
  goal: string;
  packageId: string;
  website: string;
  notes: string;
  routeContext: {
    source: string;
    creator: string;
    venueId: string;
    venueSlug: string;
    venueHref: string | null;
    mapHref: string | null;
  };
  amount: number | null;
  ageHours: number;
  occurredAt: string;
  updatedAt: string;
  assignedCreator: string;
  assignedVenue: string;
  operatorNote: string;
  nextActionAt: string;
  paymentLink: string;
  paymentReference: string;
  positioningLine: string;
  proofLogic: string;
  repeatMetric: string;
  replyDraft: string;
  sparkRoutePacket: string;
  invoiceMemo: string;
  paymentPacket: string;
  closeRoom: {
    href: string;
    absoluteHref: string;
    mailtoHref: string | null;
    sentAt: string;
    viewedAt: string;
    paymentClickedAt: string;
    replyClickedAt: string;
    viewCount: number;
    paymentClickCount: number;
    replyClickCount: number;
    staleHours: number | null;
  };
  activationReceipt: {
    status: string;
    label: string;
    tone: string;
    campaignId: string | null;
    campaignTitle: string | null;
    campaignHref: string | null;
    venueHref: string | null;
    dareHref: string | null;
    proofUrl: string | null;
    creatorHandle: string | null;
    nextDecision: string;
    metrics: Array<{
      label: string;
      value: string;
      hint: string;
    }>;
    receiptText: string;
  };
  missionIdeas: Array<{
    title: string;
    detail: string;
    proofMetric: string;
  }>;
  creatorRecommendations: Array<{
    tag: string;
    score: number;
    trustScore: number;
    trustLabel: string;
    status: string;
    totalEarned: number;
    completedDares: number;
    venueReach: number;
    firstMarks: number;
    reviews: number;
    reasons: string[];
    createHref: string;
  }>;
  links: {
    createHref: string;
    scoutHref: string;
    replyMailtoHref: string | null;
    packetMailtoHref: string | null;
    invoiceMailtoHref: string | null;
    paymentMailtoHref: string | null;
    receiptMailtoHref: string | null;
  };
};

type IntakePayload = {
  summary: {
    total: number;
    active: number;
    readyToInvoice: number;
    paymentSent: number;
    paidConfirmed: number;
    needsInfo: number;
    launched: number;
    byStatus: Record<IntakeStatus, number>;
    funnel: {
      periodDays: number;
      generatedAt: string;
      sparkAudits: number;
      submittedAmount: number;
      steps: Array<{
        key: string;
        label: string;
        value: number;
        hint: string;
        conversionFromPrevious: number | null;
      }>;
      attribution: {
        topSources: Array<{ label: string; count: number }>;
        topPackages: Array<{ label: string; count: number }>;
      };
      stuck: {
        count: number;
        minAgeHours: number;
        top: {
          id: string;
          company: string;
          email: string;
          city: string;
          venue: string;
          status: string;
          ageHours: number;
          priority: {
            score: number;
            reasons: string[];
          };
        } | null;
      };
    };
  };
  intakes: ActivationIntake[];
};

type IntakeDraft = {
  assignedCreator?: string;
  assignedVenue?: string;
  operatorNote?: string;
  nextActionAt?: string;
  paymentLink?: string;
  paymentReference?: string;
};

type IntakeUpdatePatch = Partial<Omit<IntakeDraft, 'nextActionAt'>> & {
  nextActionAt?: string | null;
  status?: IntakeStatus;
  closeRoomAction?: 'sent';
};

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'NEEDS_INFO', label: 'Needs info' },
  { key: 'READY_TO_INVOICE', label: 'Ready invoice' },
  { key: 'PAYMENT_SENT', label: 'Payment sent' },
  { key: 'PAID_CONFIRMED', label: 'Paid' },
  { key: 'LAUNCHED', label: 'Launched' },
  { key: 'REJECTED', label: 'Rejected' },
];

function statusClass(status: IntakeStatus) {
  if (status === 'NEW') return 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';
  if (status === 'QUALIFIED') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (status === 'NEEDS_INFO') return 'border-yellow-300/30 bg-yellow-300/10 text-yellow-100';
  if (status === 'READY_TO_INVOICE') return 'border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100';
  if (status === 'PAYMENT_SENT') return 'border-orange-300/25 bg-orange-300/10 text-orange-100';
  if (status === 'PAID_CONFIRMED') return 'border-emerald-300/30 bg-emerald-300/12 text-emerald-100';
  if (status === 'LAUNCHED') return 'border-white/15 bg-white/10 text-white';
  return 'border-red-300/25 bg-red-400/10 text-red-100';
}

function receiptToneClass(tone: string) {
  if (tone === 'success') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (tone === 'warning') return 'border-yellow-300/30 bg-yellow-300/10 text-yellow-100';
  return 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100';
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFunnelConversion(value: number | null) {
  return value === null ? 'n/a' : `${value}%`;
}

function formatCompactMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '$0';
  if (value >= 1000) return `$${Math.round(value / 100) / 10}k`;
  return `$${Math.round(value)}`;
}

function formatNextActionInput(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function addDaysIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function appendOperatorNote(existing: string, nextLine: string) {
  const cleanExisting = existing.trim();
  const cleanNext = nextLine.trim();
  if (!cleanExisting) return cleanNext;
  if (cleanExisting.includes(cleanNext)) return cleanExisting;
  const combined = `${cleanExisting}\n${cleanNext}`;
  return combined.length > 1180 ? `${combined.slice(0, 1177)}...` : combined;
}

function nextActionState(value: string) {
  if (!value) {
    return {
      label: 'No next action',
      className: 'border-white/10 bg-white/[0.04] text-white/38',
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      label: 'Invalid next action',
      className: 'border-red-300/25 bg-red-400/10 text-red-100',
    };
  }

  const diffHours = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60));
  if (diffHours < 0) {
    return {
      label: `${Math.abs(diffHours)}h overdue`,
      className: 'border-red-300/25 bg-red-400/10 text-red-100',
    };
  }

  if (diffHours <= 1) {
    return {
      label: 'Due now',
      className: 'border-yellow-300/30 bg-yellow-300/10 text-yellow-100',
    };
  }

  if (diffHours <= 24) {
    return {
      label: `Due in ${diffHours}h`,
      className: 'border-yellow-300/24 bg-yellow-300/8 text-yellow-100/82',
    };
  }

  return {
    label: `Next ${formatDateTime(date.toISOString())}`,
    className: 'border-emerald-300/18 bg-emerald-300/8 text-emerald-100/72',
  };
}

function buildLaunchHref(intake: ActivationIntake, assignedVenue: string, assignedCreator: string) {
  const venueName = assignedVenue || intake.venue || intake.company;
  const firstMission = intake.missionIdeas[0]?.title || `Activate ${venueName || 'this venue'}`;
  const params = new URLSearchParams();
  params.set('mode', 'venue-activation');
  params.set('source', 'activation-intake-launch');
  params.set('activationLeadId', intake.id);
  params.set('title', firstMission);
  if (venueName) params.set('venueName', venueName);
  if (intake.city) params.set('city', intake.city);
  if (intake.amount) params.set('amount', String(intake.amount));
  if (assignedCreator) params.set('streamer', assignedCreator);
  return `/create?${params.toString()}`;
}

function buildBrandPortalLaunchHref(intake: ActivationIntake, assignedVenue: string, assignedCreator: string) {
  if (!intake.routeContext.venueSlug) {
    return buildLaunchHref(intake, assignedVenue, assignedCreator);
  }

  const venueName = assignedVenue || intake.venue || intake.company;
  const firstMission = intake.missionIdeas[0]?.title || `Activate ${venueName || 'this venue'}`;
  const params = new URLSearchParams();
  params.set('venue', intake.routeContext.venueSlug);
  params.set('compose', '1');
  params.set('reportSource', 'activation-intake');
  params.set('reportSessionKey', intake.id);
  params.set('reportIntent', 'activation');
  params.set('title', firstMission);
  if (assignedCreator) params.set('creator', assignedCreator);
  if (intake.amount) params.set('payout', String(intake.amount));
  if (intake.proofLogic || intake.missionIdeas[0]?.detail) {
    params.set('objective', intake.missionIdeas[0]?.detail || intake.proofLogic);
  }
  return `/brands/portal?${params.toString()}`;
}

function buildLaunchHandoffMemo(intake: ActivationIntake, assignedVenue: string, assignedCreator: string) {
  const target = assignedVenue || intake.venue || intake.company || 'Activation target';
  const creator = assignedCreator || intake.creatorRecommendations[0]?.tag || 'Creator shortlist pending';
  const mission = intake.missionIdeas[0];

  return [
    `BaseDare launch handoff - ${target}`,
    '',
    `Buyer: ${intake.company || 'TBD'}${intake.contactName ? ` / ${intake.contactName}` : ''}`,
    `Contact: ${intake.email || 'no email on file'}`,
    `Venue: ${target}${intake.city ? `, ${intake.city}` : ''}`,
    `Creator route: ${creator}`,
    `Budget lane: ${intake.budgetLabel}`,
    `Timeline: ${intake.timelineLabel}`,
    '',
    'Launch mission:',
    mission ? `${mission.title}: ${mission.detail}` : 'Use the venue-aware mission generator before funding.',
    '',
    'Proof target:',
    mission?.proofMetric || intake.proofLogic || 'Creator proof must show the place, action, story cue, and timestamp-worthy signal.',
    '',
    'Human gates before launch:',
    '- Buyer confirmed route and budget.',
    '- Payment is confirmed, not just invoice sent.',
    '- Venue and creator route are assigned.',
    '- Funded dare is launched inside BaseDare so proof and review stay trackable.',
  ].join('\n');
}

function buildLaunchOperatorNote(intake: ActivationIntake, assignedVenue: string, assignedCreator: string) {
  const target = assignedVenue || intake.venue || intake.company || 'activation target';
  const creator = assignedCreator || intake.creatorRecommendations[0]?.tag || 'creator pending';
  return `Launch handoff confirmed: ${target} / ${creator} / ${intake.budgetLabel}. Payment was marked confirmed before launch handoff.`;
}

function buildCloseRoomOperatorNote(intake: ActivationIntake) {
  const target = intake.assignedVenue || intake.venue || intake.company || 'activation target';
  return `Close room sent for ${target}. Follow up tomorrow if the buyer opens it but does not click payment.`;
}

export default function ActivationIntakesPage() {
  const { address } = useAccount();
  const [payload, setPayload] = useState<IntakePayload | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [drafts, setDrafts] = useState<Record<string, IntakeDraft>>({});
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
  } = useSessionAdminSecret();

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || hasAdminSession || adminSecretTrimmed);
  const hasReadyAdminAuth = Boolean(address || hasAdminSession);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (address) headers['x-moderator-wallet'] = address;
    return headers;
  }, [address]);

  const loadIntakes = useCallback(async () => {
    if (!hasAdminAuth) return;

    setLoading(true);
    setError(null);

    try {
      if (!address && !(await ensureAdminSession())) {
        throw new Error('Invalid admin secret');
      }

      const response = await fetch('/api/admin/activation-intakes', {
        headers: adminAuthHeaders,
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.hint || data.error || 'Unable to load activation intakes');
      }

      setPayload(data.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load activation intakes');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [address, adminAuthHeaders, ensureAdminSession, hasAdminAuth]);

  useEffect(() => {
    const leadId = new URLSearchParams(window.location.search).get('leadId');
    setHighlightId(leadId);
  }, []);

  useEffect(() => {
    if (!hasReadyAdminAuth) return;
    void loadIntakes();
  }, [hasReadyAdminAuth, loadIntakes]);

  const filteredIntakes = useMemo(() => {
    const intakes = payload?.intakes ?? [];
    if (statusFilter === 'ALL') return intakes;
    return intakes.filter((intake) => intake.status === statusFilter);
  }, [payload?.intakes, statusFilter]);

  const updateDraft = (id: string, patch: IntakeDraft) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  };

  const replaceIntake = (nextIntake: ActivationIntake) => {
    setPayload((current) => {
      if (!current) return current;
      const nextIntakes = current.intakes.map((intake) => (intake.id === nextIntake.id ? nextIntake : intake));
      const byStatus = nextIntakes.reduce(
        (acc, intake) => ({
          ...acc,
          [intake.status]: (acc[intake.status] ?? 0) + 1,
        }),
        {
          NEW: 0,
          QUALIFIED: 0,
          NEEDS_INFO: 0,
          READY_TO_INVOICE: 0,
          PAYMENT_SENT: 0,
          PAID_CONFIRMED: 0,
          LAUNCHED: 0,
          REJECTED: 0,
        } as Record<IntakeStatus, number>
      );
      return {
        summary: {
          total: nextIntakes.length,
          active: nextIntakes.filter((intake) => !['LAUNCHED', 'REJECTED'].includes(intake.status)).length,
          readyToInvoice: byStatus.READY_TO_INVOICE,
          paymentSent: byStatus.PAYMENT_SENT,
          paidConfirmed: byStatus.PAID_CONFIRMED,
          needsInfo: byStatus.NEEDS_INFO,
          launched: byStatus.LAUNCHED,
          byStatus,
          funnel: current.summary.funnel,
        },
        intakes: nextIntakes,
      };
    });
  };

  const updateIntake = async (id: string, patch: IntakeUpdatePatch): Promise<ActivationIntake | null> => {
    setUpdatingId(id);
    setError(null);

    try {
      const response = await fetch('/api/admin/activation-intakes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          id,
          ...patch,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to update intake');
      }

      replaceIntake(data.data);
      setDrafts((current) => ({ ...current, [id]: {} }));
      return data.data;
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update intake');
      return null;
    } finally {
      setUpdatingId(null);
    }
  };

  const saveOps = async (intake: ActivationIntake) => {
    const draft = drafts[intake.id] ?? {};
    await updateIntake(intake.id, {
      assignedCreator: draft.assignedCreator ?? intake.assignedCreator,
      assignedVenue: draft.assignedVenue ?? intake.assignedVenue,
      operatorNote: draft.operatorNote ?? intake.operatorNote,
      nextActionAt: toIsoFromLocal(draft.nextActionAt ?? formatNextActionInput(intake.nextActionAt)),
      paymentLink: draft.paymentLink ?? intake.paymentLink,
      paymentReference: draft.paymentReference ?? intake.paymentReference,
    });
  };

  const applyFollowUpPreset = async (
    intake: ActivationIntake,
    preset: {
      status: IntakeStatus;
      nextActionAt: string | null;
      note: string;
    }
  ) => {
    const draft = drafts[intake.id] ?? {};
    await updateIntake(intake.id, {
      assignedCreator: draft.assignedCreator ?? intake.assignedCreator,
      assignedVenue: draft.assignedVenue ?? intake.assignedVenue,
      status: preset.status,
      nextActionAt: preset.nextActionAt,
      operatorNote: appendOperatorNote(draft.operatorNote ?? intake.operatorNote, preset.note),
    });
  };

  const completeLaunchHandoff = async (intake: ActivationIntake) => {
    if (intake.status !== 'PAID_CONFIRMED' && intake.status !== 'LAUNCHED') {
      setError('Confirm payment before marking an activation launched.');
      return;
    }

    const draft = drafts[intake.id] ?? {};
    const assignedCreator = draft.assignedCreator ?? intake.assignedCreator;
    const assignedVenue = draft.assignedVenue ?? intake.assignedVenue;

    await updateIntake(intake.id, {
      assignedCreator,
      assignedVenue,
      status: 'LAUNCHED',
      nextActionAt: null,
      operatorNote: appendOperatorNote(
        draft.operatorNote ?? intake.operatorNote,
        buildLaunchOperatorNote(intake, assignedVenue, assignedCreator)
      ),
    });
  };

  const markPaymentSent = async (intake: ActivationIntake) => {
    const draft = drafts[intake.id] ?? {};
    await updateIntake(intake.id, {
      assignedCreator: draft.assignedCreator ?? intake.assignedCreator,
      assignedVenue: draft.assignedVenue ?? intake.assignedVenue,
      paymentLink: draft.paymentLink ?? intake.paymentLink,
      paymentReference: draft.paymentReference ?? intake.paymentReference,
      status: 'PAYMENT_SENT',
      nextActionAt: addDaysIso(1),
      operatorNote: appendOperatorNote(
        draft.operatorNote ?? intake.operatorNote,
        'Payment packet sent. Follow up tomorrow if payment is not confirmed.'
      ),
    });
  };

  const sendCloseRoom = async (intake: ActivationIntake) => {
    const draft = drafts[intake.id] ?? {};
    const nextIntake = await updateIntake(intake.id, {
      assignedCreator: draft.assignedCreator ?? intake.assignedCreator,
      assignedVenue: draft.assignedVenue ?? intake.assignedVenue,
      paymentLink: draft.paymentLink ?? intake.paymentLink,
      paymentReference: draft.paymentReference ?? intake.paymentReference,
      status: intake.status === 'PAID_CONFIRMED' || intake.status === 'LAUNCHED' ? intake.status : 'PAYMENT_SENT',
      closeRoomAction: 'sent',
      nextActionAt: addDaysIso(1),
      operatorNote: appendOperatorNote(draft.operatorNote ?? intake.operatorNote, buildCloseRoomOperatorNote(intake)),
    });

    if (nextIntake) {
      await copyText(`${intake.id}:close-room`, nextIntake.closeRoom.absoluteHref);
    }
  };

  const confirmPaid = async (intake: ActivationIntake) => {
    const draft = drafts[intake.id] ?? {};
    await updateIntake(intake.id, {
      assignedCreator: draft.assignedCreator ?? intake.assignedCreator,
      assignedVenue: draft.assignedVenue ?? intake.assignedVenue,
      paymentLink: draft.paymentLink ?? intake.paymentLink,
      paymentReference: draft.paymentReference ?? intake.paymentReference,
      status: 'PAID_CONFIRMED',
      nextActionAt: null,
      operatorNote: appendOperatorNote(
        draft.operatorNote ?? intake.operatorNote,
        'Payment confirmed. Open Brand Portal launch with the assigned venue and creator prefilled.'
      ),
    });
  };

  const copyText = async (copyKey: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(copyKey);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setError('Clipboard permission failed. Select and copy the text manually.');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] px-4 py-10 text-white sm:px-6 lg:px-10">
      <LiquidBackground />
      <GradualBlurOverlay />

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Back to admin
            </Link>
            <p className="text-xs font-black uppercase tracking-[0.36em] text-yellow-200/70">
              Paid activation pipeline
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-[-0.05em] sm:text-6xl">
              Intake <span className="text-yellow-300">Queue</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-white/55 sm:text-base">
              Convert activation interest into a concrete route: qualify the buyer, assign venue and creator,
              copy a reply, then move the lead toward invoice or launch.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-3 text-yellow-100">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                  Operator boundary
                </p>
                <p className="max-w-sm text-sm font-black text-white">
                  Draft and qualify here. Funding, invoices, and public commitments stay human-approved.
                </p>
              </div>
            </div>
          </div>
        </div>

        {!hasReadyAdminAuth && (
          <div className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-6 text-sm font-bold text-yellow-100">
            Connect a moderator wallet or paste the admin secret to view activation leads.
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
              Admin secret
            </span>
            <input
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder={hasAdminSession ? 'Session active' : 'Paste ADMIN_SECRET'}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-yellow-300/40"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadIntakes()}
            disabled={loading || !hasAdminAuth}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/30 bg-yellow-300/12 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-300/18 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Load queue
          </button>
          {hasAdminSession && (
            <button
              type="button"
              onClick={() => void clearAdminSecret()}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/[0.08]"
            >
              Clear session
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-[1.5rem] border border-red-300/25 bg-red-500/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {payload && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                { label: 'Total leads', value: payload.summary.total, icon: Search },
                { label: 'Active', value: payload.summary.active, icon: ShieldCheck },
                { label: 'Needs info', value: payload.summary.needsInfo, icon: Clock3 },
                { label: 'Ready invoice', value: payload.summary.readyToInvoice, icon: DollarSign },
                { label: 'Paid', value: payload.summary.paidConfirmed, icon: CheckCircle2 },
                { label: 'Launched', value: payload.summary.launched, icon: CheckCircle2 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-[1.7rem] border border-white/10 bg-black/42 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <Icon className="h-4 w-4 text-yellow-200/75" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.26em] text-white/38">{item.label}</p>
                    <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-white">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/46 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_80px_rgba(0,0,0,0.34)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/72">
                    <ListChecks className="h-4 w-4" />
                    Revenue funnel
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">
                    Views to paid activation
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/52">
                    Last {payload.summary.funnel.periodDays} days. Submissions use real intake records, so older
                    leads still count even if page tracking only started today.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
                  <div className="rounded-[1.2rem] border border-yellow-300/18 bg-yellow-300/[0.08] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100/60">Spark audits</p>
                    <p className="mt-1 text-2xl font-black text-yellow-100">{payload.summary.funnel.sparkAudits}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/60">Pipeline floor</p>
                    <p className="mt-1 text-2xl font-black text-emerald-100">
                      {formatCompactMoney(payload.summary.funnel.submittedAmount)}
                    </p>
                  </div>
                  <div className={`rounded-[1.2rem] border px-4 py-3 ${
                    payload.summary.funnel.stuck.count > 0
                      ? 'border-red-300/24 bg-red-500/[0.08]'
                      : 'border-white/10 bg-white/[0.04]'
                  }`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Stuck warm</p>
                    <p className="mt-1 text-2xl font-black text-white">{payload.summary.funnel.stuck.count}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
                {payload.summary.funnel.steps.map((step) => (
                  <div
                    key={step.key}
                    className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">{step.label}</p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">{step.value}</p>
                    <p className="mt-2 rounded-full border border-white/10 bg-black/28 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                      {formatFunnelConversion(step.conversionFromPrevious)}
                    </p>
                    <p className="mt-2 text-xs font-bold leading-5 text-white/38">{step.hint}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1.15fr]">
                <div className="rounded-[1.4rem] border border-white/10 bg-black/28 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Top sources</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(payload.summary.funnel.attribution.topSources.length
                      ? payload.summary.funnel.attribution.topSources
                      : [{ label: 'none yet', count: 0 }]
                    ).map((source) => (
                      <span key={source.label} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/54">
                        {source.label} {source.count}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/28 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Top packages</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(payload.summary.funnel.attribution.topPackages.length
                      ? payload.summary.funnel.attribution.topPackages
                      : [{ label: 'none yet', count: 0 }]
                    ).map((activationPackage) => (
                      <span key={activationPackage.label} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/54">
                        {activationPackage.label} {activationPackage.count}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/28 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Warm lead discipline</p>
                  {payload.summary.funnel.stuck.top ? (
                    <div className="mt-3">
                      <Link
                        href={`/admin/activation-intakes?leadId=${encodeURIComponent(payload.summary.funnel.stuck.top.id)}`}
                        className="text-sm font-black text-yellow-100 underline-offset-4 hover:underline"
                      >
                        {payload.summary.funnel.stuck.top.company}
                      </Link>
                      <p className="mt-1 text-xs font-bold leading-5 text-white/48">
                        {payload.summary.funnel.stuck.top.ageHours}h old · {payload.summary.funnel.stuck.top.status.toLowerCase().replace(/_/g, ' ')} · {payload.summary.funnel.stuck.top.priority.reasons.join(', ') || 'needs owner'}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-bold leading-5 text-white/42">
                      No high-intent activation is missing a follow-up action past {payload.summary.funnel.stuck.minAgeHours}h.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    statusFilter === filter.key
                      ? 'border-yellow-200/40 bg-yellow-300/15 text-yellow-100'
                      : 'border-white/10 bg-white/[0.04] text-white/48 hover:bg-white/[0.08] hover:text-white/75'
                  }`}
                >
                  {filter.label}
                  {filter.key !== 'ALL' ? ` ${payload.summary.byStatus[filter.key] ?? 0}` : ''}
                </button>
              ))}
            </div>

            <div className="grid gap-5">
              {filteredIntakes.map((intake) => {
                const draft = drafts[intake.id] ?? {};
                const assignedCreator = draft.assignedCreator ?? intake.assignedCreator;
                const assignedVenue = draft.assignedVenue ?? intake.assignedVenue;
                const operatorNote = draft.operatorNote ?? intake.operatorNote;
                const nextActionAt = draft.nextActionAt ?? formatNextActionInput(intake.nextActionAt);
                const paymentLink = draft.paymentLink ?? intake.paymentLink;
                const paymentReference = draft.paymentReference ?? intake.paymentReference;
                const actionState = nextActionState(nextActionAt || intake.nextActionAt);
                const launchHref = buildBrandPortalLaunchHref(intake, assignedVenue, assignedCreator);
                const launchMemo = buildLaunchHandoffMemo(intake, assignedVenue, assignedCreator);
                const canLaunch = intake.status === 'PAID_CONFIRMED' || intake.status === 'LAUNCHED';
                const receipt = intake.activationReceipt;
                const launchChecklist = [
                  {
                    label: 'Buyer',
                    ready: Boolean(intake.email),
                    detail: intake.email ? 'contact ready' : 'missing buyer email',
                  },
                  {
                    label: 'Venue',
                    ready: Boolean(assignedVenue || intake.venue),
                    detail: assignedVenue || intake.venue || 'assign a venue',
                  },
                  {
                    label: 'Creator',
                    ready: Boolean(assignedCreator || intake.creatorRecommendations[0]?.tag),
                    detail: assignedCreator || intake.creatorRecommendations[0]?.tag || 'route a creator',
                  },
                  {
                    label: 'Money',
                    ready: canLaunch,
                    detail:
                      intake.status === 'LAUNCHED'
                        ? 'launch confirmed'
                        : intake.status === 'PAID_CONFIRMED'
                          ? 'payment confirmed'
                          : intake.status === 'PAYMENT_SENT'
                            ? 'awaiting payment'
                            : intake.status === 'READY_TO_INVOICE'
                              ? 'send payment packet'
                              : 'not invoiced',
                  },
                ];
                const isUpdating = updatingId === intake.id;
                const isHighlighted = highlightId === intake.id;

                return (
                  <article
                    key={intake.id}
                    className={`rounded-[2rem] border bg-black/50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_90px_rgba(0,0,0,0.38)] ${
                      isHighlighted ? 'border-yellow-200/45' : 'border-white/10'
                    }`}
                  >
                    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusClass(intake.status)}`}>
                            {intake.statusLabel}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                            {intake.ageHours}h old
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                            {intake.budgetLabel}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${actionState.className}`}>
                            {actionState.label}
                          </span>
                        </div>

                        <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
                          {intake.company || 'Unnamed activation'}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/58">
                          {intake.positioningLine || `${intake.buyerType || 'Buyer'} wants activation in ${intake.city || 'the grid'}.`}
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          {[
                            ['Contact', `${intake.contactName || 'Unknown'} · ${intake.email || 'no email'}`],
                            ['Target', `${intake.assignedVenue || intake.venue || 'Venue TBD'}${intake.city ? ` · ${intake.city}` : ''}`],
                            ['Timeline', intake.timelineLabel],
                            ['Goal', intake.goal.replace(/_/g, ' ') || 'goal TBD'],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{label}</p>
                              <p className="mt-2 text-sm font-black text-white/82">{value}</p>
                            </div>
                          ))}
                        </div>

                        {(intake.routeContext.source || intake.routeContext.creator || intake.routeContext.venueHref || intake.routeContext.mapHref) ? (
                          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.045] p-3">
                            {intake.routeContext.source ? (
                              <span className="rounded-full border border-cyan-200/14 bg-cyan-300/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                                Source: {intake.routeContext.source}
                              </span>
                            ) : null}
                            {intake.routeContext.creator ? (
                              <span className="rounded-full border border-fuchsia-200/14 bg-fuchsia-300/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-100/72">
                                Routed: {intake.routeContext.creator}
                              </span>
                            ) : null}
                            {intake.routeContext.venueHref ? (
                              <Link
                                href={intake.routeContext.venueHref}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/58 transition hover:bg-white/[0.08] hover:text-white"
                              >
                                Open venue
                              </Link>
                            ) : null}
                            {intake.routeContext.mapHref ? (
                              <Link
                                href={intake.routeContext.mapHref}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/58 transition hover:bg-white/[0.08] hover:text-white"
                              >
                                Open map pin
                              </Link>
                            ) : null}
                          </div>
                        ) : null}

                        {intake.missionIdeas.length > 0 && (
                          <div className="mt-5 rounded-[1.5rem] border border-yellow-200/12 bg-yellow-300/[0.05] p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/60">
                              Venue-aware mission ideas
                            </p>
                            <div className="mt-3 grid gap-2">
                              {intake.missionIdeas.slice(0, 3).map((mission) => (
                                <div key={`${mission.title}-${mission.detail}`} className="rounded-2xl border border-white/10 bg-black/35 p-3">
                                  <p className="text-sm font-black text-white">{mission.title}</p>
                                  <p className="mt-1 text-xs font-bold leading-5 text-white/52">{mission.detail}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label>
                            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Assigned venue</span>
                            <input
                              value={assignedVenue}
                              onChange={(event) => updateDraft(intake.id, { assignedVenue: event.target.value })}
                              placeholder="Venue name"
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-yellow-300/35"
                            />
                          </label>
                          <label>
                            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Assigned creator</span>
                            <input
                              value={assignedCreator}
                              onChange={(event) => updateDraft(intake.id, { assignedCreator: event.target.value })}
                              placeholder="@creator"
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-yellow-300/35"
                            />
                          </label>
                        </div>

                        {intake.creatorRecommendations.length > 0 && (
                          <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
                                  Creator match
                                </p>
                                <p className="mt-1 text-sm font-black text-white">
                                  Best routes for this activation
                                </p>
                              </div>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                                {intake.creatorRecommendations.length} ranked
                              </span>
                            </div>
                            <div className="mt-4 grid gap-2">
                              {intake.creatorRecommendations.slice(0, 3).map((creator) => (
                                <div
                                  key={`${intake.id}-${creator.tag}`}
                                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-black text-white">{creator.tag}</p>
                                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                                        Fit {creator.score} / Trust {creator.trustScore} / {creator.trustLabel}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => updateDraft(intake.id, { assignedCreator: creator.tag })}
                                        className="rounded-full border border-white/10 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black transition hover:bg-white/85"
                                      >
                                        Assign
                                      </button>
                                      <Link
                                        href={creator.createHref}
                                        className="rounded-full border border-yellow-300/25 bg-yellow-300/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100 transition hover:bg-yellow-300/18"
                                      >
                                        Route
                                      </Link>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {creator.reasons.map((reason) => (
                                      <span
                                        key={reason}
                                        className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45"
                                      >
                                        {reason}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Next action</span>
                          <input
                            type="datetime-local"
                            value={nextActionAt}
                            onChange={(event) => updateDraft(intake.id, { nextActionAt: event.target.value })}
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none focus:border-yellow-300/35"
                          />
                        </label>

                        <div className="rounded-[1.35rem] border border-white/10 bg-black/32 p-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
                                Follow-up presets
                              </p>
                              <p className="mt-1 text-xs font-bold leading-5 text-white/45">
                                Lock the next touch immediately after replying so paid intent cannot go cold.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void applyFollowUpPreset(intake, {
                                    status: 'QUALIFIED',
                                    nextActionAt: addDaysIso(1),
                                    note: 'Reply sent. Follow up tomorrow if the buyer has not confirmed scope.',
                                  })
                                }
                                disabled={isUpdating}
                                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-45"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                Reply sent
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void applyFollowUpPreset(intake, {
                                    status: 'NEEDS_INFO',
                                    nextActionAt: addDaysIso(2),
                                    note: 'Clarifying info requested. Follow up in 2 days with a tighter activation route.',
                                  })
                                }
                                disabled={isUpdating}
                                className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100 transition hover:bg-yellow-300/15 disabled:opacity-45"
                              >
                                Need info
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void applyFollowUpPreset(intake, {
                                    status: 'READY_TO_INVOICE',
                                    nextActionAt: addDaysIso(1),
                                    note: 'Buyer route approved. Payment packet is ready to send.',
                                  })
                                }
                                disabled={isUpdating}
                                className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-300/15 disabled:opacity-45"
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                                Ready pay
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[1.55rem] border border-orange-300/16 bg-[linear-gradient(135deg,rgba(251,146,60,0.11),rgba(0,0,0,0.38)_45%,rgba(34,197,94,0.08))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/18 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-100">
                                <DollarSign className="h-3.5 w-3.5" />
                                Payment close loop
                              </div>
                              <p className="mt-3 text-sm font-black text-white">
                                Send one buyer-ready packet, then unlock launch only after funds are confirmed.
                              </p>
                              <p className="mt-1 max-w-xl text-xs font-bold leading-5 text-white/50">
                                The payment link can come from env or be pasted per lead. Keep public launch blocked until the status is paid confirmed.
                              </p>
                            </div>
                            <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClass(intake.status)}`}>
                              {intake.statusLabel}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-[1.25fr_0.75fr]">
                            <label>
                              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Payment link</span>
                              <input
                                value={paymentLink}
                                onChange={(event) => updateDraft(intake.id, { paymentLink: event.target.value })}
                                placeholder="Stripe, invoice, or USDC payment URL"
                                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-orange-300/35"
                              />
                            </label>
                            <label>
                              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Reference</span>
                              <input
                                value={paymentReference}
                                onChange={(event) => updateDraft(intake.id, { paymentReference: event.target.value })}
                                placeholder="BD-..."
                                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-orange-300/35"
                              />
                            </label>
                          </div>

                          <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/34 p-3">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
                                  Buyer close room
                                </p>
                                <p className="mt-1 text-xs font-bold leading-5 text-white/50">
                                  One tokenized page for the route, payment reference, proof logic, and launch gates.
                                  {intake.closeRoom.staleHours !== null && intake.closeRoom.staleHours >= 24
                                    ? ` ${intake.closeRoom.staleHours}h since sent without payment click.`
                                    : ''}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                                  Views {intake.closeRoom.viewCount}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                                  Pay clicks {intake.closeRoom.paymentClickCount}
                                </span>
                                {intake.closeRoom.sentAt ? (
                                  <span className="rounded-full border border-orange-300/18 bg-orange-300/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-100/70">
                                    Sent {formatDateTime(intake.closeRoom.sentAt)}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              <button
                                type="button"
                                onClick={() => void copyText(`${intake.id}:close-room`, intake.closeRoom.absoluteHref)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/15"
                              >
                                <Clipboard className="h-4 w-4" />
                                {copiedId === `${intake.id}:close-room` ? 'Copied' : 'Copy room'}
                              </button>
                              <Link
                                href={intake.closeRoom.href}
                                target="_blank"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/72 transition hover:bg-white/[0.1]"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Open room
                              </Link>
                              {intake.closeRoom.mailtoHref ? (
                                <a
                                  href={intake.closeRoom.mailtoHref}
                                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                                >
                                  <Mail className="h-4 w-4" />
                                  Email room
                                </a>
                              ) : (
                                <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                                  No email
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => void sendCloseRoom(intake)}
                                disabled={isUpdating}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-300/20 bg-orange-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-orange-100 transition hover:bg-orange-300/15 disabled:opacity-45"
                              >
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Send room
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <button
                              type="button"
                              onClick={() => void copyText(`${intake.id}:payment`, intake.paymentPacket)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-300/20 bg-orange-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-orange-100 transition hover:bg-orange-300/15"
                            >
                              <Clipboard className="h-4 w-4" />
                              {copiedId === `${intake.id}:payment` ? 'Copied' : 'Copy packet'}
                            </button>
                            {intake.links.paymentMailtoHref ? (
                              <a
                                href={intake.links.paymentMailtoHref}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                              >
                                <Mail className="h-4 w-4" />
                                Email payment
                              </a>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                                No email
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => void markPaymentSent(intake)}
                              disabled={isUpdating}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-300/20 bg-orange-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-orange-100 transition hover:bg-orange-300/15 disabled:opacity-45"
                            >
                              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              Payment sent
                            </button>
                            <button
                              type="button"
                              onClick={() => void confirmPaid(intake)}
                              disabled={isUpdating}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-45"
                            >
                              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Paid confirmed
                            </button>
                          </div>
                        </div>

                        <div className="rounded-[1.55rem] border border-emerald-300/16 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(0,0,0,0.38)_48%,rgba(250,204,21,0.08))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/18 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
                                <Rocket className="h-3.5 w-3.5" />
                                Launch handoff
                              </div>
                              <p className="mt-3 text-sm font-black text-white">
                                One clean operator packet before funding.
                              </p>
                              <p className="mt-1 max-w-xl text-xs font-bold leading-5 text-white/50">
                                Open the prefilled Brand Portal launch only after the buyer has paid. Payment sent is
                                not enough; launch unlocks at paid confirmed.
                              </p>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[21rem]">
                              {launchChecklist.map((item) => (
                                <div
                                  key={`${intake.id}-${item.label}`}
                                  className={`rounded-2xl border p-3 ${
                                    item.ready
                                      ? 'border-emerald-200/18 bg-emerald-300/8'
                                      : 'border-yellow-200/18 bg-yellow-300/8'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {item.ready ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-100" />
                                    ) : (
                                      <Clock3 className="h-3.5 w-3.5 text-yellow-100" />
                                    )}
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
                                      {item.label}
                                    </p>
                                  </div>
                                  <p className="mt-1 truncate text-xs font-black text-white/78">{item.detail}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/38 p-3">
                            <div className="flex items-start gap-3">
                              <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-yellow-100/80" />
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">
                                  First funded mission
                                </p>
                                <p className="mt-1 text-sm font-black leading-5 text-white">
                                  {intake.missionIdeas[0]?.title || `Activate ${assignedVenue || intake.venue || intake.company || 'this venue'}`}
                                </p>
                                <p className="mt-1 text-xs font-bold leading-5 text-white/48">
                                  {intake.missionIdeas[0]?.proofMetric ||
                                    intake.proofLogic ||
                                    'Proof must show place, action, story cue, and a timestamp-worthy signal.'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <button
                              type="button"
                              onClick={() => void copyText(`${intake.id}:handoff`, launchMemo)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/15"
                            >
                              <Clipboard className="h-4 w-4" />
                              {copiedId === `${intake.id}:handoff` ? 'Copied' : 'Copy handoff'}
                            </button>
                            {canLaunch ? (
                              <Link
                                href={launchHref}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/12 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100 transition hover:bg-yellow-300/18"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Open Brand launch
                              </Link>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/28">
                                <Lock className="h-4 w-4" />
                                Pay first
                              </span>
                            )}
                            {intake.links.invoiceMailtoHref ? (
                              <a
                                href={intake.links.invoiceMailtoHref}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                              >
                                <DollarSign className="h-4 w-4" />
                                Send invoice
                              </a>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                                No invoice
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => void completeLaunchHandoff(intake)}
                              disabled={isUpdating || !canLaunch}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-45"
                            >
                              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Confirm launch
                            </button>
                          </div>
                        </div>

                        <div className="rounded-[1.55rem] border border-cyan-300/16 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(0,0,0,0.42)_48%,rgba(255,255,255,0.05))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                                <FileText className="h-3.5 w-3.5" />
                                Proof receipt
                              </div>
                              <p className="mt-3 text-sm font-black text-white">
                                Buyer-ready outcome recap after launch.
                              </p>
                              <p className="mt-1 max-w-xl text-xs font-bold leading-5 text-white/50">
                                This ties the paid lead to its campaign, proof, creator route, spend, and repeat decision.
                              </p>
                            </div>
                            <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${receiptToneClass(receipt.tone)}`}>
                              {receipt.label}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                            {receipt.metrics.map((metric) => (
                              <div
                                key={`${intake.id}-receipt-${metric.label}`}
                                className="rounded-2xl border border-white/10 bg-black/35 p-3"
                              >
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                                  {metric.label}
                                </p>
                                <p className="mt-1 truncate text-sm font-black text-white">{metric.value}</p>
                                <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-white/42">
                                  {metric.hint}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 rounded-[1.25rem] border border-white/10 bg-black/38 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">
                              Next decision
                            </p>
                            <p className="mt-1 text-xs font-bold leading-5 text-white/58">
                              {receipt.nextDecision}
                            </p>
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                            <button
                              type="button"
                              onClick={() => void copyText(`${intake.id}:receipt`, receipt.receiptText)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/15"
                            >
                              <Clipboard className="h-4 w-4" />
                              {copiedId === `${intake.id}:receipt` ? 'Copied' : 'Copy receipt'}
                            </button>
                            {intake.links.receiptMailtoHref ? (
                              <a
                                href={intake.links.receiptMailtoHref}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                              >
                                <Mail className="h-4 w-4" />
                                Email receipt
                              </a>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                                No email
                              </span>
                            )}
                            {receipt.campaignHref ? (
                              <Link
                                href={receipt.campaignHref}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/72 transition hover:bg-white/[0.1]"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Campaign
                              </Link>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                                No campaign
                              </span>
                            )}
                            {receipt.dareHref ? (
                              <Link
                                href={receipt.dareHref}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/12 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100 transition hover:bg-yellow-300/18"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Dare
                              </Link>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                                No dare
                              </span>
                            )}
                            {receipt.proofUrl ? (
                              <a
                                href={receipt.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/15"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Proof
                              </a>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                                No proof
                              </span>
                            )}
                          </div>
                        </div>

                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Operator note</span>
                          <textarea
                            value={operatorNote}
                            onChange={(event) => updateDraft(intake.id, { operatorNote: event.target.value })}
                            rows={4}
                            placeholder="Qualification notes, objection, invoice state, next move..."
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold leading-6 text-white outline-none placeholder:text-white/25 focus:border-yellow-300/35"
                          />
                        </label>

                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <button
                            type="button"
                            onClick={() => void saveOps(intake)}
                            disabled={isUpdating}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/[0.12] disabled:opacity-45"
                          >
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Save ops
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyText(`${intake.id}:reply`, intake.replyDraft)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-300/15"
                          >
                            <Clipboard className="h-4 w-4" />
                            {copiedId === `${intake.id}:reply` ? 'Copied' : 'Reply'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyText(`${intake.id}:packet`, intake.sparkRoutePacket)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:bg-yellow-300/15"
                          >
                            <FileText className="h-4 w-4" />
                            {copiedId === `${intake.id}:packet` ? 'Copied' : 'Packet'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyText(`${intake.id}:invoice`, intake.invoiceMemo)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                          >
                            <DollarSign className="h-4 w-4" />
                            {copiedId === `${intake.id}:invoice` ? 'Copied' : 'Invoice'}
                          </button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          {(['QUALIFIED', 'NEEDS_INFO', 'READY_TO_INVOICE'] as IntakeStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => void updateIntake(intake.id, { status })}
                              disabled={isUpdating}
                              className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/65 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-45"
                            >
                              {status === 'READY_TO_INVOICE' ? 'Invoice' : status.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <Link
                            href={intake.links.createHref}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/12 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100 transition hover:bg-yellow-300/18"
                          >
                            <Send className="h-4 w-4" />
                            Create
                          </Link>
                          <Link
                            href={intake.links.scoutHref}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/72 transition hover:bg-white/[0.1]"
                          >
                            <UserRoundSearch className="h-4 w-4" />
                            Scout
                          </Link>
                          {intake.links.replyMailtoHref ? (
                            <a
                              href={intake.links.replyMailtoHref}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/72 transition hover:bg-white/[0.1]"
                            >
                              <Mail className="h-4 w-4" />
                              Email reply
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                              No email
                            </span>
                          )}
                          {intake.links.invoiceMailtoHref ? (
                            <a
                              href={intake.links.invoiceMailtoHref}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                            >
                              <DollarSign className="h-4 w-4" />
                              Email invoice
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                              No invoice
                            </span>
                          )}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => void completeLaunchHandoff(intake)}
                            disabled={isUpdating || !canLaunch}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-45"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Confirm launch
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateIntake(intake.id, { status: 'REJECTED' })}
                            disabled={isUpdating}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-400/15 disabled:opacity-45"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredIntakes.length === 0 && (
              <div className="rounded-[2rem] border border-white/10 bg-black/42 p-10 text-center">
                <Lock className="mx-auto h-8 w-8 text-white/35" />
                <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white/45">
                  No activation intakes in this lane.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
