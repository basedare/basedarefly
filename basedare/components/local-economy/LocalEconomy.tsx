"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSocialAccount } from "@/hooks/useSocialAccount";
import { useDiscovery } from "@/components/DiscoveryProvider";
import SocialActions from "@/components/social/SocialActions";
import ShareAdventure from "@/components/adventures/ShareAdventure";
import type { EconomySnapshot } from "@/lib/local-economy-server";
import { ECONOMY_RIGHTS_VERSION, type EconomyInput } from "@/lib/local-economy";

type Json<T> = T extends Date
  ? string
  : T extends (infer U)[]
  ? Json<U>[]
  : T extends object
  ? { [K in keyof T]: Json<T[K]> }
  : T;
type Snapshot = Json<EconomySnapshot>;
const field = "bd-field mt-1 min-h-12 w-full rounded-xl p-3 text-base";
const button = "bd-action min-h-12 !whitespace-normal";
const card = "bd-surface rounded-2xl p-5";
const time = (at: string, zone = "Asia/Manila") =>
  new Date(at).toLocaleString(undefined, {
    timeZone: zone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
function price(o: {
  compensation: string;
  amountMinor: number | null;
  currency: string | null;
}) {
  return o.compensation === "PAID"
    ? new Intl.NumberFormat("en", {
        style: "currency",
        currency: o.currency!,
      }).format(o.amountMinor! / 100) + " · arranged directly"
    : o.compensation === "BARTER"
    ? "Barter / creative exchange"
    : "Free";
}
function Label({ children, title }: { children: ReactNode; title: string }) {
  return (
    <label className="block min-w-0 text-sm text-white/80">
      {title}
      {children}
    </label>
  );
}
function Form({
  title,
  onSubmit,
  busy,
  children,
}: {
  title: string;
  onSubmit: (data: FormData) => Promise<void>;
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        void onSubmit(new FormData(e.currentTarget));
      }}
    >
      <h3 className="text-xl font-bold">{title}</h3>
      {children}
      <button disabled={busy} className={button}>
        {busy ? "Saving…" : "Save " + title.toLowerCase()}
      </button>
    </form>
  );
}
export default function LocalEconomy({
  node,
  session,
  opportunity,
  offerTo,
}: {
  node?: string;
  session?: string;
  opportunity?: string;
  offerTo?: string;
}) {
  const { wallet } = useSocialAccount();
  return (
    <Economy
      key={wallet ?? "guest"}
      node={node}
      session={session}
      opportunity={opportunity}
      offerTo={offerTo}
    />
  );
}
function Economy({
  node,
  session,
  opportunity,
  offerTo,
}: {
  node?: string;
  session?: string;
  opportunity?: string;
  offerTo?: string;
}) {
  const { wallet, headers } = useSocialAccount();
  const { area, ready } = useDiscovery();
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState(
    session
      ? "sessions"
      : opportunity
      ? "opportunities"
      : node
      ? "people"
      : "all"
  );
  const [search, setSearch] = useState("");
  const [verified, setVerified] = useState(false);
  const alive = useRef(true);
  const revision = useRef(0);
  const [runId] = useState(
    () =>
      "session-" +
      (typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now())
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const query = useCallback(() => {
    const q = new URLSearchParams();
    if (node) q.set("node", node);
    if (session) q.set("session", session);
    if (opportunity) q.set("opportunity", opportunity);
    if (!node && !session) {
      q.set("lat", String(area.lat));
      q.set("lng", String(area.lng));
      q.set("radiusKm", String(Math.min(100, area.radiusKm)));
    }
    return q;
  }, [node, session, opportunity, area.lat, area.lng, area.radiusKm]);
  const load = useCallback(
    async (mine = false, prompt = false) => {
      const version = ++revision.current;
      const q = query();
      const auth = mine && wallet ? await headers("social:read", prompt) : {};
      if (!alive.current || version !== revision.current) return;
      if (mine && wallet) q.set("wallet", wallet);
      const response = await fetch("/api/local-economy?" + q, {
        headers: auth,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json();
      if (!alive.current || version !== revision.current) return;
      if (!response.ok || !body.success)
        throw Error(body.error || "Please retry.");
      setData(body.data);
      setError("");
      setVerified(mine);
    },
    [wallet, headers, query]
  );
  useEffect(() => {
    if (ready)
      void load().catch((e) => {
        if (alive.current) setError(e.message);
      });
  }, [ready, load]);
  const act = async (command: EconomyInput) => {
    if (!wallet) {
      setError("Sign in using the account button to continue.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const auth = await headers("social:write", true);
      if (!alive.current) return;
      const response = await fetch("/api/local-economy", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, ...command }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json();
      if (!alive.current) return;
      if (!response.ok || !body.success)
        throw Error(body.error || "Please retry.");
      setNotice("Saved.");
      await load(true, false);
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const download = async (id: string, revoke = false) => {
    try {
      const auth = await headers("social:read", true);
      if (!alive.current) return;
      const r = await fetch(
        `/api/local-economy/recordings/${id}?wallet=${wallet}${
          revoke ? "&mode=revoke" : ""
        }`,
        { headers: auth, cache: "no-store" }
      );
      const b = await r.json();
      if (!alive.current) return;
      if (!r.ok || !b.success) throw Error(b.error);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(b.data, null, 2)], {
          type: "application/json",
        })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "baseclips-permission-" + id + ".json";
      a.click();
      URL.revokeObjectURL(url);
      setNotice(
        "Export prepared for local review. It has not been sent or published."
      );
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Export unavailable.");
    }
  };
  const matches = (s: string) => s.toLowerCase().includes(search.toLowerCase());
  const mine = data?.mine;
  const ownNodes = mine?.nodes.filter((n) => n.status === "PUBLISHED") ?? [];
  const venues = data?.venues ?? [];
  const venueField = (
    <Label title="Public venue">
      <select className={field} name="venueId" required>
        <option value="">Choose a venue</option>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </Label>
  );
  const nodeField = (
    <Label title="Host as">
      <select className={field} name="nodeId">
        <option value="">Myself / my managed venue</option>
        {ownNodes.map((n) => (
          <option key={n.id} value={n.id}>
            {n.name}
          </option>
        ))}
      </select>
    </Label>
  );
  const schedule = (
    <>
      <p className="text-sm text-white/55">
        Choose times in your device’s timezone. Public cards show the venue’s
        local time.
      </p>
      <Label title="Starts">
        <input
          className={field}
          type="datetime-local"
          name="startsAt"
          required
        />
      </Label>
      <Label title="Ends">
        <input className={field} type="datetime-local" name="endsAt" required />
      </Label>
    </>
  );
  const permission = (
    <label className="flex gap-3 text-sm leading-6">
      <input type="checkbox" name="placePermission" required />I have permission
      to organize this activity at this venue. This is not an official venue
      announcement unless I manage the venue.
    </label>
  );
  const date = (f: FormData, name: string) =>
    new Date(String(f.get(name))).toISOString();
  const text = (f: FormData, name: string) => String(f.get(name) ?? "").trim();
  return (
    <main className="bd-page-top mx-auto min-h-screen max-w-6xl px-4 pb-32 text-white">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Link className={button} href="/map">
          ← Map
        </Link>
        <Link className={button} href="/local">
          Local network
        </Link>
        <Link className={button} href="/creators">
          People
        </Link>
      </div>
      <p className="bd-kicker text-sm text-amber-200">
        Discover. Offer. Participate. Connect.
      </p>
      <h1 className="mt-3 text-4xl font-black sm:text-5xl">
        {session
          ? "BaseDare Session"
          : node
          ? "A node in the local world."
          : "Your people. Your places."}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
        Find a jam, offer a skill, meet a collaborator or discover a place worth
        being part of. {node || session ? "" : `Browsing ${area.label}.`}{" "}
        Siargao is the first pilot.
      </p>
      <div
        className="my-6 flex flex-wrap gap-2"
        aria-label="Discover local activity"
      >
        {[
          ["all", "Everything"],
          ["people", "Nodes & people"],
          ["places", "Places"],
          ["opportunities", "Opportunities"],
          ["sessions", "Sessions"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={button + (filter === id ? " bd-action--gold" : "")}
          >
            {label}
          </button>
        ))}
      </div>
      <Label title="Find a name, skill or opportunity">
        <input
          className={field}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Musicians, surf, photography…"
        />
      </Label>
      <div className="my-5 flex flex-wrap items-center gap-3">
        <button
          disabled={busy}
          className={button}
          onClick={() =>
            void load(Boolean(wallet), Boolean(wallet)).catch((e) =>
              setError(e.message)
            )
          }
        >
          {wallet
            ? verified
              ? "Refresh my activity"
              : "Open my activity"
            : "Refresh"}
        </button>
        <span className="text-sm text-white/55">
          Browse freely. Sign in to host, request or follow.
        </span>
      </div>
      {error && (
        <div role="alert" className="bd-well mb-5 p-4 text-rose-200">
          {error}{" "}
          <button
            className="ml-2 underline"
            onClick={() =>
              void load(verified).catch((e) => setError(e.message))
            }
          >
            Retry
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="mb-4 text-emerald-200">
          {notice}
        </p>
      )}
      {!data && !error && <p role="status">Opening the local network…</p>}
      {data?.limited && (
        <p className="mb-4 text-amber-100">
          This is a limited set of current records. Narrow your area or search.
        </p>
      )}
      {data && (
        <div className="grid gap-6">
          {["all", "people"].includes(filter) && (
            <section>
              <h2 className="mb-4 text-2xl font-bold">Nodes & people</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {data.nodes
                  .filter((n) => matches(n.name + n.category + n.city))
                  .map((n) => (
                    <article className={card} key={n.id}>
                      <p className="text-xs uppercase tracking-widest text-amber-200">
                        {n.category} · {n.city}
                      </p>
                      <h3 className="mt-3 text-2xl font-bold">
                        <Link href={"/n/" + n.slug}>{n.name}</Link>
                      </h3>
                      <p className="my-3 whitespace-pre-wrap text-white/65">
                        {n.about}
                      </p>
                      {n.members.map((m) => (
                        <Link
                          key={m.tag}
                          className="mr-3 inline-flex min-h-11 items-center text-cyan-100"
                          href={"/creator/" + m.tag.replace(/^@/, "")}
                        >
                          {m.tag}
                        </Link>
                      ))}
                      <div className="my-3">
                        <Link
                          className={button}
                          href={"/local?offerTo=" + n.id + "#host-tools"}
                        >
                          Offer a booking
                        </Link>
                      </div>
                      <SocialActions kind="NODE" targetKey={n.id} />
                      <Report kind="NODE" id={n.id} act={act} busy={busy} />
                      <p className="mt-3 text-sm text-white/45">
                        {n.mutuallyConfirmedBookings === null
                          ? "Completion history unavailable."
                          : `${n.mutuallyConfirmedBookings} bookings mutually confirmed by participants.`}{" "}
                        These are participant reports, not payment or GPS proof.
                      </p>
                    </article>
                  ))}
              </div>
              {!data.nodes.length && (
                <p className={card}>
                  No published Nodes here yet.{" "}
                  <Link className="underline" href="/creators">
                    Explore public people
                  </Link>{" "}
                  or create your own consenting project below.
                </p>
              )}
            </section>
          )}
          {["all", "places"].includes(filter) && !node && !session && (
            <section>
              <h2 className="mb-4 text-2xl font-bold">Places to connect</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {venues
                  .filter((v) => matches(v.name))
                  .slice(0, 18)
                  .map((v) => (
                    <article className={card} key={v.id}>
                      <h3 className="text-xl font-bold">{v.name}</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link className={button} href={"/venues/" + v.slug}>
                          Explore place
                        </Link>
                        <Link className={button} href={"/map?place=" + v.slug}>
                          On map
                        </Link>
                      </div>
                    </article>
                  ))}
              </div>
              {!venues.length && (
                <p className={card}>No places loaded in this area.</p>
              )}
            </section>
          )}
          {["all", "opportunities"].includes(filter) && (
            <section>
              <h2 className="mb-4 text-2xl font-bold">
                Offers, needs & opportunities
              </h2>
              <p className="mb-4 text-sm text-white/55">
                Paid terms are agreed directly. BaseDare does not collect
                payment or guarantee fulfillment.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {data.opportunities
                  .filter(
                    (o) =>
                      (!node || o.node?.slug === node || o.node?.id === node) &&
                      matches(o.title + o.description + o.kind)
                  )
                  .map((o) => (
                    <article className={card} key={o.id}>
                      <p className="text-xs uppercase tracking-widest text-amber-200">
                        {o.kind} · {price(o)}
                      </p>
                      <h3 className="mt-3 text-2xl font-bold">{o.title}</h3>
                      <p className="my-3 whitespace-pre-wrap text-white/65">
                        {o.description}
                      </p>
                      <p>
                        {o.venue.name} · {time(o.startsAt, o.venue.timezone)}
                      </p>
                      <p className="my-3 rounded-xl bg-black/25 p-3 text-sm leading-6">
                        {o.exchangeTerms}
                      </p>
                      <Link
                        className="inline-flex min-h-11 items-center text-cyan-100"
                        href={"/map?place=" + o.venue.slug}
                      >
                        Open place on map →
                      </Link>
                      <Form
                        title="Request this opportunity"
                        busy={busy}
                        onSubmit={(f) =>
                          act({
                            action: "opportunity.request",
                            id: o.id,
                            message: text(f, "message"),
                            termsHash: o.termsHash,
                          })
                        }
                      >
                        <Label title="Your introduction">
                          <textarea
                            required
                            maxLength={500}
                            name="message"
                            className={field}
                          />
                        </Label>
                        <label className="flex gap-3 text-sm">
                          <input type="checkbox" required />I agree to these
                          exact terms and times. The organizer must accept my
                          request.
                        </label>
                      </Form>
                      <SocialActions
                        kind="OPPORTUNITY"
                        targetKey={o.id}
                        mode="save"
                      />
                      <Report
                        kind="OPPORTUNITY"
                        id={o.id}
                        act={act}
                        busy={busy}
                      />
                    </article>
                  ))}
              </div>
              {!data.opportunities.length && (
                <p className={card}>
                  No open opportunities in this area. Nothing has been invented
                  to fill the map.
                </p>
              )}
            </section>
          )}
          {["all", "sessions"].includes(filter) && (
            <section>
              <h2 className="mb-4 text-2xl font-bold">BaseDare Sessions</h2>
              <p className="mb-4 text-white/60">
                Live music, stories and creative collaboration. Come along or
                request a guest role.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {data.sessions
                  .filter(
                    (s) =>
                      (!node || s.nodeId === data.nodes[0]?.id) &&
                      matches(s.title + s.description)
                  )
                  .map((s) => (
                    <article className={card} key={s.id}>
                      <p className="text-xs uppercase tracking-widest text-amber-200">
                        {s.status} · {s.venue.name} ·{" "}
                        {time(s.startsAt, s.venue.timezone)}
                      </p>
                      <h3 className="mt-3 text-2xl font-bold">
                        <Link href={"/sessions/" + s.id}>{s.title}</Link>
                      </h3>
                      <p className="my-3 text-white/65">{s.description}</p>
                      <p className="text-sm text-white/55">
                        {s.approvedGuests}/{s.guestCapacity} guest roles
                        approved · {s.audienceCount} audience RSVPs. RSVP is
                        intent, not attendance.
                      </p>
                      {s.status === "ACTIVE" && (
                        <div className="my-4 flex flex-wrap gap-2">
                          <Link
                            className={button}
                            href={"/community/meet/" + s.meetupId}
                          >
                            Audience RSVP
                          </Link>
                          <Link
                            className={button}
                            href={
                              "/map?place=" +
                              s.venue.slug +
                              "&meetupId=" +
                              s.meetupId
                            }
                          >
                            On map
                          </Link>
                        </div>
                      )}
                      {s.status === "ACTIVE" && (
                        <Form
                          title="Guest request"
                          busy={busy}
                          onSubmit={(f) =>
                            act({
                              action: "session.apply",
                              id: s.id,
                              role: text(f, "role"),
                              application: text(f, "application"),
                            })
                          }
                        >
                          <Label title="Role you’d like">
                            <input
                              name="role"
                              required
                              maxLength={60}
                              placeholder="Guitar, vocals, storytelling…"
                              className={field}
                            />
                          </Label>
                          <Label title="Tell the host a little about yourself">
                            <textarea
                              name="application"
                              required
                              maxLength={500}
                              className={field}
                            />
                          </Label>
                        </Form>
                      )}
                      <p className="mt-4 text-sm text-white/55">
                        {s.recordingPolicy === "NO_RECORDING"
                          ? "The host does not allow recording."
                          : "Recording requires separate permission for featured people and music."}
                      </p>
                      <Report kind="SESSION" id={s.id} act={act} busy={busy} />
                      {session && s.recordingPolicy === "SEPARATE_CONSENT" && (
                        <details className="mt-4">
                          <summary className="min-h-11 cursor-pointer py-3 font-bold">
                            Contribute a permissioned recording
                          </summary>
                          <ShareAdventure
                            activityId="session-recording"
                            sessionId={s.id}
                            runId={runId}
                            placeSlug={s.venue.slug}
                          />
                          <p className="my-4 text-sm text-white/55">
                            Upload a private original MP4 under 4 MB through the
                            existing review flow, then open My activity to grant
                            processing permission. Full-length recordings remain
                            outside this MVP.
                          </p>
                        </details>
                      )}
                    </article>
                  ))}
              </div>
              {!data.sessions.length && (
                <p className={card}>
                  No upcoming Session is published here. Check back or host one
                  with permission.
                </p>
              )}
            </section>
          )}
          {mine && (
            <section id="host-tools" className="grid gap-4 scroll-mt-28">
              <h2 className="text-2xl font-bold">My activity</h2>
              <p className="text-sm text-white/55">
                Private requests and participant details are visible only to the
                relevant accounts. Confirmations below are participant reports,
                not GPS proof or payment receipts.
              </p>
              {mine.invitations.map((m) => (
                <article key={m.id} className={card}>
                  <p>
                    {m.node.name} · {m.role} · {m.status}
                  </p>
                  {m.status === "INVITED" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({
                            action: "member.respond",
                            id: m.id,
                            accept: true,
                            publicConsent: true,
                          })
                        }
                      >
                        Accept & show my public @tag
                      </button>
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({
                            action: "member.respond",
                            id: m.id,
                            accept: true,
                            publicConsent: false,
                          })
                        }
                      >
                        Accept privately
                      </button>
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({
                            action: "member.respond",
                            id: m.id,
                            accept: false,
                            publicConsent: false,
                          })
                        }
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    m.status === "ACCEPTED" && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({ action: "member.remove", id: m.id })
                        }
                      >
                        Leave Node
                      </button>
                    )
                  )}
                </article>
              ))}
              {mine.nodes.map((n) => (
                <article key={n.id} className={card}>
                  <h3 className="text-xl font-bold">
                    {n.name} · {n.status}
                  </h3>
                  <div className="my-4 flex flex-wrap gap-2">
                    {n.ownerWallet === wallet && n.status === "DRAFT" && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({
                            action: "node.publish",
                            id: n.id,
                            consent: true,
                          })
                        }
                      >
                        Publish · I have authority & consent
                      </button>
                    )}
                    {n.ownerWallet === wallet && n.status !== "WITHDRAWN" && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({ action: "node.withdraw", id: n.id })
                        }
                      >
                        Withdraw Node
                      </button>
                    )}
                  </div>
                  <details>
                    <summary className="min-h-11 py-3">
                      Members & invitations
                    </summary>
                    {n.members.map((m) => (
                      <div key={m.id} className="my-3 flex flex-wrap gap-3">
                        <span>
                          {m.role} · {m.status} · {m.displayTag}
                        </span>
                        <button
                          disabled={busy}
                          className={button}
                          onClick={() =>
                            void act({ action: "member.remove", id: m.id })
                          }
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                    <Form
                      title="Member invitation"
                      busy={busy}
                      onSubmit={(f) =>
                        act({
                          action: "member.invite",
                          id: n.id,
                          tag: text(f, "tag"),
                          role: text(f, "role") as "ADMIN" | "MEMBER",
                        })
                      }
                    >
                      <Label title="Existing @tag">
                        <input className={field} name="tag" required />
                      </Label>
                      <Label title="Role">
                        <select className={field} name="role">
                          <option>MEMBER</option>
                          <option>ADMIN</option>
                        </select>
                      </Label>
                    </Form>
                  </details>
                </article>
              ))}
              {mine.opportunities.map((o) => (
                <article key={o.id} className={card}>
                  <h3 className="text-xl font-bold">
                    {o.title} · {o.status}
                  </h3>
                  <p className="my-3 text-white/60">
                    {price(o)} · {o.exchangeTerms}
                  </p>
                  {o.authorWallet !== wallet &&
                    o.targetNodeId &&
                    o.directStatus === "AWAITING_RESPONSE" &&
                    o.status === "OPEN" && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({
                            action: "opportunity.request",
                            id: o.id,
                            termsHash: o.termsHash,
                            message:
                              "Accepted these exact direct-offer terms as an authorized Node administrator.",
                          })
                        }
                      >
                        Accept exact direct offer
                      </button>
                    )}
                  {o.targetNodeId && (
                    <p className="my-3 text-sm text-white/60">
                      Node response: {o.directStatus}
                    </p>
                  )}
                  {o.authorWallet !== wallet &&
                    o.targetNodeId &&
                    o.directStatus === "AWAITING_RESPONSE" &&
                    o.status === "OPEN" && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({
                            action: "opportunity.request",
                            id: o.id,
                            decline: true,
                            termsHash: o.termsHash,
                            message: "Declined this direct offer.",
                          })
                        }
                      >
                        Decline direct offer
                      </button>
                    )}
                  {(o.authorWallet === wallet ||
                    ownNodes.some((n) => n.id === o.nodeId)) && (
                    <>
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({ action: "opportunity.cancel", id: o.id })
                        }
                      >
                        Cancel opportunity
                      </button>
                      {o.requests.map((r) => (
                        <div key={r.id} className="bd-well mt-4 p-4">
                          <p>
                            {r.displayTag} · {r.message} · {r.status}
                          </p>
                          {r.status === "PENDING" && (
                            <div className="my-3 flex gap-2">
                              <button
                                disabled={busy}
                                className={button}
                                onClick={() =>
                                  void act({
                                    action: "opportunity.decide",
                                    id: r.id,
                                    decision: "CONFIRMED",
                                  })
                                }
                              >
                                Confirm
                              </button>
                              <button
                                disabled={busy}
                                className={button}
                                onClick={() =>
                                  void act({
                                    action: "opportunity.decide",
                                    id: r.id,
                                    decision: "DECLINED",
                                  })
                                }
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          {r.status === "CONFIRMED" && (
                            <button
                              disabled={busy}
                              className={button}
                              onClick={() =>
                                void act({
                                  action: "booking.complete",
                                  id: r.id,
                                })
                              }
                            >
                              Confirm completed work
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </article>
              ))}
              {mine.requests.map((r) => (
                <article key={r.id} className={card}>
                  <h3 className="font-bold">
                    {r.opportunity.title} · {r.status}
                  </h3>
                  <p className="my-3 text-sm">
                    {r.hostCompletedAt && r.participantCompletedAt
                      ? "Both parties confirmed completion"
                      : "Completion not mutually confirmed"}{" "}
                    · No payment recorded by this feature
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {r.status === "CONFIRMED" && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({ action: "booking.complete", id: r.id })
                        }
                      >
                        Confirm my completed work
                      </button>
                    )}
                    {["PENDING", "CONFIRMED"].includes(r.status) && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({ action: "booking.cancel", id: r.id })
                        }
                      >
                        Cancel my request
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {mine.sessions.map((s) => (
                <article key={s.id} className={card}>
                  <h3 className="text-xl font-bold">
                    Hosting: {s.meetup.title}
                  </h3>
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() =>
                      void act({ action: "session.cancel", id: s.id })
                    }
                  >
                    Cancel Session
                  </button>
                  {s.guests.map((g) => (
                    <div key={g.id} className="bd-well mt-4 p-4">
                      <p>
                        {g.displayTag} · {g.role} · {g.application} · {g.status}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {g.status === "PENDING" && (
                          <>
                            <button
                              disabled={busy}
                              className={button}
                              onClick={() =>
                                void act({
                                  action: "session.decide",
                                  id: g.id,
                                  decision: "APPROVED",
                                })
                              }
                            >
                              Approve guest
                            </button>
                            <button
                              disabled={busy}
                              className={button}
                              onClick={() =>
                                void act({
                                  action: "session.decide",
                                  id: g.id,
                                  decision: "DECLINED",
                                })
                              }
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {g.status === "APPROVED" && (
                          <>
                            <button
                              disabled={busy}
                              className={button}
                              onClick={() =>
                                void act({ action: "session.attest", id: g.id })
                              }
                            >
                              Confirm participated
                            </button>
                            <button
                              disabled={busy}
                              className={button}
                              onClick={() =>
                                void act({ action: "session.leave", id: g.id })
                              }
                            >
                              Remove guest
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </article>
              ))}
              {mine.guests.map((g) => (
                <article key={g.id} className={card}>
                  <h3 className="font-bold">
                    {g.session.meetup.title} · {g.role} · {g.status}
                  </h3>
                  <p className="my-3 text-sm">
                    {g.hostAttestedAt && g.participantAttestedAt
                      ? "Host and participant confirmed participation"
                      : "Participation not mutually confirmed"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {g.status === "APPROVED" && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({ action: "session.attest", id: g.id })
                        }
                      >
                        Confirm I participated
                      </button>
                    )}
                    {["PENDING", "APPROVED"].includes(g.status) && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          void act({ action: "session.leave", id: g.id })
                        }
                      >
                        Withdraw guest request
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {session && (
                <details className={card}>
                  <summary className="min-h-11 py-3 font-bold">
                    Grant recording permissions
                  </summary>
                  <Form
                    title="Recording permission"
                    busy={busy}
                    onSubmit={(f) =>
                      act({
                        action: "recording.grant",
                        id: session,
                        submissionId: text(f, "submissionId"),
                        processing: f.get("processing") === "on",
                        publication: f.get("publication") === "on",
                        destinations: f.getAll("destinations") as (
                          | "BaseDare"
                          | "Instagram"
                          | "TikTok"
                          | "YouTube"
                          | "X"
                        )[],
                        requiredCredit: text(f, "requiredCredit"),
                        rightsVersion: ECONOMY_RIGHTS_VERSION,
                        rightsConfirmed: true,
                        expiresAt: date(f, "expiresAt"),
                      })
                    }
                  >
                    <Label title="My uploaded Session video">
                      <select name="submissionId" required className={field}>
                        <option value="">Choose your original</option>
                        {mine.submissions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.caption} · {m.status}
                          </option>
                        ))}
                      </select>
                    </Label>
                    <Label title="Credit">
                      <input
                        name="requiredCredit"
                        maxLength={140}
                        required
                        className={field}
                      />
                    </Label>
                    <Label title="Permission expiry">
                      <input
                        type="datetime-local"
                        name="expiresAt"
                        required
                        className={field}
                      />
                    </Label>
                    <label className="flex gap-3">
                      <input type="checkbox" name="processing" />
                      Allow BaseClips to process this original.
                    </label>
                    <label className="flex gap-3">
                      <input type="checkbox" name="publication" />
                      Allow separately reviewed edits on the selected channels.
                    </label>
                    <fieldset>
                      <legend>Permitted publication channels</legend>
                      <div className="mt-3 flex flex-wrap gap-4">
                        {[
                          "BaseDare",
                          "Instagram",
                          "TikTok",
                          "YouTube",
                          "X",
                        ].map((d) => (
                          <label className="flex min-h-11 gap-2" key={d}>
                            <input
                              type="checkbox"
                              name="destinations"
                              value={d}
                            />
                            {d}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="flex gap-3 text-sm leading-6">
                      <input type="checkbox" required />I own this recording and
                      have permission from featured people, music rights holders
                      and the venue for these uses. No advertising, resale, AI
                      training or evaluation rights are granted.
                    </label>
                    <p className="text-sm text-white/55">
                      The host must approve processing. This grant does not
                      approve any edited output. Withdraw below; any
                      already-exported local job also needs the provided revoke
                      instruction applied by the operator.
                    </p>
                  </Form>
                </details>
              )}
              {mine.recordings.map((g) => (
                <article className={card} key={g.id}>
                  <h3 className="font-bold">
                    Recording: {g.submission.caption}
                  </h3>
                  <p className="my-3 text-sm">
                    {g.withdrawnAt
                      ? "Permission withdrawn"
                      : g.hostApprovedAt
                      ? "Host approved permission"
                      : "Awaiting host permission review"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {g.withdrawnAt && g.wallet === wallet && (
                      <button
                        className={button}
                        onClick={() => void download(g.id, true)}
                      >
                        Get BaseClips withdrawal instruction
                      </button>
                    )}
                    {!g.withdrawnAt && (
                      <>
                        {mine.sessions.some((s) => s.id === g.sessionId) && (
                          <button
                            disabled={busy}
                            className={button}
                            onClick={() =>
                              void act({
                                action: "recording.approve",
                                id: g.id,
                              })
                            }
                          >
                            Host: approve permission
                          </button>
                        )}
                        <button
                          disabled={busy}
                          className={button}
                          onClick={() =>
                            void act({ action: "recording.withdraw", id: g.id })
                          }
                        >
                          Withdraw permission
                        </button>
                        {g.wallet === wallet && (
                          <button
                            disabled={busy}
                            className={button}
                            onClick={() => void download(g.id)}
                          >
                            Export for BaseClips review
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
              <details className={card}>
                <summary className="min-h-11 py-3 text-xl font-bold">
                  Create a Node
                </summary>
                <Form
                  title="Node"
                  busy={busy}
                  onSubmit={(f) =>
                    act({
                      action: "node.create",
                      name: text(f, "name"),
                      slug: text(f, "slug"),
                      about: text(f, "about"),
                      category: text(f, "category"),
                      city: text(f, "city"),
                    })
                  }
                >
                  <Label title="Project or collective name">
                    <input
                      name="name"
                      required
                      maxLength={100}
                      className={field}
                    />
                  </Label>
                  <Label title="Public link name">
                    <input
                      name="slug"
                      pattern="[a-z0-9][a-z0-9-]{2,59}"
                      required
                      className={field}
                    />
                  </Label>
                  <Label title="About">
                    <textarea
                      name="about"
                      required
                      maxLength={1000}
                      className={field}
                    />
                  </Label>
                  <Label title="Skill or category">
                    <input
                      name="category"
                      required
                      maxLength={40}
                      className={field}
                    />
                  </Label>
                  <Label title="City or island">
                    <input
                      name="city"
                      required
                      maxLength={80}
                      className={field}
                    />
                  </Label>
                  <p className="text-sm text-white/55">
                    Starts as a draft. Only invite people who agree to join;
                    they choose whether their public @tag is shown.
                  </p>
                </Form>
              </details>
              <details open={offerTo ? true : undefined} className={card}>
                <summary className="min-h-11 py-3 text-xl font-bold">
                  Post an opportunity or direct booking offer
                </summary>
                <Form
                  title="Opportunity"
                  busy={busy}
                  onSubmit={(f) => {
                    const compensation = text(f, "compensation") as
                      | "FREE"
                      | "BARTER"
                      | "PAID";
                    return act({
                      action: "opportunity.create",
                      venueId: text(f, "venueId"),
                      nodeId: text(f, "nodeId") || undefined,
                      targetNodeId: text(f, "targetNodeId") || undefined,
                      kind: text(f, "kind") as
                        | "OFFER"
                        | "NEED"
                        | "GIG"
                        | "COLLABORATION"
                        | "EXPERIENCE",
                      title: text(f, "title"),
                      description: text(f, "description"),
                      compensation,
                      amountMinor:
                        compensation === "PAID"
                          ? Math.round(Number(f.get("amount")) * 100)
                          : undefined,
                      currency:
                        compensation === "PAID"
                          ? (text(f, "currency") as "PHP" | "USD")
                          : undefined,
                      exchangeTerms: text(f, "exchangeTerms"),
                      startsAt: date(f, "startsAt"),
                      endsAt: date(f, "endsAt"),
                      expiresAt: date(f, "expiresAt"),
                      capacity: Number(f.get("capacity")),
                      placePermission: true,
                    });
                  }}
                >
                  {venueField}
                  {nodeField}
                  <Label title="Type">
                    <select className={field} name="kind">
                      {[
                        "OFFER",
                        "NEED",
                        "GIG",
                        "COLLABORATION",
                        "EXPERIENCE",
                      ].map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </Label>
                  <Label title="Title">
                    <input
                      name="title"
                      required
                      maxLength={120}
                      className={field}
                    />
                  </Label>
                  <Label title="Description">
                    <textarea
                      name="description"
                      required
                      maxLength={1500}
                      className={field}
                    />
                  </Label>
                  <Label title="Compensation">
                    <select className={field} name="compensation">
                      <option>FREE</option>
                      <option>BARTER</option>
                      <option>PAID</option>
                    </select>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Label title="Price (paid only)">
                      <input
                        name="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        className={field}
                      />
                    </Label>
                    <Label title="Currency">
                      <select name="currency" className={field}>
                        <option>PHP</option>
                        <option>USD</option>
                      </select>
                    </Label>
                  </div>
                  <Label title="Exact deliverables, exchange and cancellation terms">
                    <textarea
                      name="exchangeTerms"
                      required
                      maxLength={1000}
                      className={field}
                    />
                  </Label>
                  {schedule}
                  <Label title="Requests close">
                    <input
                      type="datetime-local"
                      name="expiresAt"
                      required
                      className={field}
                    />
                  </Label>
                  <Label title="Available places">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      defaultValue={1}
                      name="capacity"
                      required
                      className={field}
                    />
                  </Label>
                  <Label title="Optional private direct offer to a Node (venue managers only)">
                    <select
                      name="targetNodeId"
                      defaultValue={offerTo ?? ""}
                      className={field}
                    >
                      <option value="">Public requests</option>
                      {data.nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                  </Label>
                  {permission}
                  <p className="text-sm text-white/55">
                    Terms cannot be edited after posting. Cancel and create a
                    new offer for different terms. Paid arrangements require
                    your own agreed payment and cancellation process.
                  </p>
                </Form>
              </details>
              <details className={card}>
                <summary className="min-h-11 py-3 text-xl font-bold">
                  Host a Session
                </summary>
                <Form
                  title="Session"
                  busy={busy}
                  onSubmit={(f) =>
                    act({
                      action: "session.create",
                      venueId: text(f, "venueId"),
                      nodeId: text(f, "nodeId") || undefined,
                      title: text(f, "title"),
                      description: text(f, "description"),
                      startsAt: date(f, "startsAt"),
                      endsAt: date(f, "endsAt"),
                      guestCapacity: Number(f.get("guestCapacity")),
                      recordingPolicy: text(f, "recordingPolicy") as
                        | "NO_RECORDING"
                        | "SEPARATE_CONSENT",
                      placePermission: true,
                    })
                  }
                >
                  {venueField}
                  {nodeField}
                  <Label title="Title">
                    <input
                      name="title"
                      required
                      maxLength={120}
                      className={field}
                    />
                  </Label>
                  <Label title="What’s happening?">
                    <textarea
                      name="description"
                      required
                      maxLength={500}
                      className={field}
                    />
                  </Label>
                  {schedule}
                  <p className="text-sm text-white/55">
                    Public Sessions start within 72 hours and last up to four
                    hours. Audience RSVP and guest approval are separate.
                  </p>
                  <Label title="Guest roles available">
                    <input
                      name="guestCapacity"
                      type="number"
                      min={1}
                      max={30}
                      defaultValue={2}
                      required
                      className={field}
                    />
                  </Label>
                  <Label title="Recording">
                    <select name="recordingPolicy" className={field}>
                      <option value="NO_RECORDING">No recording</option>
                      <option value="SEPARATE_CONSENT">
                        Separate permission for each recording
                      </option>
                    </select>
                  </Label>
                  {permission}
                </Form>
              </details>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function Report({
  kind,
  id,
  act,
  busy,
}: {
  kind: "NODE" | "OPPORTUNITY" | "SESSION";
  id: string;
  act: (c: EconomyInput) => Promise<void>;
  busy: boolean;
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="min-h-11 cursor-pointer py-3 text-white/50">
        Report a problem
      </summary>
      <Form
        title="Report"
        busy={busy}
        onSubmit={(f) =>
          act({ action: "report", kind, id, reason: String(f.get("reason")) })
        }
      >
        <Label title="What should we review?">
          <textarea name="reason" maxLength={500} required className={field} />
        </Label>
      </Form>
    </details>
  );
}
