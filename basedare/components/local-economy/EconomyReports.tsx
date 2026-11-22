"use client";
import { useState } from "react";
type Report = {
  id: string;
  title: string | null;
  subjectType: string | null;
  subjectId: string | null;
};
export default function EconomyReports() {
  const [reports, setReports] = useState<Report[]>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/local-economy", { cache: "no-store" });
      const b = await r.json();
      if (!r.ok || !b.success)
        throw Error(b.error || "Open an admin session first.");
      setReports(b.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unavailable.");
    } finally {
      setBusy(false);
    }
  }
  async function decide(reportId: string, decision: string, reason: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/local-economy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportId, decision, reason }),
      });
      const b = await r.json();
      if (!r.ok || !b.success) throw Error(b.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="bd-page-top mx-auto min-h-screen max-w-3xl px-4 pb-24 text-white">
      <h1 className="text-3xl font-black">Local network reports</h1>
      <p className="my-4 text-white/65">
        Use the existing admin session. Withdrawal removes subsequent public
        discovery and processing eligibility; history remains.
      </p>
      <button className="bd-action" disabled={busy} onClick={() => void load()}>
        Load / refresh reports
      </button>
      {error && (
        <p role="alert" className="my-4 text-rose-200">
          {error}
        </p>
      )}
      {reports?.length === 0 && <p className="my-6">No open reports.</p>}
      {reports?.map((r) => (
        <form
          key={r.id}
          className="bd-surface my-5 grid gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void decide(
              r.id,
              String(f.get("decision")),
              String(f.get("reason"))
            );
          }}
        >
          <p>
            {r.subjectType} · {r.title}
          </p>
          <a
            className="text-cyan-100"
            href={
              r.subjectType === "NODE"
                ? "/n/" + r.subjectId
                : r.subjectType === "SESSION"
                ? "/sessions/" + r.subjectId
                : "/local?opportunity=" + r.subjectId
            }
          >
            Review public item
          </a>
          <label>
            Decision
            <select name="decision" className="bd-field min-h-12 w-full p-3">
              <option value="DISMISS">Dismiss report</option>
              <option value="WITHDRAW">
                Withdraw item and linked active discovery
              </option>
            </select>
          </label>
          <label>
            Reason
            <textarea
              required
              minLength={3}
              maxLength={500}
              name="reason"
              className="bd-field min-h-12 w-full p-3"
            />
          </label>
          <button className="bd-action" disabled={busy}>
            Record decision
          </button>
        </form>
      ))}
    </main>
  );
}
