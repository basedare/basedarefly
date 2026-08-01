'use client';

import {
  ArrowRight,
  Clipboard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAccount } from 'wagmi';

import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';
import {
  creatorDropAssignmentStatusLabel,
  nextCreatorDropAssignmentStatus,
  type CreatorDropAssignmentStatus,
} from '@/lib/creator-drop-assignments';
import { type CreatorDropCategory } from '@/lib/creator-drops';

type Assignment = {
  id: string;
  creatorCode: string;
  creatorName: string | null;
  contactChannel: string | null;
  contactHandle: string | null;
  status: CreatorDropAssignmentStatus;
  nextStatus: CreatorDropAssignmentStatus;
  suggestedVerdict: CreatorDropAssignmentStatus | null;
  priority: number;
  notes: string | null;
  activationCopy: string | null;
  lastTouchAt: string | null;
  acceptedAt: string | null;
  postedAt: string | null;
  updatedAt: string;
  link: {
    id: string;
    slug: string;
    publicPath: string;
    publicUrl: string;
    targetType: string;
    targetId: string;
    targetHref: string;
    active: boolean;
    metadata: {
      title: string;
      hook: string;
      category: CreatorDropCategory;
      actionLabel: string;
      rewardLabel?: string | null;
      creatorBrief?: string | null;
    };
  } | null;
  metrics: {
    touches: number;
    intents: number;
    missionPasses: number;
    verifiedCompletions: number;
  };
};

type UnassignedDrop = {
  id: string;
  slug: string;
  creatorCode: string;
  publicPath: string;
  publicUrl: string;
  targetType: string;
  targetId: string;
  metadata: {
    title: string;
    hook: string;
    category: CreatorDropCategory;
  };
};

type QueueReport = {
  generatedAt: string;
  assignments: Assignment[];
  unassignedDrops: UnassignedDrop[];
};

const EMPTY_FORM = {
  linkSlug: '',
  creatorCode: '',
  creatorName: '',
  contactChannel: 'instagram',
  contactHandle: '',
  priority: '2',
  notes: '',
};

const inputClass =
  'mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/45 px-3 text-sm text-white outline-none placeholder:text-white/22 focus:border-[#f5c518]/35';
const textareaClass =
  'mt-1 min-h-[82px] w-full rounded-xl border border-white/10 bg-black/45 px-3 py-3 text-sm text-white outline-none placeholder:text-white/22 focus:border-[#f5c518]/35';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.16em] text-white/35';

const STATUS_TONE: Record<CreatorDropAssignmentStatus, string> = {
  DRAFTED: 'border-white/10 bg-white/[0.04] text-white/55',
  READY_TO_SEND: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100',
  SENT: 'border-[#f5c518]/20 bg-[#f5c518]/10 text-[#ffe36a]',
  ACCEPTED: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
  POSTED: 'border-purple-300/25 bg-purple-300/10 text-purple-100',
  INTENT_LOCKED: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
  VERIFIED: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  REPEAT: 'border-[#f5c518]/30 bg-[#f5c518]/15 text-[#ffe36a]',
  KILL: 'border-red-300/25 bg-red-400/10 text-red-100',
};

