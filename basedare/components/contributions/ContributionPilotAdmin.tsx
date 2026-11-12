"use client";

import { useRef, useState, type FormEvent } from "react";
import { ACTIVITY_SUGGESTIONS } from "@/lib/home-activities";
import {
  PILOT_NOTICE,
  type PilotAdminSnapshot,
  type PilotCommand,
  type PilotSourceKind,
} from "@/lib/contribution-pilot";

const inputClass =
  "mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f5c518]";
const buttonClass =
  "min-h-11 rounded-xl border border-white/20 px-3 py-2 text-sm text-white hover:border-[#f5c518] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f5c518] disabled:cursor-not-allowed disabled:opacity-40";

export default function ContributionPilotAdmin({
  headers,
  authenticate,
}: {
  headers: Record<string, string>;
  authenticate: () => Promise<boolean>;
}) {
  const scope = JSON.stringify(headers);
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    data: PilotAdminSnapshot;
  } | null>(null);
  const report = snapshot?.scope === scope ? snapshot.data : null;
  const [feedback, setFeedback] = useState<{
    scope: string;
    text: string;
    error: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const requestSequence = useRef(0);
  const [campaignId, setCampaignId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [venueId, setVenueId] = useState("");
  const [activityIds, setActivityIds] = useState<string[]>(["three-details"]);
  const [visitXp, setVisitXp] = useState(0);
  const [creationXp, setCreationXp] = useState(10);
  const [cap, setCap] = useState(100);
  const [sourceKind, setSourceKind] =
    useState<PilotSourceKind>("REVIEWED_CREATION");
  const [sourceId, setSourceId] = useState("");
  const [consent, setConsent] = useState(false);
  const [awardId, setAwardId] = useState("");
  const [reason, setReason] = useState("");

  async function load(sequence: number) {
    const response = await fetch("/api/admin/contribution-pilot", {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    if (!response.ok || !body.success)
      throw Error(body.hint || body.error || "Campaigns could not load.");
    if (sequence === requestSequence.current)
      setSnapshot({ scope, data: body.data });
  }
  async function run(command?: PilotCommand) {
    const sequence = ++requestSequence.current;
    setBusy(true);
    setFeedback(null);
    setSnapshot(null);
    let confirmedMessage: string | null = null;
    try {
      if (!(await authenticate()))
        throw Error("Admin authorization is required.");
      if (command) {
        const response = await fetch("/api/admin/contribution-pilot", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(command),
          signal: AbortSignal.timeout(15000),
        });
        const body = await response.json();
        if (!response.ok || !body.success)
          throw Error(body.error || "The change could not be saved.");
        if (sequence !== requestSequence.current) return;
        if (body.data.campaignId) setCampaignId(body.data.campaignId);
        confirmedMessage = body.data.duplicate
          ? command.action === "create"
            ? `This campaign already exists (${body.data.status}). No new draft was created.`
            : "Already recorded. No duplicate change was made."
          : "Saved. The campaign and evidence rules still apply.";
        setFeedback({
          scope,
          text: confirmedMessage,
          error: false,
        });
      }
      await load(sequence);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setSnapshot(null);
      setFeedback({
        scope,
        text: confirmedMessage
          ? `${confirmedMessage} The follow-up refresh failed. Reload campaigns before another change.`
          : error instanceof Error
              ? error.message
              : "Please retry. No success is inferred.",
        error: true,
      });
    } finally {
      if (sequence === requestSequence.current) setBusy(false);
    }
  }
  function create(event: FormEvent) {
    event.preventDefault();
    try {
      void run({
        action: "create",
        policy: {
          version: 1,
          title,
          description,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          venueId: venueId.trim() || null,
          activityIds,
          xp: {
            venueVisit: visitXp,
            reviewedCreation: creationXp,
            maxPerPerson: cap,
          },
        },
      });
    } catch {
      setFeedback({
        scope,
        text: "Choose a valid start and end date.",
        error: true,
      });
    }
  }

  return (
    <details className="min-w-0 rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
      <summary className="cursor-pointer text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f5c518]">
        Contribution pilot · non-cash XP
      </summary>
      <div className="mt-4 space-y-5">
        <p className="text-sm text-white/65">
          {PILOT_NOTICE} Drafts do not publish a campaign. A live pilot needs a
          separately enabled operating flag and reviewed eligibility.
        </p>
        <button
          className={buttonClass}
          disabled={busy}
          onClick={() => void run()}
        >
          {busy ? "Working…" : "Load campaigns"}
        </button>
        {feedback?.scope === scope && (
          <p
            role={feedback.error ? "alert" : "status"}
            className={
              feedback.error ? "text-sm text-red-300" : "text-sm text-[#f5c518]"
            }
          >
            {feedback.text}
          </p>
        )}
        {report && (
          <p className="text-sm text-white/60">
            Pilot{" "}
            {report.enabled
              ? "enabled"
              : "disabled — activation and awards are unavailable"}
            . Drafts, pause, close and reversals remain available.
          </p>
        )}
        <details className="rounded-xl border border-white/10 p-3">
          <summary className="cursor-pointer font-semibold">
            Create an immutable policy draft
          </summary>
          <form onSubmit={create} className="mt-3 space-y-3">
            <label className="block text-sm">
              Title
              <input
                required
                minLength={5}
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              What participants should understand
              <textarea
                required
                minLength={10}
                maxLength={600}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </label>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="block min-w-0 text-sm">
                Genuine start · your local time
                <input
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block min-w-0 text-sm">
                Genuine end · your local time
                <input
                  type="datetime-local"
                  required
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block text-sm">
              Canonical venue ID · optional unless visit XP is offered
              <input
                maxLength={191}
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className={inputClass}
              />
            </label>
            <fieldset>
              <legend className="text-sm">Eligible authored activities</legend>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {ACTIVITY_SUGGESTIONS.map((activity) => (
                  <label
                    key={activity.id}
                    className="flex min-h-11 items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={activityIds.includes(activity.id)}
                      onChange={(e) =>
                        setActivityIds((old) =>
                          e.target.checked
                            ? [...old, activity.id]
                            : old.filter((id) => id !== activity.id)
                        )
                      }
                    />
                    {activity.title}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                QR + GPS visit XP
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={visitXp}
                  onChange={(e) => setVisitXp(Number(e.target.value))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm">
                Reviewed creation XP
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={creationXp}
                  onChange={(e) => setCreationXp(Number(e.target.value))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm">
                Lifetime campaign XP cap
                <input
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={cap}
                  onChange={(e) => setCap(Number(e.target.value))}
                  className={inputClass}
                />
              </label>
            </div>
            <p className="text-xs text-white/60">
              One visit per place and one reviewed creation per activity in a
              campaign. Evidence is recognized only once across pilots.
              Reversals do not reset limits. Creation review never verifies
              attendance. To change a policy, create a new draft.
            </p>
            <button className={buttonClass} disabled={busy}>
              Save draft
            </button>
          </form>
        </details>
        {report && (
          <>
            {report.campaignsLimited && (
              <p className="text-sm text-amber-300">
                Only the latest 50 campaigns are shown. Historical totals are
                unavailable.
              </p>
            )}
            {!report.campaigns.length && (
              <p className="text-sm text-white/60">
                No campaign drafts were found.
              </p>
            )}
            <div className="space-y-3">
              {report.campaigns.map((c) => (
                <article
                  key={c.id}
                  className="min-w-0 rounded-xl border border-white/10 p-3"
                >
                  <h3 className="break-words font-semibold">
                    {c.policy.title} · {c.status}
                  </h3>
                  <p className="mt-1 break-all text-xs text-white/55">{c.id}</p>
                  <p className="mt-2 text-sm text-white/70">
                    {c.policy.description}
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    {c.policy.startsAt} → {c.policy.endsAt}. Policy v
                    {c.policy.version}; visit {c.policy.xp.venueVisit} XP;
                    creation {c.policy.xp.reviewedCreation} XP; cap{" "}
                    {c.policy.xp.maxPerPerson} XP.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className={buttonClass}
                      disabled={
                        busy ||
                        !report.enabled ||
                        c.status === "CLOSED" ||
                        c.status === "ACTIVE"
                      }
                      onClick={() =>
                        void run({ action: "activate", campaignId: c.id })
                      }
                    >
                      Activate
                    </button>
                    <button
                      className={buttonClass}
                      disabled={
                        busy || c.status === "CLOSED" || c.status === "PAUSED"
                      }
                      onClick={() =>
                        void run({ action: "pause", campaignId: c.id })
                      }
                    >
                      Pause
                    </button>
                    <button
                      className={buttonClass}
                      disabled={busy || c.status === "CLOSED"}
                      onClick={() =>
                        void run({ action: "close", campaignId: c.id })
                      }
                    >
                      Close permanently
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <form
              className="space-y-3 rounded-xl border border-white/10 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void run({
                  action: "award",
                  campaignId,
                  sourceKind,
                  sourceId: sourceId.trim(),
                  publicLeaderboardConsent: consent,
                });
              }}
            >
              <h3 className="font-semibold">Approve existing evidence</h3>
              <p className="text-xs text-white/60">
                Use an existing reviewed source. Participant and XP are derived
                on the server. This does not upload or publish proof.
              </p>
              <label className="block text-sm">
                Campaign
                <select
                  required
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose a campaign</option>
                  {report.campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.policy.title} · {c.status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Evidence type
                <select
                  value={sourceKind}
                  onChange={(e) =>
                    setSourceKind(e.target.value as PilotSourceKind)
                  }
                  className={inputClass}
                >
                  <option value="REVIEWED_CREATION">
                    Approved creation · not attendance
                  </option>
                  <option value="VENUE_CHECK_IN">
                    Confirmed QR + GPS venue visit
                  </option>
                </select>
              </label>
              <label className="block text-sm">
                Existing source ID
                <input
                  required
                  maxLength={191}
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex min-h-11 items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I have recorded this participant’s explicit permission to show
                their public name and campaign XP in the leaderboard. Leave
                unchecked for private recognition.
              </label>
              <button
                className={buttonClass}
                disabled={busy || !report.enabled}
              >
                Approve eligible contribution
              </button>
            </form>
            <form
              className="space-y-3 rounded-xl border border-white/10 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void run({ action: "reverse", awardId, reason });
              }}
            >
              <h3 className="font-semibold">Inspect and reverse</h3>
              {report.awardsLimited && (
                <p className="text-sm text-amber-300">
                  Only the latest 100 awards are shown. Totals are unknown.
                </p>
              )}
              <label className="block text-sm">
                Existing award
                <select
                  required
                  value={awardId}
                  onChange={(e) => setAwardId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose an award</option>
                  {report.awards.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} · {a.xp} XP ·{" "}
                      {a.reversed
                        ? "reversed"
                        : a.current
                        ? "current evidence"
                        : "evidence no longer eligible"}
                    </option>
                  ))}
                </select>
              </label>
              {report.awards
                .filter((a) => a.id === awardId)
                .map((a) => (
                  <p key={a.id} className="break-all text-xs text-white/60">
                    {a.label} · source {a.sourceId}. Leaderboard consent:{" "}
                    {a.leaderboardConsentWithdrawn
                      ? "withdrawn for this participant and campaign"
                      : a.publicLeaderboardConsent
                      ? "attested"
                      : "not granted"}
                    . A reversal is terminal and preserves the original record.
                  </p>
                ))}
              <label className="block text-sm">
                Reason
                <input
                  required
                  minLength={5}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={inputClass}
                />
              </label>
              <button className={buttonClass} disabled={busy}>
                Record compensating reversal
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={busy || !awardId || reason.trim().length < 5}
                onClick={() =>
                  void run({
                    action: "withdrawLeaderboardConsent",
                    awardId,
                    reason,
                  })
                }
              >
                Hide participant from this campaign’s leaderboard
              </button>
              <p className="text-xs text-white/60">
                Leaderboard withdrawal retains XP and audit history, hides all
                this participant’s campaign scores, and cannot be undone in this
                pilot. A named support route for requesting withdrawal is
                required before activation; this panel does not provide
                self-service opt-out.
              </p>
            </form>
          </>
        )}
      </div>
    </details>
  );
}
