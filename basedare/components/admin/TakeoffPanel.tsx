"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ACCEPTANCE_CHECKS, type TakeoffPilot } from "@/lib/takeoff-pilot";
import type { takeoffReport } from "@/lib/takeoff-server";

type Report = Awaited<ReturnType<typeof takeoffReport>>;
const field = "bd-field mt-1 w-full min-h-11 rounded-xl p-3 text-sm";
const dateDefault = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const newPilot = (): TakeoffPilot => ({
  revision: 0,
  owner: "",
  reviewer: "",
  supportEmail: "basedarebear@gmail.com",
  startsAt: dateDefault(1) + "T00:00:00.000Z",
  endsAt: dateDefault(15) + "T00:00:00.000Z",
  targetHosts: 3,
  targetCreators: 5,
  targetParticipants: 20,
  stopRule:
    "Pause on any consent, safety, payment or privacy failure; review moderation capacity daily.",
  activityIds: ["zero-peso-blockbuster", "one-minute-story"],
  hosts: [],
  creatorTags: [],
  creatorPermissionReference: "",
  trackingSlugs: [],
  businessEnquiryId: null,
  status: "DRAFT",
});
const metricLabels = {
  activeAccounts: "Active participating accounts",
  reviewedCreators: "Reviewed creators",
  qrVisitorAccounts: "Confirmed QR visitor accounts",
  actions: "Eligible action records",
  previousActiveAccounts: "Prior week accounts",
  returningAccounts: "Returned this week",
  returnRate: "Prior-week return rate",
} as const;
const links = [
  ["/admin/creator-attribution", "Tracked links and QR"],
  ["/admin/creator-drops", "Creator invitations"],
  ["/admin/adventures", "Review Moments"],
  ["/admin/local-signals", "Review local stories and plans"],
  ["/admin/activation-intakes", "Business proposals"],
  ["/admin/production-safety", "Payment and production safety"],
];

