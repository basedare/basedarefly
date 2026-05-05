'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clipboard, Sparkles } from 'lucide-react';

import { trackActivationFunnelEvent } from '@/lib/activation-funnel-client';

type VenueType = 'beach' | 'bar' | 'cafe' | 'restaurant' | 'hotel' | 'gym' | 'event' | 'retail';
type BuyerGoal = 'foot_traffic' | 'ugc' | 'launch' | 'event' | 'repeat_visits';

type AuditMission = {
  title: string;
  detail: string;
};

type AuditPlan = {
  headline: string;
  positioning: string;
  missions: AuditMission[];
  creators: string[];
  proofMetrics: string[];
  qrMechanic: string;
  offer: string;
  summary: string;
};

const panelClass =
  'relative overflow-hidden rounded-[32px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.93)_58%,rgba(7,6,14,0.98)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';
const cardClass =
  'relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.018)_16%,rgba(6,6,13,0.82)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.2)]';
const inputClass =
  'w-full rounded-[18px] border border-white/10 bg-black/32 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-yellow-200/40 focus:bg-black/42';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45';

const venueTypeLabels: Record<VenueType, string> = {
  beach: 'Beach / surf spot',
  bar: 'Bar / nightlife',
  cafe: 'Cafe',
  restaurant: 'Restaurant',
  hotel: 'Hotel / resort',
  gym: 'Gym / wellness',
  event: 'Event / pop-up',
  retail: 'Retail / product',
};

const goalLabels: Record<BuyerGoal, string> = {
  foot_traffic: 'Move people to a place',
  ugc: 'Get creator content',
  launch: 'Launch something new',
  event: 'Drive event energy',
  repeat_visits: 'Increase repeat visits',
};

