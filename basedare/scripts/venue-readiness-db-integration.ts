import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import { getPublicVenueTagWhere, publicVenueDareWhere } from '@/lib/public-venue-evidence';
import { getApprovedTagSummaryMap, getRecentApprovedPlaceTagsByVenueId } from '@/lib/place-tags';

async function main() {
  const venue = await prisma.venue.create({ data: { slug: 'evidence-test', name: 'Evidence test', latitude: 0, longitude: 0 } });
  const good = await prisma.dare.create({ data: { title: 'Film this cafe', bounty: 10, venueId: venue.id, txHash: '0x' + 'a'.repeat(64), onChainDareId: '1', status: 'VERIFIED' } });
  const fake = await prisma.dare.create({ data: { title: 'Phase5 test dare', bounty: 0, venueId: venue.id, status: 'VERIFIED' } });
  const unfunded = await prisma.dare.create({ data: { title: 'Unfunded history', bounty: 10, venueId: venue.id, status: 'VERIFIED' } });
  const simulated = await prisma.dare.create({ data: { title: 'Simulated history', bounty: 0, isSimulated: true, venueId: venue.id, status: 'VERIFIED' } });
  const base = { venueId: venue.id, walletAddress: 'guest', proofMediaUrl: '/photo.png', status: 'APPROVED' };
  await prisma.placeTag.createMany({ data: [
    { ...base, caption: 'real direct update' },
    { ...base, caption: 'real paid update', linkedDareId: good.id, source: 'DARE_COMPLETION' },
    { ...base, caption: 'seeded', source: 'SEEDED_MEMORY' },
    { ...base, caption: 'seeded legacy hash', proofHash: 'seeded:old:1' },
    ...[fake, unfunded, simulated].map(d => ({ ...base, caption: d.title, source: 'DARE_COMPLETION', linkedDareId: d.id })),
    { ...base, caption: 'pending', status: 'PENDING' },
  ] });
  const tags = await getRecentApprovedPlaceTagsByVenueId(venue.id);
  assert.deepEqual(tags.map(t => t.caption).sort(), ['real direct update', 'real paid update']);
  const summaries = await getApprovedTagSummaryMap([venue.id]);
  assert.equal(summaries.get(venue.id)?.approvedCount, 2);
  assert.equal(await prisma.placeTag.count({ where: { venueId: venue.id, status: 'APPROVED', ...await getPublicVenueTagWhere() } }), 2);
  assert.equal(await prisma.dare.count({ where: { venueId: venue.id, ...publicVenueDareWhere } }), 1);
  assert.equal(await prisma.placeTag.count({ where: { venueId: venue.id } }), 8, 'Filtering preserves internal audit records');
  console.log('PASS: public history/counts exclude seed, test, simulated and unfunded evidence; real direct and funded work remain; records preserved.');
}
main().finally(() => prisma.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
