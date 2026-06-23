import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: 'https://www.basedare.xyz',
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    url: 'https://www.basedare.xyz/map',
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.9,
  },
  {
    url: 'https://www.basedare.xyz/board',
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.8,
  },
  {
    url: 'https://www.basedare.xyz/activations',
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    url: 'https://www.basedare.xyz/first-spark',
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.92,
  },
  {
    url: 'https://www.basedare.xyz/creators',
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    url: 'https://www.basedare.xyz/verify',
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.75,
  },
  {
    url: 'https://www.basedare.xyz/leaderboard',
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.75,
  },
  {
    url: 'https://www.basedare.xyz/about',
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: 'https://www.basedare.xyz/faq',
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.45,
  },
  {
    url: 'https://www.basedare.xyz/privacy',
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.3,
  },
  {
    url: 'https://www.basedare.xyz/terms',
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.3,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
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
      ...staticRoutes,
      ...venues.map((venue) => ({
        url: `https://www.basedare.xyz/venues/${venue.slug}`,
        lastModified: venue.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      })),
      ...venues.map((venue) => ({
        url: `https://www.basedare.xyz/venues/${venue.slug}/recap`,
        lastModified: venue.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.68,
      })),
      ...dares
        .filter((dare) => Boolean(dare.shortId))
        .map((dare) => ({
          url: `https://www.basedare.xyz/dare/${dare.shortId}`,
          lastModified: dare.updatedAt,
          changeFrequency: 'hourly' as const,
          priority: 0.6,
        })),
    ];
  } catch (error) {
    console.warn('[sitemap] Falling back to static routes because dynamic sitemap data failed to load', error);
    return staticRoutes;
  }
}
