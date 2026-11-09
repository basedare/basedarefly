"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import { QR_DESTINATIONS } from "@/lib/discovery-qr";
import { ACTIVITY_SUGGESTIONS } from "@/lib/home-activities";

type Row = {
  id: string;
  slug: string;
  creatorCode: string;
  contentCode: string;
  campaignCode: string | null;
  active: boolean;
  permissionConfirmed: boolean;
  publicPath: string;
  title: string;
  host: string | null;
  destination: string | null;
  expiresAt: string | null;
  issue: string | null;
  printable: boolean;
  metrics: null | {
    entries: number;
    browserJourneys: number;
    landings: number | null;
    starts: number | null;
    selfReportedFinishes: number | null;
    shareActions: number | null;
    verifiedCompletions: number | null;
  };
};
type Report = {
  trackingReady: boolean;
  observation: unknown;
  links: Row[];
  note: string;
  hasMore: boolean;
  metricsAvailable: boolean;
};
const initial = {
  slug: "",
  creatorCode: "basedare",
  contentCode: "",
  campaignCode: "",
  placementPermissionConfirmed: false,
  discoveryQr: {
    kind: "ADVENTURE" as (typeof QR_DESTINATIONS)[number],
    key: "postcard",
    hostVenueSlug: "",
    expiresInDays: 30,
  },
};
const input =
  "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white";
