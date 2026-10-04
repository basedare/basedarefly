'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import MeetupComposerSheet from '@/components/maps/MeetupComposerSheet';

export default function MeetHereButton(props: { venueId: string; venueSlug: string; venueName: string; latitude: number; longitude: number; timeZone?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return <>
    <button id="meet-here" type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-violet-200/24 bg-violet-300/[0.1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_0_rgba(0,0,0,0.4)]"><Users className="h-4 w-4" />Meet here</button>
    {open ? <MeetupComposerSheet {...props} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); router.push(`/map?place=${encodeURIComponent(props.venueSlug)}`); }} /> : null}
  </>;
}
