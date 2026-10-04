'use client';

import { QrCode } from 'lucide-react';

export default function VenueCheckInButton({ venueName, live }: {
  venueId: string; venueName: string; live: boolean; perkTitle?: string | null;
}) {
  if (!live) return <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">Verified check-in is unavailable here. You can still meet up or share an update.</p>;
  return <details className="rounded-[22px] border border-yellow-200/25 bg-yellow-300/[0.06] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
    <summary className="min-h-11 cursor-pointer text-sm font-bold text-yellow-100"><QrCode className="mr-2 inline h-5 w-5" />Scan the venue QR</summary>
    <p className="mt-2 text-sm leading-6 text-white/75">At {venueName}, ask staff for the live BaseDare QR. Scan it with your phone camera, open the link and allow location to verify your visit.</p>
    <p className="mt-2 text-xs leading-5 text-white/55">The code changes regularly. A saved screenshot may expire. On a computer, use your phone to scan the venue display.</p>
  </details>;
}