export default function DiscoveryQrAdmin({
  headers,
  authenticate,
  periodDays,
}: {
  headers: Record<string, string>;
  authenticate: () => Promise<boolean>;
  periodDays: number;
}) {
  const [form, setForm] = useState(initial),
    [report, setReport] = useState<Report>(),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<string>();
  const alive = useRef(true);
  const loadVersion = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const r = await fetch(
        `/api/admin/creator-attribution?view=discovery-qr&periodDays=${periodDays}`,
        { headers, cache: "no-store", signal: AbortSignal.timeout(15000) },
      );
      const b = await r.json();
      if (!r.ok || !b.success)
        throw Error(b.error || "QR campaigns could not load.");
      if (alive.current && version === loadVersion.current) {
        setReport(b.data);
        setError("");
      }
    } catch (e) {
      if (alive.current && version === loadVersion.current) {
        setReport(undefined);
        setError(
          e instanceof Error ? e.message : "QR campaigns could not load.",
        );
      }
    }
  }, [headers, periodDays]);
  useEffect(() => {
    void load();
  }, [load]);
  async function mutate(body: unknown, method: "POST" | "PATCH") {
    if (!(await authenticate())) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/admin/creator-attribution", {
        method,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const b = await r.json();
      if (!r.ok || !b.success || !b.data?.id)
        throw Error(
          b.error || "The change was not confirmed. Refresh before retrying.",
        );
      if (!alive.current) return;
      setSelected(b.data.id);
      setNotice(
        method === "POST"
          ? "QR created paused. Confirm placement permission, review its destination, then activate."
          : "QR status confirmed.",
      );
      await load();
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const create = (e: FormEvent) => {
    e.preventDefault();
    void mutate({ ...form, campaignCode: form.campaignCode || null }, "POST");
  };
  const active = report?.links.find((row) => row.id === selected);
  return (
    <section
      className="mt-8 min-w-0 rounded-3xl border border-amber-200/20 bg-amber-200/[0.035] p-4 sm:p-6"
      aria-label="Discovery QR campaigns"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-200">
            Physical discovery
          </p>
          <h2 className="mt-2 text-2xl font-black">
            A QR that opens the right experience.
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="bd-action min-h-11"
        >
          Refresh QR campaigns
        </button>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
        Use one link per permitted placement. Guests can look around and start
        free adventures before signing in. These discovery stickers are separate
        from rotating check-in QR codes.
      </p>
      {error ? (
        <p className="mt-4 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-4 text-sm text-amber-100" role="status">
          {notice}
        </p>
      ) : null}
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        <form onSubmit={create} className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              ["slug", "creatorCode", "contentCode", "campaignCode"] as const
            ).map((field) => (
              <label key={field} className="text-sm text-white/75">
                {
                  {
                    slug: "Short link name",
                    creatorCode: "Ambassador Baretag",
                    contentCode: "Placement code",
                    campaignCode: "Campaign (optional)",
                  }[field]
                }
                <input
                  className={input}
                  value={form[field]}
                  maxLength={64}
                  required={field !== "campaignCode"}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, [field]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <p className="text-xs leading-5 text-white/55">
            Use “basedare” for founder-owned placements, or a real current
            Baretag whose participation you have arranged. This does not send an
            invitation or promise a reward.
          </p>
          <label className="block text-sm text-white/75">
            Placement location slug
            <input
              className={input}
              required
              value={form.discoveryQr.hostVenueSlug}
              onChange={(e) =>
                setForm((v) => ({
                  ...v,
                  discoveryQr: {
                    ...v.discoveryQr,
                    hostVenueSlug: e.target.value,
                  },
                }))
              }
              placeholder="Existing public place slug"
            />
          </label>
          <label className="block text-sm text-white/75">
            Open this type of experience
            <select
              className={input}
              value={form.discoveryQr.kind}
              onChange={(e) =>
                setForm((v) => ({
                  ...v,
                  discoveryQr: {
                    ...v.discoveryQr,
                    kind: e.target.value as (typeof QR_DESTINATIONS)[number],
                    key: e.target.value === "ADVENTURE" ? "postcard" : "",
                  },
                }))
              }
            >
              {QR_DESTINATIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {
                    {
                      VENUE: "Place",
                      ADVENTURE: "Free adventure",
                      EVENT: "Published event",
                      MEETUP: "Upcoming public meetup",
                      CREATOR: "Public creator profile",
                    }[kind]
                  }
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-white/75">
            Destination
            {form.discoveryQr.kind === "ADVENTURE" ? (
              <select
                className={input}
                value={form.discoveryQr.key}
                onChange={(e) =>
                  setForm((v) => ({
                    ...v,
                    discoveryQr: { ...v.discoveryQr, key: e.target.value },
                  }))
                }
              >
                {ACTIVITY_SUGGESTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                required
                className={input}
                value={form.discoveryQr.key}
                onChange={(e) =>
                  setForm((v) => ({
                    ...v,
                    discoveryQr: { ...v.discoveryQr, key: e.target.value },
                  }))
                }
                placeholder="Existing place slug, event slug, meetup ID or Baretag"
              />
            )}
          </label>
          <label className="block text-sm text-white/75">
            Valid for (days)
            <input
              type="number"
              min={1}
              max={90}
              className={input}
              value={form.discoveryQr.expiresInDays}
              required
              onChange={(e) =>
                setForm((v) => ({
                  ...v,
                  discoveryQr: {
                    ...v.discoveryQr,
                    expiresInDays: Number(e.target.value),
                  },
                }))
              }
            />
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-white/75">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.placementPermissionConfirmed}
              onChange={(e) =>
                setForm((v) => ({
                  ...v,
                  placementPermissionConfirmed: e.target.checked,
                }))
              }
            />
            The host approved this exact physical placement. This is an operator
            attestation, not a claimed partnership.
          </label>
          <button
            disabled={busy}
            className="bd-action min-h-12 w-full disabled:opacity-50"
          >
            {busy ? "Saving…" : "Create paused QR"}
          </button>
        </form>
        <div className="min-w-0">
          <h3 className="text-lg font-bold">Print artwork</h3>
          {active ? (
            <QrArtwork key={active.id} row={active} busy={busy} />
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-white/15 p-6 text-sm leading-6 text-white/55">
              Select a campaign below to preview either sticker design. Download
              unlocks after its current destination, permission and active
              status pass.
            </p>
          )}
        </div>
      </div>
      {report ? (
        <div className="mt-8">
          <p className="text-sm leading-6 text-white/55">{report.note}</p>
          {!report.trackingReady ? (
            <p role="status" className="mt-3 text-sm text-amber-100">
              Journey tracking is not configured. Activation and printing remain
              blocked; metrics are unavailable.
            </p>
          ) : null}
          {report.hasMore ? (
            <p className="mt-2 text-sm text-amber-100">
              Showing the latest 50 QR campaigns; this is not the complete
              inventory.
            </p>
          ) : null}
          {!report.metricsAvailable ? (
            <p className="mt-2 text-sm text-amber-100">
              Metrics exceeded the safe source limit. Choose a shorter window.
            </p>
          ) : null}
          <button
            type="button"
            className="bd-action mt-4 min-h-11"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(report.observation, null, 2)], {
                  type: "application/json",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "basedare-qr-aggregate-observation.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Export free-adventure harness evidence
          </button>
          <div className="mt-5 space-y-3">
            {report.links.length ? (
              report.links.map((row) => (
                <article
                  key={row.id}
                  className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold">{row.title}</h3>
                      <p className="mt-1 break-all text-sm text-white/60">
                        {row.publicPath} · {row.active ? "Active" : "Paused"} ·{" "}
                        {row.host ?? "Location unavailable"}
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        {row.campaignCode || "No campaign"} · @{row.creatorCode}{" "}
                        ·{" "}
                        {row.expiresAt
                          ? "Ends " +
                            new Date(row.expiresAt).toLocaleDateString()
                          : "Invalid expiry"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="bd-action min-h-11"
                        onClick={() => setSelected(row.id)}
                      >
                        Artwork
                      </button>
                      <button
                        type="button"
                        className="bd-action min-h-11 disabled:opacity-40"
                        disabled={busy || (!row.active && (!row.permissionConfirmed || !report.trackingReady || Boolean(row.issue)))}
                        onClick={() =>
                          void mutate(
                            { linkId: row.id, active: !row.active },
                            "PATCH",
                          )
                        }
                      >
                        {row.active ? "Pause QR" : "Activate QR"}
                      </button>
                      <button
                        type="button"
                        className="bd-action min-h-11"
                        disabled={busy}
                        onClick={() =>
                          void mutate(
                            {
                              linkId: row.id,
                              placementPermissionConfirmed:
                                !row.permissionConfirmed,
                            },
                            "PATCH",
                          )
                        }
                      >
                        {row.permissionConfirmed
                          ? "Revoke permission"
                          : "Confirm permission"}
                      </button>
                    </div>
                  </div>
                  {row.issue ? (
                    <p className="mt-3 text-sm text-amber-100">{row.issue}</p>
                  ) : null}
                  {!row.permissionConfirmed ? (
                    <p className="mt-2 text-sm text-amber-100">
                      Placement permission is missing. Activation and printing
                      are blocked.
                    </p>
                  ) : null}
                  {row.metrics ? (
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      {Object.entries({
                        Entries: row.metrics.entries,
                        "Browser journeys": row.metrics.browserJourneys,
                        "Adventure landings": row.metrics.landings,
                        "Adventure starts": row.metrics.starts,
                        "Self-reported finishes":
                          row.metrics.selfReportedFinishes,
                        "Share actions": row.metrics.shareActions,
                        "Verified completions": row.metrics.verifiedCompletions,
                      }).map(([name, value]) => (
                        <div key={name}>
                          <dt className="text-white/50">{name}</dt>
                          <dd className="font-bold">{value ?? "N/A"}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-white/55">
                      Metrics unavailable.
                    </p>
                  )}
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/55">
                No discovery QR campaigns have been created. No pilot placements
                or ambassadors are implied.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function QrArtwork({ row, busy }: { row: Row; busy: boolean }) {
  const [theme, setTheme] = useState<"bored" | "world">("bored"),
    [origin, setOrigin] = useState(""),
    [logo, setLogo] = useState(""),
    [error, setError] = useState(""),
    [assetAttempt, setAssetAttempt] = useState(0);
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/assets/basedare-wordmark-liquid-v2.webp", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then((r) => {
        if (!r.ok) throw Error("Logo could not load.");
        return r.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(Error("Logo could not load."));
            reader.readAsDataURL(blob);
          }),
      )
      .then((value) => {
        if (!controller.signal.aborted) {
          setLogo(value);
          setOrigin(window.location.origin);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Artwork logo could not load. Reopen the artwork to retry.");
      });
    return () => controller.abort();
  }, [assetAttempt]);
  function download() {
    if (!row.printable || !ref.current || !logo) return;
    const exportSvg = ref.current.cloneNode(true) as SVGSVGElement;
    exportSvg.removeAttribute("style");
    exportSvg.setAttribute("font-family", "Arial, sans-serif");
    const blob = new Blob(
      [
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          new XMLSerializer().serializeToString(exportSvg),
      ],
      { type: "image/svg+xml" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `basedare-${row.slug}-${theme}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="mt-4 min-w-0">
      <label className="text-sm text-white/70">
        Sticker design
        <select
          className={input}
          value={theme}
          onChange={(e) => setTheme(e.target.value as "bored" | "world")}
        >
          <option value="bored">Bored? Good.</option>
          <option value="world">The world is your feed.</option>
        </select>
      </label>
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/15 bg-black">
        <svg
          ref={ref}
          xmlns="http://www.w3.org/2000/svg"
          width="100mm"
          height="140mm"
          viewBox="0 0 600 840"
          role="img"
          aria-label="BaseDare discovery sticker"
          style={{
            width: "100%",
            height: "auto",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <rect width="600" height="840" fill="#08090f" />
          <rect
            x="14"
            y="14"
            width="572"
            height="812"
            rx="28"
            fill="none"
            stroke="#eecb48"
            strokeWidth="3"
          />
          <path d="M32 155H568M32 700H568" stroke="#663494" strokeWidth="3" />
          <image
            href={logo || "/assets/basedare-wordmark-liquid-v2.webp"}
            x="145"
            y="40"
            width="310"
            height="78"
          />
          <text
            x="300"
            y="205"
            textAnchor="middle"
            fill="#f8dc65"
            fontSize="42"
            fontWeight="900"
          >
            {theme === "bored" ? "BORED? GOOD." : "THE WORLD IS"}
          </text>
          <text
            x="300"
            y="248"
            textAnchor="middle"
            fill="white"
            fontSize="28"
            fontWeight="800"
          >
            {theme === "bored" ? "SCAN FOR YOUR NEXT DARE." : "YOUR FEED."}
          </text>
          {origin ? (
            <QRCodeSVG
              x="130"
              y="275"
              value={origin + row.publicPath}
              size={340}
              level="H"
              marginSize={4}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          ) : null}
          <text
            x="300"
            y="655"
            textAnchor="middle"
            fill="white"
            fontSize="22"
            fontWeight="700"
          >
            {row.title.length > 38 ? row.title.slice(0, 35) + "…" : row.title}
          </text>
          <text
            x="300"
            y="685"
            textAnchor="middle"
            fill="#c1b9d3"
            fontSize="18"
          >
            {(row.host ?? "").slice(0, 45)}
          </text>
          <text
            x="300"
            y="740"
            textAnchor="middle"
            fill="#f8dc65"
            fontSize="18"
          >
            {origin.replace(/^https?:\/\//, "")}
          </text>
          <text x="300" y="768" textAnchor="middle" fill="white" fontSize="12">
            {row.publicPath}
          </text>
          <text
            x="300"
            y="804"
            textAnchor="middle"
            fill="#d0c9dd"
            fontSize="18"
          >
            LOOK AROUND. NO SIGN-UP NEEDED.
          </text>
        </svg>
      </div>
      <button
        type="button"
        className="bd-action mt-4 min-h-11 w-full disabled:opacity-40"
        disabled={busy || !row.printable || !logo}
        onClick={download}
      >
        Download sticker SVG
      </button>
      <p className="mt-3 break-words text-xs leading-5 text-white/55">
        100 × 140 mm · print at 100% · high-contrast QR with four-module quiet
        zone. Check this deployment’s host, scan on both phones and confirm the
        destination before placement. A saved artwork cannot detect a later
        pause; the short link can.
      </p>
      {!row.printable ? (
        <p className="mt-2 text-sm text-amber-100">
          Preview only: this campaign is paused, lacks permission or has an
          unavailable destination.
        </p>
      ) : null}
      {error ? (
        <div className="mt-2">
          <p role="alert" className="text-sm text-red-200">
            {error}
          </p>
          <button
            type="button"
            className="bd-action mt-2 min-h-11"
            onClick={() => {
              setError("");
              setAssetAttempt((n) => n + 1);
            }}
          >
            Retry artwork
          </button>
        </div>
      ) : null}
    </div>
  );
}
