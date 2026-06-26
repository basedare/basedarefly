// Seed the Siargao Pack + its marks. Secret words are HASHED, never stored plaintext.
// Reads marks from scripts/pack-seed.local.json (gitignored) so real words never hit git.
// Prod DB write — run deliberately:  node scripts/seed-pack.mjs
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const normalize = (w) => String(w).trim().toLowerCase().replace(/\s+/g, ' ');
const hashWord = (w) => createHash('sha256').update(normalize(w)).digest('hex');

const PACK = { slug: 'siargao', name: 'Siargao Pack' };

async function main() {
  const seedPath = join(here, 'pack-seed.local.json');
  if (!existsSync(seedPath)) {
    console.error('Missing scripts/pack-seed.local.json (gitignored). Copy scripts/pack-seed.example.json,');
    console.error('rename to pack-seed.local.json, fill in your marks + words, then re-run.');
    process.exit(1);
  }
  const marks = JSON.parse(readFileSync(seedPath, 'utf8'));

  const pack = await prisma.pack.upsert({
    where: { slug: PACK.slug },
    update: { name: PACK.name },
    create: { slug: PACK.slug, name: PACK.name },
  });
  console.log(`Pack: ${pack.name} (${pack.slug})`);

  for (const m of marks) {
    if (!m.slug || !m.name || !m.word) {
      console.warn('skip (need slug/name/word):', m);
      continue;
    }
    await prisma.mark.upsert({
      where: { packId_slug: { packId: pack.id, slug: m.slug } },
      update: { name: m.name, wordHash: hashWord(m.word), artUrl: m.artUrl ?? null },
      create: { packId: pack.id, slug: m.slug, name: m.name, wordHash: hashWord(m.word), artUrl: m.artUrl ?? null },
    });
    console.log(`  mark: ${m.name}  →  /p/${pack.slug}/m/${m.slug}`);
  }
  console.log('Done — words hashed, not stored.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
