import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [venues, dares] = await Promise.all([
    prisma.venue.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
    }),
    prisma.dare.findMany({
      where: {
        shortId: { not: null },
        status: { not: 'PENDING' },
      },
      select: { shortId: true, updatedAt: true },
    }),
  ]);

  return [
    {
      url: 'https://basedare.xyz',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://basedare.xyz/map',
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: 'https://basedare.xyz/creators',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://basedare.xyz/verify',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.75,
    },
    {
      url: 'https://basedare.xyz/leaderboard',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.75,
    },
    {
      url: 'https://basedare.xyz/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://basedare.xyz/faq',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.45,
    },
    {
      url: 'https://basedare.xyz/privacy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: 'https://basedare.xyz/terms',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...venues.map((venue) => ({
      url: `https://basedare.xyz/venues/${venue.slug}`,
      lastModified: venue.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...dares
      .filter((dare) => Boolean(dare.shortId))
      .map((dare) => ({
        url: `https://basedare.xyz/dare/${dare.shortId}`,
        lastModified: dare.updatedAt,
        changeFrequency: 'hourly' as const,
        priority: 0.6,
      })),
  ];
}
