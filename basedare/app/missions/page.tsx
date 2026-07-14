import { Suspense } from 'react';

import MissionsClient from './MissionsClient';

export const metadata = {
  title: 'Your Missions | BaseDare',
  description: 'Resume the BaseDare missions you saved without creating a profile.',
  robots: { index: false, follow: false },
};

export default function MissionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07070b]" />}>
      <MissionsClient />
    </Suspense>
  );
}
