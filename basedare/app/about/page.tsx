import type { Metadata } from 'next';
import Link from 'next/link';
import DiscoveryLink from '@/components/DiscoveryLink';
import { ArrowRight, MapPin, Sparkles, Users } from 'lucide-react';
import { BASEDARE_DESCRIPTION, BASEDARE_INTRO } from '@/lib/product-copy';
import { controlPanel, controlSoftCard } from '@/components/control/tokens';

export const metadata: Metadata = {
  title: 'What is BaseDare? Adventures, meetups and paid missions',
  description: BASEDARE_DESCRIPTION,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return <main className="relative mx-auto max-w-5xl bd-page-top px-4 pb-24 text-white sm:px-6">
    <section className={`${controlPanel} p-6 sm:p-10`}>
      <p className="bd-page-kicker">About BaseDare</p>
      <h1 className="bd-page-title mt-4">Open BaseDare.<br /><span className="text-yellow-300">Find your next move.</span></h1>
      <p className="bd-page-copy mt-5 max-w-2xl">{BASEDARE_INTRO}</p>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">Explore a new place, try something on your own or find people to go with. The map connects activities to venues and public places. Photos and clips are one way to share an experience; filming is optional for free adventures and casual meetups.</p>
      <DiscoveryLink href="/now" className="bd-action bd-action--gold mt-6 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold">Find something to do <ArrowRight size={16} /></DiscoveryLink>
    </section>
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      {[
        { title: 'Free adventures', icon: Sparkles, href: '/adventures', action: 'Try an adventure', text: 'Take the scenic route, find a great photo or try something new. Follow a few simple steps, on your own or with a friend. No sign-in needed to start.' },
        { title: 'Meetups', icon: Users, href: '/community', action: 'Find a meetup', text: 'Find a local plan, arrange a meetup at a place and invite friends. Check the plan for any separate venue or ticket costs.' },
        { title: 'Paid missions', icon: MapPin, href: '/earn', action: 'Find paid work', text: 'Make a café video, document a place or take on another funded brief when available. Read the requirements and reward before requesting the work. Payment follows approval and settlement.' },
      ].map(item => <DiscoveryLink key={item.title} href={item.href} className={`${controlSoftCard} block p-6 hover:border-white/25`}><item.icon className="h-5 w-5 text-yellow-200" /><h2 className="mt-4 text-xl font-black">{item.title}</h2><p className="mt-3 text-sm leading-7 text-white/70">{item.text}</p><span className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-cyan-100">{item.action} <ArrowRight size={14} /></span></DiscoveryLink>)}
    </div>
    <section className={`${controlPanel} mt-5 p-6 sm:p-8`} aria-labelledby="basedare-vision">
      <h2 id="basedare-vision" className="text-xl font-black">Turn “what should we do?” into a reason to go out.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">Our vision is to make worthwhile experiences, connections and opportunities easier to find, wherever you go. We’re starting our local pilot in Siargao. You can explore the map elsewhere; published plans and paid work depend on what is available there.</p>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">Businesses can commission content or fund an activity at a real place. The brief sets the work, reward, evidence and permissions before anyone starts.</p>
    </section>
    <p className="mt-6 text-sm leading-7 text-white/65">Browsing and free adventures do not require payment or crypto staking. Free adventure progress is self-reported; verified visits and paid work have separate checks.</p>
    <div className="mt-4 flex flex-wrap gap-5 text-sm font-bold text-cyan-100"><Link className="min-h-11 py-3" href="/how-it-works">How it works →</Link><Link className="min-h-11 py-3" href="/trust">Trust and safety →</Link></div>
  </main>;
}
