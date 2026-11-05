import { notFound } from 'next/navigation';
import Link from '@/components/DiscoveryLink';
import { publicStory } from '@/lib/community-stories';
import StoryManagement from '@/components/community/StoryManagement';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Community experience | BaseDare', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const story = await publicStory((await params).id); if (!story) notFound();
  return <main className="bd-page-top mx-auto max-w-3xl px-4 pb-12 text-white"><Link className="inline-flex min-h-12 items-center font-bold text-cyan-100" href="/now">← Back to the Pulse</Link><article className="bd-surface mt-4 p-5 sm:p-8"><p className="text-sm text-cyan-100">{story.submittedBy} · Community experience</p><h1 className="mt-4 text-3xl font-black sm:text-4xl">{story.title}</h1><p className="mt-5 whitespace-pre-line break-words text-lg leading-8 text-white/80">{story.notes}</p><p className="mt-5 text-sm leading-6 text-white/60">A personal experience reviewed for public display. This is not an official venue announcement or verified visit.</p>{story.venueSlug ? <div className="mt-5 flex flex-wrap gap-3"><Link href={'/venues/' + story.venueSlug} className="bd-action min-h-12 !text-sm">Explore {story.venueName}</Link><Link href={'/map?place=' + encodeURIComponent(story.venueSlug)} className="bd-action min-h-12 !text-sm">Show on map</Link></div> : <Link href={'/now?lat=' + story.latitude + '&lng=' + story.longitude + '&areaLabel=' + encodeURIComponent(story.city)} className="bd-action mt-5 min-h-12 !text-sm">Explore this area</Link>}<StoryManagement postId={story.id} /></article></main>;
}
