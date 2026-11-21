"use client";
import { useEffect, useRef, useState } from "react";
import { RETENTION_TOPICS, type RetentionTopic } from "@/lib/retention-policy";
type Report = {
  enabled: boolean;
  sendingEnabled: boolean;
  contacts: Record<string, number>;
  sends: Record<string, number>;
  candidates: { id: string; topics: RetentionTopic[] }[];
  moreCandidates: boolean;
  note: string;
};
export default function RetentionStatus({
  headers,
}: {
  headers: Record<string, string>;
}) {
  const [report, setReport] = useState<Report>(),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [topic, setTopic] = useState<RetentionTopic>("challenges"),
    [selected, setSelected] = useState<string[]>([]),
    [campaign, setCampaign] = useState(""),
    [subject, setSubject] = useState(""),
    [copy, setCopy] = useState(""),
    [href, setHref] = useState("/adventures"),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState("");
  const owner = useRef(headers);
  owner.current = headers;
  useEffect(() => {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 10000);
    void fetch("/api/admin/retention", {
      headers,
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok || !b.success) throw Error();
        if (!controller.signal.aborted) {
          setReport(b.data);
          setError("");
        }
      })
      .catch(() => setError("Email status unavailable. No totals inferred."))
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [headers, retry]);
  const eligible =
    report?.candidates.filter(
      (c) => Array.isArray(c.topics) && c.topics.includes(topic)
    ) ?? [];
  const field = "bd-field mt-1 min-h-11 w-full rounded-xl p-3 text-sm";
  async function send() {
    const requestOwner = headers;
    setBusy(true);
    setReceipt("");
    setError("");
    try {
      const response = await fetch("/api/admin/retention", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign,
          topic,
          contactIds: selected,
          subject,
          text: copy,
          href,
          reviewed,
        }),
        signal: AbortSignal.timeout(45000),
      });
      const payload = await response.json();
      if (owner.current !== requestOwner) return;
      if (!response.ok || !payload.success)
        throw Error(payload.error || "Check the ledger before retrying.");
      const counts: Record<string, number> = {};
      for (const r of payload.data) {
        counts[r.status] = (counts[r.status] ?? 0) + 1;
      }
      setReceipt(
        Object.entries(counts)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ")
      );
      setReviewed(false);
      setSelected([]);
      setRetry((n) => n + 1);
    } catch (e) {
      if (owner.current === requestOwner)
        setError(
          e instanceof Error ? e.message : "Check the ledger before retrying."
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="bd-well mt-6 p-5">
      <h3 className="text-xl font-black">
        Get your next dare · email readiness
      </h3>
      {report ? (
        <>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Opt-in:{" "}
            {report.enabled ? "Enabled by operator configuration" : "Off"} ·
            Reviewed sends:{" "}
            {report.sendingEnabled
              ? "Enabled by operator configuration"
              : "Off"}
            . Provider/domain and real inbox acceptance are separate operating
            checks.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ["Contact consent records", report.contacts],
              ["Email records · last 30 days", report.sends],
            ].map(([label, counts]) => (
              <div key={String(label)}>
                <p className="font-bold">{String(label)}</p>
                {Object.entries(counts as Record<string, number>).length ? (
                  Object.entries(counts as Record<string, number>).map(
                    ([k, n]) => (
                      <p className="mt-2 text-sm text-white/65" key={k}>
                        {k}: {n}
                      </p>
                    )
                  )
                ) : (
                  <p className="mt-2 text-sm text-white/65">No records.</p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-white/60">{report.note}</p>
          <details className="mt-4 border-t border-white/10 pt-4">
            <summary className="cursor-pointer font-bold">
              Prepare one consented return update
            </summary>
            <p className="mt-2 text-sm text-white/60">
              Maximum ten selected confirmed contacts. No automatic sending.
              Review the exact copy and destination; previously suppressed
              contacts cannot receive an update.
            </p>
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <label className="block text-sm">
                Topic
                <select
                  className={field}
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value as RetentionTopic);
                    setSelected([]);
                    setReviewed(false);
                  }}
                >
                  {Object.entries(RETENTION_TOPICS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="text-sm font-bold">
                  Eligible confirmed records ({selected.length}/10 selected)
                </legend>
                {eligible.length ? (
                  eligible.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 py-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(c.id)}
                        disabled={
                          !selected.includes(c.id) && selected.length >= 10
                        }
                        onChange={(e) => {
                          setSelected((s) =>
                            e.target.checked
                              ? [...s, c.id]
                              : s.filter((id) => id !== c.id)
                          );
                          setReviewed(false);
                        }}
                      />
                      Contact {c.id.slice(-8)}
                    </label>
                  ))
                ) : (
                  <p className="mt-2 text-sm text-white/60">
                    No confirmed records for this topic.
                  </p>
                )}
                {report.moreCandidates && (
                  <p className="text-xs text-white/55">
                    Showing a bounded selection of confirmed contacts.
                  </p>
                )}
              </fieldset>
              {(
                [
                  ["Campaign reference", campaign, setCampaign],
                  ["Subject", subject, setSubject],
                  ["BaseDare destination path", href, setHref],
                ] as const
              ).map(([label, value, set]) => (
                <label key={label} className="block text-sm">
                  {label}
                  <input
                    className={field}
                    required
                    value={value}
                    onChange={(e) => {
                      set(e.target.value);
                      setReviewed(false);
                    }}
                  />
                </label>
              ))}
              <label className="block text-sm">
                Message
                <textarea
                  className={field}
                  value={copy}
                  required
                  minLength={10}
                  maxLength={2000}
                  onChange={(e) => {
                    setCopy(e.target.value);
                    setReviewed(false);
                  }}
                />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                I reviewed the exact message, destination, topic, and selected
                consenting records.
              </label>
              <button
                className="bd-action min-h-11"
                disabled={
                  busy ||
                  !report.sendingEnabled ||
                  !reviewed ||
                  !selected.length
                }
                type="submit"
              >
                {busy
                  ? "Checking provider receipts…"
                  : report.sendingEnabled
                  ? "Send reviewed update"
                  : "Sending disabled"}
              </button>
            </form>
            {receipt && (
              <p role="status" className="mt-3 text-sm text-emerald-100">
                {receipt} · provider records, not inbox opens.
              </p>
            )}
          </details>
        </>
      ) : (
        <p role="status" className="mt-3 text-sm text-white/65">
          {error || "Reading email readiness…"}
        </p>
      )}
      {error ? (
        <>
          <p role="alert" className="mt-2 text-sm text-amber-100">
            {error}
          </p>
          <button
            className="bd-action mt-3 min-h-11 !text-sm"
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry email status
          </button>
        </>
      ) : null}
    </section>
  );
}
