import { Suspense } from 'react';
import AdventureHub from '@/components/adventures/AdventureHub';
export const metadata = { title: 'Your next adventure | BaseDare', description: 'Free things to try, at your own pace. Pick an activity, invite a friend and keep a personal trail.' };
export default function AdventuresPage() {
  return <Suspense fallback={<p className="p-12 text-white">Finding your next adventure…</p>}><AdventureHub /></Suspense>;
}
