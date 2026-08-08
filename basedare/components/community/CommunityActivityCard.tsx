'use client';

import Link from 'next/link';
import { CalendarDays, MapPin, MessageCircle, Sparkles } from 'lucide-react';

type ActivityKind = 'meetup' | 'ask' | 'offer' | 'hang';

const ACTIVITY_COPY: Record<ActivityKind, { eyebrow: string; action: string; accent: string }> = {
  meetup: { eyebrow: 'Meet nearby', action: 'Open meetup', accent: 'text-violet-200' },
  ask: { eyebrow: 'Local ask', action: 'Reply in place room', accent: 'text-cyan-200' },
  offer: { eyebrow: 'Local offer', action: 'Open place room', accent: 'text-emerald-200' },
  hang: { eyebrow: 'Community hang', action: 'See details', accent: 'text-amber-200' },
};

function formatWhen(value: string | null) {
  if (!value) return 'Happening locally';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Happening locally';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function CommunityActivityCard({
  kind,
  title,
  place,
  startsAt,
  note,
  href,
  author,
}: {
  kind: ActivityKind;
  title: string;
  place: string;
  startsAt: string | null;
  note?: string | null;
  href: string;
  author?: string | null;
}) {
  const copy = ACTIVITY_COPY[kind];
  const external = /^https?:\/\//.test(href);

  return (
    <Link
      href={href}
      prefetch={external ? undefined : false}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="community-activity-card group flex min-h-[12rem] flex-col rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.1),transparent_42%),linear-gradient(160deg,rgba(24,20,42,0.94),rgba(6,8,16,0.98))] p-4 text-left shadow-[0_16px_34px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] transition active:scale-[0.985] md:hover:-translate-y-0.5 md:hover:border-white/20"
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${copy.accent}`}>
          {copy.eyebrow}
        </span>
        <Sparkles className={`h-4 w-4 ${copy.accent}`} aria-hidden="true" />
      </div>

      <h4 className="mt-4 line-clamp-2 text-lg font-black leading-tight text-white">{title}</h4>
      {note ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/52">{note}</p> : null}

      <div className="mt-auto space-y-2 pt-4 text-[10px] font-bold text-white/46">
        <p className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-cyan-200/70" aria-hidden="true" />
          <span className="truncate">{place || 'BaseDare map'}</span>
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-violet-200/70" aria-hidden="true" />
          <span>{formatWhen(startsAt)}</span>
          {author ? <span className="ml-auto truncate text-white/30">{author}</span> : null}
        </p>
      </div>

      <span className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white/76 transition group-hover:bg-white/[0.09] group-hover:text-white">
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.action}
      </span>
    </Link>
  );
}
