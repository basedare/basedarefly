'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';

type ProductionSafetySeverity = 'pass' | 'warn' | 'block';

type ProductionSafetyReport = {
  generatedAt: string;
  environment: {
    nodeEnv: string | null;
    network: string | null;
    simulationMode: boolean;
  };
  summary: {
    blockers: number;
    warnings: number;
    passes: number;
  };
  checks: Array<{
    id: string;
    label: string;
    severity: ProductionSafetySeverity;
    detail: string;
    nextAction?: string;
  }>;
};

function severityLabel(severity: ProductionSafetySeverity) {
  if (severity === 'block') return 'Blocker';
  if (severity === 'warn') return 'Warning';
  return 'Pass';
}

function severityClasses(severity: ProductionSafetySeverity) {
  if (severity === 'block') {
    return 'border-red-400/35 bg-red-500/10 text-red-100';
  }
  if (severity === 'warn') {
    return 'border-yellow-300/35 bg-yellow-500/10 text-yellow-100';
  }
  return 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100';
}

function severityIcon(severity: ProductionSafetySeverity) {
  if (severity === 'block') return <ShieldAlert className="h-4 w-4" />;
  if (severity === 'warn') return <AlertTriangle className="h-4 w-4" />;
  return <CheckCircle2 className="h-4 w-4" />;
}

export default function ProductionSafetyPage() {
  const { address, isConnected } = useAccount();
  const [report, setReport] = useState<ProductionSafetyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || adminSecretTrimmed);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (adminSecretTrimmed) {
      headers['x-admin-secret'] = adminSecretTrimmed;
      return headers;
    }
    if (address) {
      headers['x-moderator-wallet'] = address;
      return headers;
    }
    return headers;
  }, [address, adminSecretTrimmed]);

  const loadReport = useCallback(async () => {
    if (!hasAdminAuth) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/production-safety', {
        headers: adminAuthHeaders,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.hint || payload.error || 'Unable to load production safety report');
      }

      setReport(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load production safety report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [adminAuthHeaders, hasAdminAuth]);

  useEffect(() => {
    if (!hasAdminAuth) return;
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/production-safety', {
          headers: adminAuthHeaders,
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.hint || payload.error || 'Unable to load production safety report');
        }

        if (!cancelled) {
          setReport(payload.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load production safety report');
          setReport(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [adminAuthHeaders, hasAdminAuth]);

  const statusCopy = useMemo(() => {
    if (!report) return 'Connect a moderator wallet or enter the admin secret to scan production safety.';
    if (report.summary.blockers > 0) return 'Production is blocked until these items are fixed.';
    if (report.summary.warnings > 0) return 'Production can run, but watch these risks closely.';
    return 'Production safety checks are clean.';
  }, [report]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] px-4 py-10 text-white sm:px-6 lg:px-10">
      <LiquidBackground />
      <GradualBlurOverlay />

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              Back to admin
            </Link>
            <p className="text-xs font-black uppercase tracking-[0.36em] text-purple-200/70">
              Launch control
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-[-0.04em] sm:text-6xl">
              Production <span className="text-yellow-300">Safety</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-bold text-white/55 sm:text-base">
              A no-vibes preflight for the pieces that can hurt trust: RLS, cron, money queues, secrets,
              storage, alerts, and settlement readiness.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-3 text-yellow-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                  Current read
                </p>
                <p className="max-w-xs text-sm font-black text-white">{statusCopy}</p>
              </div>
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-6 text-sm font-bold text-yellow-100">
            Connect and sign in with a moderator wallet, or paste the admin secret below to run the safety check.
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
          </label>
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={!hasAdminAuth || loading}
            className="rounded-2xl border border-yellow-300/35 bg-yellow-300 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_8px_0_rgba(118,74,0,0.8)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Rescan
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-sm font-black uppercase tracking-[0.22em] text-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-300" />
            Scanning production safety
          </div>
        )}

        {error && (
          <div className="rounded-[2rem] border border-red-400/30 bg-red-500/10 p-6 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {report && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-[1.75rem] border border-red-400/25 bg-red-500/10 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-100/60">Blockers</p>
                <p className="mt-2 text-4xl font-black">{report.summary.blockers}</p>
              </div>
              <div className="rounded-[1.75rem] border border-yellow-300/25 bg-yellow-500/10 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/60">Warnings</p>
                <p className="mt-2 text-4xl font-black">{report.summary.warnings}</p>
              </div>
              <div className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-500/10 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/60">Passes</p>
                <p className="mt-2 text-4xl font-black">{report.summary.passes}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">Runtime</p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.12em] text-white/80">
                  {report.environment.network || 'unknown'}
                </p>
                <p className="mt-1 text-xs font-bold text-white/45">
                  Simulation {report.environment.simulationMode ? 'on' : 'off'}
                </p>
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-white/10 bg-[#070712]/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_120px_rgba(0,0,0,0.55)] sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <h2 className="text-lg font-black uppercase tracking-[0.2em]">Safety checks</h2>
                <p className="text-xs font-bold text-white/40">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
              </div>

              <div className="grid gap-3">
                {report.checks.map((check) => (
                  <article
                    key={check.id}
                    className={`rounded-[1.5rem] border p-4 ${severityClasses(check.severity)}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="rounded-full border border-current/25 bg-black/20 p-2">
                          {severityIcon(check.severity)}
                        </span>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-60">
                            {severityLabel(check.severity)}
                          </p>
                          <h3 className="text-base font-black">{check.label}</h3>
                        </div>
                      </div>
                      <span className="rounded-full border border-current/20 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                        {check.id}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-bold leading-relaxed opacity-80">{check.detail}</p>
                    {check.nextAction && (
                      <p className="mt-3 rounded-2xl border border-current/15 bg-black/20 p-3 text-xs font-bold leading-relaxed opacity-80">
                        Next: {check.nextAction}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
