"use client";
import { useState } from "react";
import { useSocialAction } from "@/hooks/useSocialAction";
export default function MomentReport({ id }: { id: string }) {
  const { wallet, headers } = useSocialAction();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details className="mt-5 text-sm text-white/60">
      <summary className="min-h-11 cursor-pointer py-3">
        Report a problem
      </summary>
      <p className="leading-6">
        Removed post, wrong challenge, privacy or permission issue? Reporting
        hides the Moment pending review.
      </p>
      {wallet ? (
        <form
          className="mt-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const reason = new FormData(e.currentTarget).get("reason");
            setBusy(true);
            setMessage("");
            try {
              const r = await fetch(`/api/adventure-submissions/${id}/report`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(await headers("adventure:report")),
                },
                body: JSON.stringify({ wallet, reason }),
                signal: AbortSignal.timeout(8000),
              });
              if (!r.ok) throw Error();
              const result = await r.json();
              setMessage(result.hidden ? "Report saved. This Moment is hidden until reviewed." : "Your earlier report is recorded, or the Moment is already unavailable. Contact support if the problem persists.");
            } catch {
              setMessage(
                "Report unavailable. Please retry or contact support.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            What needs checking?
            <textarea
              required
              name="reason"
              minLength={5}
              maxLength={300}
              className="mt-2 min-h-24 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-base"
              placeholder="Leave out private contact details."
            />
          </label>
          <button disabled={busy} className="bd-action mt-3 min-h-12 !text-sm">
            {busy ? "Sending…" : "Send report"}
          </button>
        </form>
      ) : (
        <button
          className="min-h-12 text-cyan-100 underline"
          onClick={() => window.dispatchEvent(new Event("basedare:sign-in"))}
        >
          Sign in to report
        </button>
      )}
      {message ? (
        <p role="status" className="mt-3 text-amber-100">
          {message}
        </p>
      ) : null}
    </details>
  );
}
