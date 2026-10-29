"use client";
import { useState } from "react";
import { ACTIVITY_SUGGESTIONS } from "@/lib/home-activities";
const fields = [
  ["sponsor", "Sponsor / business"],
  ["objective", "Objective"],
  ["audience", "Eligible creator audience"],
  ["deliverable", "Original deliverable"],
  ["evidencePolicy", "Evidence policy"],
  ["reviewCriteria", "Review criteria"],
  ["rightsTerms", "Proposed publication & rights terms"],
] as const;
export default function SponsoredBriefDraft({
  authenticate,
  authHeaders,
  authScope,
}: {
  authenticate: () => Promise<boolean>;
  authHeaders: Record<string, string>;
  authScope: string;
}) {
  const [saved, setSaved] = useState<{
    scope: string;
    rows: {
      id: string;
      title: string | null;
      metadataJson: Record<string, unknown>;
    }[];
  }>();
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details className="bd-surface mt-6 p-5">
      <summary className="min-h-12 cursor-pointer py-3 text-lg font-black">
        Sponsor campaign brief · private draft
      </summary>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
        Prepare a proposal alongside existing campaign intake. No advertising,
        creator commitment, rights acceptance, funding or payment is created.
        View and action rewards remain future designs.
      </p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setBusy(true);
          setMessage("");
          const body = Object.fromEntries(form.entries());
          try {
            if (!(await authenticate()))
              throw Error("Use the existing admin sign-in first.");
            const r = await fetch("/api/admin/sponsored-briefs", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders },
              body: JSON.stringify({
                ...body,
                requestId,
                platforms: form.getAll("platforms"),
                proposedBudgetUsd: Number(body.proposedBudgetUsd),
                proposedPerCreatorUsd: Number(body.proposedPerCreatorUsd),
                creatorCap: Number(body.creatorCap),
                postCap: Number(body.postCap),
              }),
              signal: AbortSignal.timeout(10000),
            });
            const b = await r.json();
            if (!r.ok || !b.success) throw Error(b.error || "Save failed.");
            setMessage(
              "Private draft saved in the founder intake ledger. Funding: not funded. Publication: private. No liability created.",
            );
            setRequestId(crypto.randomUUID());
          } catch (e) {
            setMessage(
              e instanceof Error ? e.message : "Could not save draft.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {fields.map(([name, label]) => (
          <label key={name} className="text-sm">
            {label}
            <textarea
              required
              minLength={name === "sponsor" ? 2 : name === "audience" ? 3 : 5}
              maxLength={
                name === "rightsTerms"
                  ? 800
                  : name === "sponsor"
                    ? 140
                    : name === "objective" || name === "audience"
                      ? 400
                      : 600
              }
              name={name}
              className="mt-2 min-h-24 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-base"
            />
          </label>
        ))}
        <label className="text-sm">
          Canonical challenge
          <select
            required
            name="activityId"
            className="mt-2 min-h-12 w-full rounded-xl bg-black p-3"
          >
            {ACTIVITY_SUGGESTIONS.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Genuine venue slug · optional
          <input
            name="venueSlug"
            maxLength={180}
            className="mt-2 min-h-12 w-full rounded-xl bg-black/30 p-3 text-base"
          />
        </label>
        <label className="text-sm">
          Existing draft Campaign ID · optional
          <input
            name="campaignId"
            maxLength={80}
            className="mt-2 min-h-12 w-full rounded-xl bg-black/30 p-3 text-base"
          />
        </label>
        <label className="text-sm">
          Proposed model
          <select
            name="model"
            className="mt-2 min-h-12 w-full rounded-xl bg-black p-3"
          >
            <option value="FIXED_DELIVERABLE">
              Fixed original deliverable
            </option>
            <option value="FUTURE_VERIFIED_VIEWS">
              Verified views · future only
            </option>
            <option value="FUTURE_QUALIFIED_ACTION">
              Qualified action · future only
            </option>
            <option value="VENUE_PERK">
              Venue perk · authorization required
            </option>
          </select>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm">Platforms</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {["TIKTOK", "INSTAGRAM", "X", "ORIGINAL_MEDIA"].map((platform) => (
              <label
                key={platform}
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="platforms"
                  value={platform}
                  defaultChecked={platform === "ORIGINAL_MEDIA"}
                />
                {platform.replace("_", " ")}
              </label>
            ))}
          </div>
        </fieldset>
        {[
          ["startsOn", "Start date"],
          ["endsOn", "End date"],
        ].map(([name, label]) => (
          <label key={name} className="text-sm">
            {label}
            <input
              type="date"
              name={name}
              required
              className="mt-2 min-h-12 w-full rounded-xl bg-black/30 p-3"
            />
          </label>
        ))}
        {[
          ["proposedBudgetUsd", "Proposed total budget USD", 0, 1000000],
          ["proposedPerCreatorUsd", "Proposed per-creator USD", 0, 100000],
          ["creatorCap", "Creator cap", 1, 1000],
          ["postCap", "Post cap", 1, 10000],
        ].map(([name, label, min, max]) => (
          <label key={name} className="text-sm">
            {label}
            <input
              type="number"
              name={String(name)}
              required
              min={Number(min)}
              max={Number(max)}
              step={String(name).includes("Usd") ? ".01" : "1"}
              defaultValue={Number(min)}
              className="mt-2 min-h-12 w-full rounded-xl bg-black/30 p-3 text-base"
            />
          </label>
        ))}
        <button disabled={busy} className="bd-action min-h-12 !text-sm">
          {busy ? "Saving…" : "Save private draft"}
        </button>
        <p
          role="status"
          className="text-sm leading-6 text-amber-100 sm:col-span-2"
        >
          {message}
        </p>
      </form>
      <div className="mt-6 border-t border-white/10 pt-4">
        <button
          disabled={busy}
          className="bd-action min-h-12 !text-sm"
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              if (!(await authenticate()))
                throw Error("Use the existing admin sign-in first.");
              const r = await fetch("/api/admin/sponsored-briefs", {
                headers: authHeaders,
                cache: "no-store",
                signal: AbortSignal.timeout(10000),
              });
              const b = await r.json();
              if (!r.ok || !b.success) throw Error("Drafts unavailable.");
              setSaved({ scope: authScope === "signed-out" ? "admin-session" : authScope, rows: b.data });
              if (!b.data.length) setMessage("No saved sponsor proposals.");
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Could not load drafts.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Load saved private drafts
        </button>
        {saved?.scope === authScope && authScope !== "signed-out"
          ? saved.rows.map((row) => (
              <details key={row.id} className="bd-well mt-4 p-4">
                <summary className="min-h-11 cursor-pointer py-2 font-bold">
                  {row.title}
                </summary>
                <p className="mt-2 text-sm leading-6 text-amber-100">
                  Private draft · Not funded · Rights proposed only · Payments
                  disabled
                </p>
                <dl className="mt-4 space-y-3">
                  {[
                    "objective",
                    "activityId",
                    "venueSlug",
                    "campaignId",
                    "audience",
                    "deliverable",
                    "platforms",
                    "evidencePolicy",
                    "reviewCriteria",
                    "rightsTerms",
                    "startsOn",
                    "endsOn",
                    "model",
                    "proposedBudgetUsd",
                    "proposedPerCreatorUsd",
                    "creatorCap",
                    "postCap",
                  ]
                    .filter(
                      (key) =>
                        row.metadataJson[key] !== undefined &&
                        row.metadataJson[key] !== "",
                    )
                    .map((key) => (
                      <div key={key}>
                        <dt className="text-xs text-white/50">
                          {key.replace(/([A-Z])/g, " $1")}
                        </dt>
                        <dd className="mt-1 break-words whitespace-pre-wrap text-sm leading-6">
                          {Array.isArray(row.metadataJson[key])
                            ? (row.metadataJson[key] as unknown[]).join(", ")
                            : String(row.metadataJson[key])}
                        </dd>
                      </div>
                    ))}
                </dl>
              </details>
            ))
          : null}
      </div>
    </details>
  );
}