export default function TakeoffPanel({
  headers,
  enabled,
}: {
  headers: Record<string, string>;
  enabled: boolean;
}) {
  const [report, setReport] = useState<Report | null>(null),
    [pilot, setPilot] = useState<TakeoffPilot | null>(null),
    [message, setMessage] = useState(""),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false);
  const [check, setCheck] =
      useState<keyof typeof ACCEPTANCE_CHECKS>("ios_account"),
    [tester, setTester] = useState(""),
    [evidenceReference, setEvidenceReference] = useState(""),
    [result, setResult] = useState<"passed" | "failed">("passed");
  const current = useRef(headers);
  current.current = headers;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 25000);
    void fetch("/api/admin/takeoff", {
      headers,
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok || !b.success) throw Error();
        if (!controller.signal.aborted) {
          setReport(b.data);
          setPilot(
            b.data.pilot ? { ...newPilot(), ...b.data.pilot } : newPilot()
          );
          setMessage("");
        }
      })
      .catch(() => {
        if (
          !controller.signal.aborted ||
          controller.signal.reason?.name === "AbortError"
        ) {
          setMessage("Launch records unavailable. Retry.");
          setReport(null);
          setPilot(null);
        }
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort(new Error("Navigation"));
    };
  }, [headers, enabled, retry]);
  if (!enabled) return null;
  const update = (patch: Partial<TakeoffPilot>) =>
    setPilot((p) => p && { ...p, ...patch });
  async function save(action: "savePilot" | "acceptance", data: unknown) {
    const requestOwner = headers;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/takeoff", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
        signal: AbortSignal.timeout(15000),
      });
      const b = await r.json();
      if (current.current !== requestOwner) return;
      if (!r.ok || !b.success) throw Error(b.error || "Save not confirmed.");
      setRetry((n) => n + 1);
    } catch (e) {
      if (current.current === requestOwner)
        setMessage(e instanceof Error ? e.message : "Save not confirmed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="bd-surface min-w-0 space-y-5 p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-violet-200">
          Node001 · Launch desk
        </p>
        <h2 className="mt-2 text-2xl font-black">
          Build Siargao&apos;s participation loop
        </h2>
        <p className="mt-2 text-sm text-white/65">
          Plan the pilot, measure actual activity, and record controlled launch
          evidence. Targets and readiness records never publish a plan or
          activate a provider.
        </p>
      </div>
      <button
        className="bd-action min-h-11"
        onClick={() => setRetry((n) => n + 1)}
      >
        Refresh launch records
      </button>
      {message && (
        <p role="status" className="text-sm text-amber-100">
          {message}
        </p>
      )}
      {report && pilot ? (
        <>
          <div className="bd-well p-4">
            <h3 className="font-black">Weekly participation · all locations</h3>
            <p className="mt-2 text-xs text-white/60">
              {report.participation.window.previousStart.slice(0, 10)} to{" "}
              {report.participation.window.end.slice(0, 10)} · two completed
              Manila-time weeks
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Object.entries(report.participation.metrics).map(
                ([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs text-white/60">
                      {metricLabels[key as keyof typeof metricLabels]}
                    </dt>
                    <dd className="text-2xl font-black text-amber-100">
                      {value === null
                        ? "—"
                        : key === "returnRate"
                        ? `${Math.round(value * 100)}%`
                        : value.toLocaleString()}
                    </dd>
                  </div>
                )
              )}
            </dl>
            <p className="mt-3 text-xs text-white/60">
              {report.participation.note}
            </p>
          </div>
          <div className="bd-well p-4">
            <h3 className="font-black">Launch configuration</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(report.configuration).map(([k, v]) => (
                <p key={k} className="flex justify-between gap-3 text-sm">
                  <span className="break-all text-white/70">
                    {k.replace(/([A-Z])/g, " $1")}
                  </span>
                  <strong className={v ? "text-emerald-200" : "text-amber-200"}>
                    {v ? "Present / on" : "Off / missing"}
                  </strong>
                </p>
              ))}
            </div>
            <p className="mt-4 text-sm text-white/80">
              Paid dares:{" "}
              <strong>
                {report.payment.ready
                  ? "Configuration checks passed"
                  : "Blocked"}
              </strong>{" "}
              · {report.payment.reason ?? "Ready for separate rehearsal"}
            </p>
            <p className="mt-2 text-sm text-white/65">
              {report.payment.nextAction}
            </p>
          </div>
          <details className="bd-well p-4" open>
            <summary className="cursor-pointer font-black">
              Siargao pilot · {pilot.status.replaceAll("_", " ").toLowerCase()}
            </summary>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void save("savePilot", {
                  ...pilot,
                  creatorTags: pilot.creatorTags.filter(Boolean),
                  trackingSlugs: pilot.trackingSlugs.filter(Boolean),
                });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["owner", "Daily operator"],
                    ["reviewer", "Reviewer / backup"],
                    ["supportEmail", "Monitored support email"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-sm">
                    {label}
                    <input
                      className={field}
                      required
                      type={key === "supportEmail" ? "email" : "text"}
                      value={pilot[key]}
                      onChange={(e) => update({ [key]: e.target.value })}
                    />
                  </label>
                ))}
                {(["startsAt", "endsAt"] as const).map((key) => (
                  <label key={key} className="text-sm">
                    {key === "startsAt" ? "Start" : "End"} date (UTC)
                    <input
                      className={field}
                      type="date"
                      required
                      value={pilot[key].slice(0, 10)}
                      onChange={(e) =>
                        update({ [key]: e.target.value + "T00:00:00.000Z" })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["targetHosts", "Hosts"],
                    ["targetCreators", "Creators"],
                    ["targetParticipants", "Participants"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-xs">
                    Target {label}
                    <input
                      className={field}
                      type="number"
                      min={1}
                      max={
                        key === "targetHosts"
                          ? 10
                          : key === "targetCreators"
                          ? 20
                          : 100
                      }
                      value={pilot[key]}
                      required
                      onChange={(e) =>
                        update({ [key]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
              </div>
              <fieldset>
                <legend className="text-sm font-bold">
                  Available authored adventures
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {report.activities.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={pilot.activityIds.includes(a.id)}
                        onChange={(e) =>
                          update({
                            activityIds: e.target.checked
                              ? [...pilot.activityIds, a.id].slice(0, 5)
                              : pilot.activityIds.filter((id) => id !== a.id),
                          })
                        }
                      />
                      {a.title}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <p className="text-sm font-bold">
                  Host permissions · recorded {pilot.hosts.length} / target{" "}
                  {pilot.targetHosts}
                </p>
                {pilot.hosts.map((h, i) => (
                  <div
                    key={i}
                    className="mt-3 space-y-2 rounded-xl border border-white/10 p-3"
                  >
                    <label className="block text-xs">
                      Canonical venue slug
                      <input
                        className={field}
                        required
                        value={h.venueSlug}
                        onChange={(e) =>
                          update({
                            hosts: pilot.hosts.map((v, j) =>
                              j === i ? { ...v, venueSlug: e.target.value } : v
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="block text-xs">
                      Actual host permission reference
                      <input
                        className={field}
                        required
                        value={h.permissionReference}
                        onChange={(e) =>
                          update({
                            hosts: pilot.hosts.map((v, j) =>
                              j === i
                                ? { ...v, permissionReference: e.target.value }
                                : v
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="block text-xs">
                      Permission confirmation date (UTC)
                      <input
                        className={field}
                        type="date"
                        required
                        value={h.confirmedAt.slice(0, 10)}
                        onChange={(e) =>
                          update({
                            hosts: pilot.hosts.map((v, j) =>
                              j === i
                                ? {
                                    ...v,
                                    confirmedAt:
                                      e.target.value + "T00:00:00.000Z",
                                  }
                                : v
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="text-sm text-red-200"
                      onClick={() =>
                        update({ hosts: pilot.hosts.filter((_, j) => j !== i) })
                      }
                    >
                      Remove host record
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="bd-action mt-2 min-h-11"
                  disabled={pilot.hosts.length >= 10}
                  onClick={() =>
                    update({
                      hosts: [
                        ...pilot.hosts,
                        {
                          venueSlug: "",
                          permissionReference: "",
                          confirmedAt: new Date().toISOString(),
                        },
                      ],
                    })
                  }
                >
                  Add confirmed host
                </button>
              </div>
              <label className="block text-sm">
                Existing consenting creator tags (comma separated)
                <input
                  className={field}
                  value={pilot.creatorTags.join(",")}
                  onChange={(e) =>
                    update({
                      creatorTags: e.target.value
                        .split(",")
                        .map((t) => t.trim()),
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                Contributor permission reference
                <input
                  className={field}
                  value={pilot.creatorPermissionReference}
                  onChange={(e) =>
                    update({ creatorPermissionReference: e.target.value })
                  }
                />
              </label>
              <label className="block text-sm">
                Existing /go link slugs (comma separated)
                <input
                  className={field}
                  value={pilot.trackingSlugs.join(",")}
                  onChange={(e) =>
                    update({
                      trackingSlugs: e.target.value
                        .split(",")
                        .map((t) => t.trim()),
                    })
                  }
                  onBlur={(e) =>
                    update({
                      trackingSlugs: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                Existing business enquiry ID (optional)
                <input
                  className={field}
                  value={pilot.businessEnquiryId ?? ""}
                  onChange={(e) =>
                    update({ businessEnquiryId: e.target.value || null })
                  }
                />
              </label>
              <label className="block text-sm">
                Stop rule
                <textarea
                  className={field}
                  required
                  value={pilot.stopRule}
                  onChange={(e) => update({ stopRule: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                Operator review state
                <select
                  className={field}
                  value={pilot.status}
                  onChange={(e) =>
                    update({ status: e.target.value as TakeoffPilot["status"] })
                  }
                >
                  {["DRAFT", "READY_FOR_REVIEW", "PAUSED", "CLOSED"].map(
                    (v) => (
                      <option key={v} value={v}>
                        {v.toLowerCase().replaceAll("_", " ")}
                      </option>
                    )
                  )}
                </select>
              </label>
              <button
                disabled={busy}
                className="bd-action min-h-11"
                type="submit"
              >
                Save pilot record
              </button>
              <p className="text-xs text-white/55">
                Only genuine permission records. No public launch or financial
                commitment follows from this save.
              </p>
            </form>
          </details>
          <details className="bd-well p-4">
            <summary className="cursor-pointer font-black">
              Device, provider and payment acceptance
            </summary>
            <ul className="mt-3 space-y-3">
              {report.checks.map((c) => (
                <li key={c.id} className="text-sm">
                  <strong>{c.label}</strong>
                  <p className="text-white/60">
                    {c.result.replaceAll("_", " ")}{" "}
                    {c.current
                      ? "· current release / last 7 days"
                      : "· not current"}{" "}
                    {c.recordedAt ? `· ${c.recordedAt.slice(0, 10)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            {!report.acceptanceComplete && (
              <p className="text-sm text-amber-100">
                Record window exceeded; review history.
              </p>
            )}
            {report.releaseRevision ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save("acceptance", {
                    check,
                    result,
                    tester,
                    evidenceReference,
                    releaseRevision: report.releaseRevision,
                  });
                }}
              >
                <label className="block text-sm">
                  Test
                  <select
                    className={field}
                    value={check}
                    onChange={(e) => setCheck(e.target.value as typeof check)}
                  >
                    {Object.entries(ACCEPTANCE_CHECKS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Observed result
                  <select
                    className={field}
                    value={result}
                    onChange={(e) => setResult(e.target.value as typeof result)}
                  >
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>
                <label className="block text-sm">
                  Actual tester
                  <input
                    className={field}
                    value={tester}
                    required
                    onChange={(e) => setTester(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Private evidence reference (no secrets)
                  <input
                    className={field}
                    value={evidenceReference}
                    required
                    minLength={8}
                    onChange={(e) => setEvidenceReference(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="bd-action min-h-11"
                >
                  Record observed test
                </button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-white/60">
                Set the exact release revision before recording acceptance.
              </p>
            )}
          </details>
          <div className="flex flex-wrap gap-2">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm text-cyan-100"
              >
                {label} →
              </Link>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-white/65">
          {message || "Reading launch records…"}
        </p>
      )}
    </section>
  );
}