const missionBank: Record<VenueType, AuditMission[]> = {
  beach: [
    { title: 'First light proof', detail: 'Capture a 15-second sunrise or golden-hour walk-in that makes the location feel worth the trip.' },
    { title: 'Local hidden angle', detail: 'Film the one view, corner, drink, or ritual that only repeat visitors know.' },
    { title: 'Weather flex', detail: 'Show how the venue feels in real island conditions: wind, salt, rain, sun, or post-surf energy.' },
    { title: 'Boardwalk receipt', detail: 'Scan the QR, check in on camera, and narrate why someone should come here this week.' },
    { title: 'Friend route', detail: 'Bring one person in and film their first reaction before they know the place is part of BaseDare.' },
  ],
  bar: [
    { title: 'First round ritual', detail: 'Film the first drink, table, greeting, or music cue that starts the night.' },
    { title: 'Quiet-night flip', detail: 'Show how the venue turns a slow hour into a reason to stay for one more round.' },
    { title: 'Signature pour', detail: 'Capture the bartender or creator explaining the drink people should order first.' },
    { title: 'Crowd pulse', detail: 'Record a safe 10-second crowd/ambience proof showing energy without staging it.' },
    { title: 'After-dark dare', detail: 'Complete a small social mission that fits the venue without becoming cringe or disruptive.' },
  ],
  cafe: [
    { title: 'Table one test', detail: 'Film the first table view, order, and 10-second reason this place is worth sitting down.' },
    { title: 'Menu hero', detail: 'Pick one photogenic item and explain who should order it and why.' },
    { title: 'Work spot receipt', detail: 'Show whether the cafe works for a focused laptop hour, meeting, or post-surf reset.' },
    { title: 'Regular energy', detail: 'Ask what regulars know that first-timers miss, then capture that detail.' },
    { title: 'Morning route', detail: 'Create a mini route: arrive, order, sit, scan, and show the best time to come.' },
  ],
  restaurant: [
    { title: 'Dish with a reason', detail: 'Film one dish with a clear story: origin, flavor, ritual, or why it is worth bringing someone here.' },
    { title: 'Date-night proof', detail: 'Show the arrival, seat, first dish, and ambience in under 20 seconds.' },
    { title: 'Staff pick', detail: 'Ask staff what people should order first and capture the recommendation as proof.' },
    { title: 'Group table signal', detail: 'Show how the place works for friends, family, or a post-event meal.' },
    { title: 'Return trigger', detail: 'Name one thing that would make someone come back next week and show it visually.' },
  ],
  hotel: [
    { title: 'Arrival feeling', detail: 'Film the first 20 seconds from entry to view, room, pool, bar, or check-in moment.' },
    { title: 'Staycation proof', detail: 'Show the one guest experience that feels better than scrolling booking photos.' },
    { title: 'Hidden amenity', detail: 'Capture the amenity, corner, or staff ritual that most guests miss.' },
    { title: 'Morning-after route', detail: 'Film breakfast, view, checkout, or local route that extends the stay story.' },
    { title: 'Guest receipt', detail: 'Scan in, show the guest moment, and state who this stay is perfect for.' },
  ],
  gym: [
    { title: 'First rep check-in', detail: 'Scan the QR, complete a beginner-friendly workout proof, and show the space without ego.' },
    { title: 'Coach cue', detail: 'Capture one trainer tip or movement correction that makes the place feel credible.' },
    { title: 'Before-after energy', detail: 'Show arrival mood versus post-session mood in a short split clip.' },
    { title: 'Community proof', detail: 'Film a safe class or group energy moment that explains why people return.' },
    { title: 'Recovery ritual', detail: 'Show the cooldown, smoothie, sauna, stretch, or wellness detail after the main session.' },
  ],
  event: [
    { title: 'Arrival signal', detail: 'Film the fastest proof that something is happening here now: queue, sound, setup, crowd, or host.' },
    { title: 'Three-person pulse', detail: 'Capture three quick attendee reactions to prove the event is not empty noise.' },
    { title: 'Sponsor moment', detail: 'Make one brand/product touchpoint feel native instead of like a forced ad.' },
    { title: 'Peak minute', detail: 'Record the one minute that future attendees should regret missing.' },
    { title: 'Aftermovie seed', detail: 'Submit one clip designed to become part of the official recap.' },
  ],
  retail: [
    { title: 'Shelf to story', detail: 'Pick one product and explain the use case, person, or lifestyle it belongs to.' },
    { title: 'Try-on proof', detail: 'Film a real first impression, fit check, demo, or product test inside the store.' },
    { title: 'Staff recommendation', detail: 'Ask staff what people should notice first and capture the answer.' },
    { title: 'Gift route', detail: 'Show what to buy for one specific person type and why.' },
    { title: 'Window-to-purchase', detail: 'Film the path from outside curiosity to product discovery and QR check-in.' },
  ],
};

const creatorArchetypes: Record<VenueType, string[]> = {
  beach: ['surf/local lifestyle creator', 'travel micro-creator', 'sunset/photography operator'],
  bar: ['nightlife host creator', 'local food/drink reviewer', 'social challenge creator'],
  cafe: ['remote-work creator', 'food/photo creator', 'local routine storyteller'],
  restaurant: ['food reviewer', 'date-night/lifestyle creator', 'local guide'],
  hotel: ['travel creator', 'hospitality reviewer', 'couple/lifestyle creator'],
  gym: ['fitness creator', 'wellness routine creator', 'coach-led micro-creator'],
  event: ['event recap creator', 'street interview creator', 'community host'],
  retail: ['style/product creator', 'local guide', 'demo/review creator'],
};

function clean(value: string, fallback: string) {
  return value.trim() || fallback;
}

