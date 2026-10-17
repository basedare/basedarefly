import { ShieldCheck, Coins, Layers3, MapPin } from "lucide-react";

const principles = [
  {
    title: "Verification",
    icon: ShieldCheck,
    tone: "text-violet-200",
    detail:
      "A staff QR and fresh GPS provide evidence of a venue visit. Paid submissions are reviewed against the dare’s requirements.",
  },
  {
    title: "Settlement",
    icon: Coins,
    tone: "text-amber-200",
    detail:
      "Funded paid dares use USDC escrow. Approval and payment are separate steps: check the payment status for confirmation.",
  },
  {
    title: "Network",
    icon: Layers3,
    tone: "text-violet-200",
    detail:
      "Paid funding uses Base when payment checks pass. Free adventures and meetups do not require funding.",
  },
  {
    title: "Location",
    icon: MapPin,
    tone: "text-cyan-200",
    detail:
      "Discover activities around real places. Optional adventure photos and clips appear publicly after review.",
  },
];

export default function TruthProtocol() {
  return (
    <section
      aria-labelledby="truth-protocol-title"
      className="relative z-20 px-4 py-14 sm:px-6 md:py-20"
    >
      <div className="bd-surface mx-auto max-w-6xl p-5 sm:p-8">
        <div className="mb-7 max-w-2xl">
          <p className="bd-page-kicker">Behind every next move</p>
          <h2
            id="truth-protocol-title"
            className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl"
          >
            Real places. <span className="text-[#f5c518]">Clear rules.</span>
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Explore freely. When proof or payment matters, know what happens
            next.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map(({ title, icon: Icon, tone, detail }) => (
            <article key={title} className="bd-card p-5">
              <span
                className={`bd-well inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}
              >
                <Icon size={21} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-black text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/65">{detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