export default function CreatorDropQueueAdminPage() {
  const { address } = useAccount();
  const { adminSecret, setAdminSecret, ensureAdminSession, hasAdminSession } = useSessionAdminSecret();
  const [form, setForm] = useState(EMPTY_FORM);
  const [report, setReport] = useState<QueueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    if (address) next['x-moderator-wallet'] = address;
    return next;
  }, [address]);

  const authenticate = useCallback(async () => {
    if (address || hasAdminSession) return true;
    return ensureAdminSession();
  }, [address, ensureAdminSession, hasAdminSession]);

  const load = useCallback(async () => {
    if (!(await authenticate())) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/creator-drop-assignments', { headers, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.hint || payload.error || 'Unable to load creator queue.');
      setReport(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load creator queue.');
    } finally {
      setLoading(false);
    }
  }, [authenticate, headers]);

  useEffect(() => { if (address || hasAdminSession) void load(); }, [address, hasAdminSession, load]);

  const updateForm = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function copy(value: string | null | undefined, success = 'Copied.') {
    if (!value) return;
    await navigator.clipboard.writeText(value).catch(() => null);
    setMessage(success);
  }

  const createAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(await authenticate())) { setError('Admin authorization required.'); return; }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/creator-drop-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...form,
          priority: Number(form.priority),
          creatorName: form.creatorName || null,
          contactHandle: form.contactHandle || null,
          notes: form.notes || null,
          status: 'READY_TO_SEND',
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || 'Unable to create assignment.');
      await copy(payload.data.activationCopy, 'Created assignment and copied the outreach note.');
      setForm((current) => ({
        ...EMPTY_FORM,
        creatorCode: current.creatorCode,
        contactChannel: current.contactChannel,
      }));
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create assignment.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (assignment: Assignment, status: CreatorDropAssignmentStatus) => {
    if (!(await authenticate())) return;
    setUpdatingId(assignment.id);
    setError(null);
    try {
      const response = await fetch('/api/admin/creator-drop-assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ id: assignment.id, status, markTouched: status === 'SENT' }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to update assignment.');
      setMessage(`Marked @${assignment.creatorCode} as ${creatorDropAssignmentStatusLabel(status)}.`);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update assignment.');
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(() => {
    const assignments = report?.assignments ?? [];
    return {
      ready: assignments.filter((assignment) => ['DRAFTED', 'READY_TO_SEND'].includes(assignment.status)).length,
      sent: assignments.filter((assignment) => ['SENT', 'ACCEPTED', 'POSTED'].includes(assignment.status)).length,
      verified: assignments.reduce((total, assignment) => total + assignment.metrics.verifiedCompletions, 0),
      repeat: assignments.filter((assignment) => assignment.status === 'REPEAT').length,
    };
  }, [report]);

  return (
    <main className="min-h-screen bg-[#07070b] px-4 pb-20 pt-24 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#ffe36a]">
              <Send className="h-3.5 w-3.5" />
              Creator Activation Queue
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Turn creator chats into tracked drops.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              Assign one drop to one creator, copy the message, mark what happened, and judge repeat decisions by saved missions and verified actions — not vibes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/creator-drops" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.12em] text-white/65">
              <Sparkles className="h-4 w-4" />
              Create drops
            </Link>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.12em] text-white/65">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>

        {!address && !hasAdminSession ? (
          <section className="mt-8 max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <label className={labelClass}>Admin secret</label>
            <input type="password" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} className={inputClass} />
            <button type="button" onClick={() => void load()} className="mt-3 h-11 w-full rounded-xl bg-[#f5c518] text-xs font-black uppercase tracking-[0.16em] text-black">Open activation queue</button>
          </section>
        ) : null}

        {error ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
        {message ? <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}

        <section className="mt-8 grid gap-3 sm:grid-cols-4">
          <Metric label="Ready to send" value={counts.ready} />
          <Metric label="In conversation" value={counts.sent} />
          <Metric label="Verified actions" value={counts.verified} />
          <Metric label="Repeat calls" value={counts.repeat} />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <form onSubmit={createAssignment} className="rounded-[28px] border border-[#f5c518]/20 bg-[linear-gradient(150deg,rgba(245,197,24,.07),rgba(255,255,255,.035)_30%,rgba(0,0,0,.62))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            <h2 className="flex items-center gap-2 text-xl font-black"><UserPlus className="h-5 w-5 text-[#ffe36a]" /> Assign a drop</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">Create the drop first, paste its slug here, then send the copied note manually.</p>
            <div className="mt-5 grid gap-3">
              <Field label="Drop slug" value={form.linkSlug} onChange={(value) => updateForm('linkSlug', value)} placeholder="maya-tonight-01" required />
              <Field label="Creator code" value={form.creatorCode} onChange={(value) => updateForm('creatorCode', value)} placeholder="@maya" required />
              <Field label="Creator name" value={form.creatorName} onChange={(value) => updateForm('creatorName', value)} placeholder="Maya" />
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className={labelClass}>Channel</span>
                  <select value={form.contactChannel} onChange={(event) => updateForm('contactChannel', event.target.value)} className={inputClass}>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                    <option value="email">Email</option>
                    <option value="in_person">In person</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>
                <Field label="Priority 0-5" value={form.priority} onChange={(value) => updateForm('priority', value)} placeholder="2" />
              </div>
              <Field label="Contact handle" value={form.contactHandle} onChange={(value) => updateForm('contactHandle', value)} placeholder="@creator or phone note" />
              <label>
                <span className={labelClass}>Notes</span>
                <textarea value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} className={textareaClass} placeholder="What should the growth admin remember before sending?" />
              </label>
            </div>
            <button disabled={saving} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#f5c518] px-4 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[0_16px_42px_rgba(245,197,24,.18)] disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clipboard className="h-4 w-4" />}
              Create assignment + copy ask
            </button>
          </form>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Activation queue</h2>
              <p className="text-xs text-white/35">{report ? `Updated ${new Date(report.generatedAt).toLocaleString()}` : 'Not loaded yet'}</p>
            </div>

            {report?.unassignedDrops.length ? (
              <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-3">
                <p className={labelClass}>Unassigned drops</p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {report.unassignedDrops.map((drop) => (
                    <button
                      key={drop.id}
                      type="button"
                      onClick={() => setForm((current) => ({
                        ...current,
                        linkSlug: drop.slug,
                        creatorCode: drop.creatorCode,
                      }))}
                      className="shrink-0 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-left text-xs text-white/70"
                    >
                      <span className="block font-black text-white">{drop.metadata.title}</span>
                      <span className="text-white/35">/go/{drop.slug}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {!report ? (
                <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">Authorize to load the activation queue.</p>
              ) : report.assignments.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">No assignments yet. Create a drop, assign it, then send the note manually.</p>
              ) : report.assignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  updating={updatingId === assignment.id}
                  onCopy={copy}
                  onUpdateStatus={updateStatus}
                />
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} className={inputClass} />
    </label>
  );
}

function AssignmentCard({
  assignment,
  updating,
  onCopy,
  onUpdateStatus,
}: {
  assignment: Assignment;
  updating: boolean;
  onCopy: (value: string | null | undefined, success?: string) => Promise<void>;
  onUpdateStatus: (assignment: Assignment, status: CreatorDropAssignmentStatus) => Promise<void>;
}) {
  const nextStatus = nextCreatorDropAssignmentStatus(assignment.status);
  const terminal = assignment.status === 'REPEAT' || assignment.status === 'KILL';

  return (
    <article className="rounded-[24px] border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
            @{assignment.creatorCode}
            {assignment.contactChannel ? ` · ${assignment.contactChannel.replace(/_/g, ' ')}` : ''}
            {assignment.contactHandle ? ` · ${assignment.contactHandle}` : ''}
          </p>
          <h3 className="mt-1 text-lg font-black text-white">{assignment.link?.metadata.title ?? 'Unlinked creator assignment'}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/45">{assignment.link?.metadata.hook ?? assignment.notes ?? 'Attach a creator drop link before sending.'}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${STATUS_TONE[assignment.status]}`}>
          {creatorDropAssignmentStatusLabel(assignment.status)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Metric label="Touches" value={assignment.metrics.touches} compact />
        <Metric label="Passes" value={assignment.metrics.missionPasses} compact />
        <Metric label="Intents" value={assignment.metrics.intents} compact />
        <Metric label="Verified" value={assignment.metrics.verifiedCompletions} compact />
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
        <p className={labelClass}>Manual outreach note</p>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-white/58">{assignment.activationCopy ?? 'No copy generated yet.'}</pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void onCopy(assignment.activationCopy, 'Outreach note copied.')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-white/60">
            <Clipboard className="h-3.5 w-3.5" />
            Copy note
          </button>
          {assignment.link ? (
            <>
              <button type="button" onClick={() => void onCopy(assignment.link?.publicUrl, 'Creator link copied.')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-white/60">
                <Clipboard className="h-3.5 w-3.5" />
                Copy link
              </button>
              <Link href={assignment.link.publicPath} className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                Open drop
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!terminal ? (
          <button
            type="button"
            disabled={updating}
            onClick={() => void onUpdateStatus(assignment, nextStatus)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#f5c518] px-4 text-[10px] font-black uppercase tracking-[0.13em] text-black disabled:opacity-50"
          >
            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            Mark {creatorDropAssignmentStatusLabel(nextStatus)}
          </button>
        ) : null}
        <button type="button" disabled={updating} onClick={() => void onUpdateStatus(assignment, 'REPEAT')} className="inline-flex h-10 items-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 text-[10px] font-black uppercase tracking-[0.13em] text-emerald-100 disabled:opacity-50">
          Repeat
        </button>
        <button type="button" disabled={updating} onClick={() => void onUpdateStatus(assignment, 'KILL')} className="inline-flex h-10 items-center rounded-xl border border-red-300/20 bg-red-300/[0.08] px-4 text-[10px] font-black uppercase tracking-[0.13em] text-red-100 disabled:opacity-50">
          Kill
        </button>
        {assignment.suggestedVerdict ? (
          <span className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[10px] font-black uppercase tracking-[0.13em] text-white/38">
            Suggested: {creatorDropAssignmentStatusLabel(assignment.suggestedVerdict)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: number; compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.035] ${compact ? 'p-2' : 'p-4'}`}>
      <strong className={`block ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</strong>
      <span className="text-[9px] uppercase tracking-wider text-white/30">{label}</span>
    </div>
  );
}