function buildAuditPlan(input: {
  venueName: string;
  city: string;
  venueType: VenueType;
  goal: BuyerGoal;
  audience: string;
  vibe: string;
}): AuditPlan {
  const venueName = clean(input.venueName, 'Your venue');
  const city = clean(input.city, 'your city');
  const audience = clean(input.audience, 'locals, visitors, and creators');
  const vibe = clean(input.vibe, 'real-world energy');
  const missions = missionBank[input.venueType];
  const metricGoal =
    input.goal === 'ugc'
      ? 'approved creator clips and repostable moments'
      : input.goal === 'launch'
        ? 'launch proof, first visitors, and creator reach'
        : input.goal === 'event'
          ? 'event attendance proof, timestamps, and recap clips'
          : input.goal === 'repeat_visits'
            ? 'repeat prompts, check-ins, and return intent'
            : 'QR scans, creator visits, and verified proof submissions';

  return {
    headline: `${venueName} Spark Audit`,
    positioning: `${venueName} should not buy generic influencer posts. It should run a proof-backed creator mission in ${city} that turns ${vibe} into content ${audience} can understand fast.`,
    missions,
    creators: creatorArchetypes[input.venueType],
    proofMetrics: [
      'approved creator proofs',
      'QR/check-in scans',
      'proof timestamps',
      'creator handles and content links',
      metricGoal,
    ],
    qrMechanic: `Put one BaseDare QR at the highest-intent moment: entry, bar, counter, table card, reception, or event check-in. The QR should say: "This place is live. Scan to prove you were here."`,
    offer: 'Start with a 7-day First Spark Pilot: 3-5 creator missions, 8+ proof target, owned content, and one Spark Receipt that decides whether to repeat or scale.',
    summary: [
      `Spark Audit for ${venueName} in ${city}`,
      `Category: ${venueTypeLabels[input.venueType]}`,
      `Goal: ${goalLabels[input.goal]}`,
      `Audience: ${audience}`,
      `Vibe/story: ${vibe}`,
      `Pilot offer: 7-day First Spark Pilot with 3-5 creator missions and 8+ proof target.`,
      `Proof metrics: approved proofs, QR/check-ins, timestamps, creator handles, content links.`,
      `Mission ideas: ${missions.map((mission) => mission.title).join(', ')}.`,
      `Creator fit: ${creatorArchetypes[input.venueType].join(', ')}.`,
    ].join('\n'),
  };
}

