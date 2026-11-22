import Link from "next/link";
import { readEconomy } from "@/lib/local-economy-server";
export default async function LocalPlaceActivity({
  venueId,
}: {
  venueId: string;
}) {
  const data = await readEconomy(null, { venue: venueId }).catch(() => null);
  if (data)
    return (
      <section className="bd-surface mt-6 p-5">
        <h2 className="text-xl font-bold">Be part of this place</h2>
        <p className="my-3 text-sm text-white/60">
          Current local opportunities and host-organized Sessions. Independent
          activities do not imply venue endorsement.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {data.opportunities.map((o) => (
            <Link
              className="bd-well min-h-12 p-4"
              key={o.id}
              href={"/local?opportunity=" + o.id}
            >
              {o.title} · {o.compensation.toLowerCase()}
            </Link>
          ))}
          {data.sessions.map((s) => (
            <Link
              className="bd-well min-h-12 p-4"
              key={s.id}
              href={"/sessions/" + s.id}
            >
              {s.title} · Session
            </Link>
          ))}
        </div>
        {!data.opportunities.length && !data.sessions.length && (
          <p className="text-sm text-white/50">
            No open opportunities or upcoming Sessions published here.
          </p>
        )}
        <Link className="bd-action mt-4" href="/local">
          Explore the local network
        </Link>
      </section>
    );
  return (
    <section className="bd-surface mt-6 p-5">
      <h2 className="text-xl font-bold">Local activity unavailable</h2>
      <p className="my-3 text-sm text-white/60">
        These records could not load. Refresh to retry.
      </p>
      <Link className="bd-action" href="/local">
        Open local network
      </Link>
    </section>
  );
}
