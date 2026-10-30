"use client";
import { useEffect, useState } from "react";
type Report = {
  metrics: Record<string, number | null>;
  unavailable: string[];
  since: string;
};
export default function MomentGrowthPanel({
  enabled,
  days,
  headers,
}: {
  enabled: boolean;
  days: number;
  headers: Record<string, string>;
}) {
  const [report, setReport] = useState<Report>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const reset = setTimeout(() => {
      setReport(undefined);
      setError("");
    }, 0);
    const controller = new AbortController();
    const deadline = setTimeout(() => {
      controller.abort();
      setError("Growth records timed out. Retry.");
    }, 10000);
    void fetch("/api/admin/moment-growth?days=" + days, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok || !b.success) throw Error();
        if (!controller.signal.aborted) setReport(b.data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Growth records unavailable. No totals inferred.");
      })
      .finally(() => clearTimeout(deadline));
    return () => {
      clearTimeout(reset);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [enabled, days, headers, retry]);
  if (!enabled) return null;
  return (
    <section className="bd-surface p-5">
      <h2 className="text-2xl font-black">Participation → next participant</h2>
      <p className="mt-3 text-sm leading-6 text-white/60">
        Existing attribution and moderation records, over the selected window.
        Guest activity is self-reported. A journey is a browser record, not a
        unique person. No social view or revenue claim comes from a link.
      </p>
      {report ? (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(report.metrics).map(([label, value]) => (
              <div key={label} className="bd-well p-4">
                <dt className="text-sm text-white/60">{label}</dt>
                <dd className="mt-2 text-2xl font-black text-amber-100">
                  {value === null ? "Unavailable" : value.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-6 text-white/50">
            Unavailable: {report.unavailable.join(" · ")}.
          </p>
        </>
      ) : (
        <p role="status" className="mt-4 text-sm text-amber-100">
          {error || "Reading growth records…"}
        </p>
      )}
      {error ? (
        <button
          className="bd-action mt-3 min-h-11 !text-sm"
          onClick={() => setRetry((n) => n + 1)}
        >
          Retry
        </button>
      ) : null}
    </section>
  );
}
