'use client';

import nextDynamic from 'next/dynamic';

const RealWorldMap = nextDynamic(() => import('@/components/maps/RealWorldMap'), {
  ssr: false,
});

export default function RealWorldMapClient() {
  return <RealWorldMap />;
}