export default function SparkAuditGenerator() {
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [venueType, setVenueType] = useState<VenueType>('beach');
  const [goal, setGoal] = useState<BuyerGoal>('foot_traffic');
  const [audience, setAudience] = useState('');
  const [vibe, setVibe] = useState('');
  const [copied, setCopied] = useState(false);

  const audit = useMemo(
    () => buildAuditPlan({ venueName, city, venueType, goal, audience, vibe }),
    [audience, city, goal, venueName, venueType, vibe]
  );

  const routeParams = useMemo(() => {
    const params = new URLSearchParams({
      buyerType: 'venue',
      packageId: 'pilot-drop',
      budgetRange: '500_1500',
      goal,
      source: 'spark-audit',
      auditBrief: audit.summary,
    });
    if (venueName.trim()) params.set('venue', venueName.trim());
    if (city.trim()) params.set('city', city.trim());
    return params.toString();
  }, [audit.summary, city, goal, venueName]);

  const copyAudit = async () => {
    try {
      await navigator.clipboard.writeText(audit.summary);
      void trackActivationFunnelEvent({
        eventType: 'ACTIVATION_SPARK_AUDIT_USED',
        target: 'copy-audit',
        channel: 'spark-audit',
        attribution: {
          venueName: venueName.trim() || null,
          packageId: 'pilot-drop',
          budgetRange: '500_1500',
          goal,
          buyerType: 'venue',
          source: 'spark-audit',
        },
        metadata: {
          venueType,
          city: city.trim() || null,
          hasAudience: Boolean(audience.trim()),
          hasVibe: Boolean(vibe.trim()),
        },
      });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="spark-audit" className={`${panelClass} mt-8 p-5 sm:p-6 lg:p-7`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(250,204,21,0.14),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(168,85,247,0.12),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

      <div className="relative grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/78">
            <Sparkles className="h-4 w-4" />
            Free Spark Audit
          </div>
          <h2 className="mt-4 text-3xl font-black uppercase italic leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl">
            Turn one venue into a pitch they can see.
          </h2>
          <p className="mt-4 text-sm font-bold leading-6 text-white/58">
            This is the lead magnet: enter a venue, get a creator activation plan, then route it into the
            pilot queue. No extra page. No CRM bloat. Just a sharper sales conversation.
          </p>

          <div className="mt-5 grid gap-3">
            <div>
              <label className={labelClass}>Venue / brand</label>
              <input
                value={venueName}
                onChange={(event) => setVenueName(event.target.value)}
                className={inputClass}
                placeholder="The Cat & Gun, Hideaway, beach club..."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>City / market</label>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className={inputClass}
                  placeholder="Siargao, Sydney, London..."
                />
              </div>
              <div>
                <label className={labelClass}>Venue type</label>
                <select
                  value={venueType}
                  onChange={(event) => setVenueType(event.target.value as VenueType)}
                  className={inputClass}
                >
                  {Object.entries(venueTypeLabels).map(([value, label]) => (
                    <option key={value} className="bg-[#080814]" value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Primary goal</label>
              <select
                value={goal}
                onChange={(event) => setGoal(event.target.value as BuyerGoal)}
                className={inputClass}
              >
                {Object.entries(goalLabels).map(([value, label]) => (
                  <option key={value} className="bg-[#080814]" value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Audience</label>
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                className={inputClass}
                placeholder="surfers, tourists, founders, night crowd..."
              />
            </div>
            <div>
              <label className={labelClass}>Vibe / story</label>
              <input
                value={vibe}
                onChange={(event) => setVibe(event.target.value)}
                className={inputClass}
                placeholder="island ritual, hidden local spot, premium chaos..."
              />
            </div>
          </div>
        </div>

        <div className={`${cardClass} p-4 sm:p-5`}>
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/72">
              Audit preview
            </p>
            <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{audit.headline}</h3>
            <p className="mt-3 text-sm font-bold leading-6 text-white/60">{audit.positioning}</p>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <div className="rounded-[22px] border border-white/[0.08] bg-black/28 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                  Five creator missions
                </p>
                <div className="mt-3 space-y-3">
                  {audit.missions.map((mission) => (
                    <div key={mission.title}>
                      <div className="flex items-center gap-2 text-sm font-black text-white">
                        <CheckCircle2 className="h-4 w-4 text-yellow-100/76" />
                        {mission.title}
                      </div>
                      <p className="mt-1 pl-6 text-xs font-bold leading-5 text-white/46">{mission.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[22px] border border-cyan-200/[0.1] bg-cyan-300/[0.045] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/66">
                    Creator fit
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {audit.creators.map((creator) => (
                      <span
                        key={creator}
                        className="rounded-full border border-white/[0.08] bg-black/26 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/54"
                      >
                        {creator}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-purple-200/[0.1] bg-purple-300/[0.045] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-100/66">
                    QR / check-in mechanic
                  </p>
                  <p className="mt-2 text-xs font-bold leading-5 text-white/54">{audit.qrMechanic}</p>
                </div>

                <div className="rounded-[22px] border border-emerald-200/[0.1] bg-emerald-300/[0.045] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/66">
                    Proof metrics
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {audit.proofMetrics.map((metric) => (
                      <span
                        key={metric}
                        className="rounded-full border border-white/[0.08] bg-black/26 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/54"
                      >
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-yellow-200/12 bg-yellow-300/[0.055] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100/70">
                Recommended offer
              </p>
              <p className="mt-2 text-sm font-black leading-6 text-white">{audit.offer}</p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void copyAudit()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-5 text-xs font-black uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/[0.09] hover:text-white"
              >
                <Clipboard className="h-4 w-4" />
                {copied ? 'Copied audit' : 'Copy audit'}
              </button>
              <Link
                href={`/activations?${routeParams}#activation-intake`}
                data-activation-track="use-spark-audit-as-pilot-brief"
                data-activation-channel="spark-audit"
                onClick={() => {
                  void trackActivationFunnelEvent({
                    eventType: 'ACTIVATION_SPARK_AUDIT_USED',
                    target: 'use-as-pilot-brief',
                    channel: 'spark-audit',
                    attribution: {
                      venueName: venueName.trim() || null,
                      packageId: 'pilot-drop',
                      budgetRange: '500_1500',
                      goal,
                      buyerType: 'venue',
                      source: 'spark-audit',
                    },
                    metadata: {
                      venueType,
                      city: city.trim() || null,
                      hasAudience: Boolean(audience.trim()),
                      hasVibe: Boolean(vibe.trim()),
                    },
                  });
                }}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-yellow-200/24 bg-yellow-300 px-5 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200"
              >
                Use this as pilot brief
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
