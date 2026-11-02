import { Suspense } from 'react';
import ConfirmUpdates from './ConfirmUpdates';
export const metadata = { title: 'Your email choice | BaseDare', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function Page() { return <Suspense fallback={<p className="p-8">Opening your email choice…</p>}><ConfirmUpdates /></Suspense>; }
