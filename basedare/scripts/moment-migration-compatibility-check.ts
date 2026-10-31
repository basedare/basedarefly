/** Real old/new Prisma readers on an explicitly disposable database only. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
const target = new URL(process.env.DATABASE_URL || "");
if (
  target.hostname !== "127.0.0.1" ||
  !target.pathname.startsWith("/basedare_adventure_sharing_test")
)
  throw Error("Disposable compatibility database required");
const clientPath = process.env.LEGACY_MOMENT_CLIENT_DIR!;
if (!clientPath?.includes("basedare-adventure-sharing-db."))
  throw Error("Isolated generated legacy client required");
const LegacyClient = require(clientPath).PrismaClient;
const legacy = new LegacyClient();
const current = new PrismaClient();
const snapshot = path.join(path.dirname(clientPath), "legacy-before.json");
async function main() {
  const phase = process.argv[2];
  if (phase === "before") {
    for (const status of ["PENDING", "APPROVED", "WITHDRAWN"])
      await legacy.adventureSubmission.create({
        data: {
          id: "compat-legacy-" + status,
          wallet: "0x" + "b".repeat(40),
          activityId: "postcard",
          runId: "compat-legacy-run-" + status,
          venueSlug: "legacy-fixture",
          caption: "Disposable legacy compatibility fixture",
          hashtag: "basedarepostcard",
          mediaUrl: "https://example.invalid/legacy-fixture.png",
          mediaType: "IMAGE",
          status,
          publicConsentVersion: "adventure-display-v1",
          promotionContact: false,
        },
      });
    await current.dare.create({
      data: {
        id: "compat-paid-evidence",
        title: "Legacy paid evidence fixture only",
        bounty: 5,
        status: "PENDING",
        isSimulated: true,
        proofHash: "compat-original-proof-hash",
        venueId: "legacy-fixture-venue",
      },
    });
  }
  const rows = await legacy.adventureSubmission.findMany({
    include: { venue: true },
    orderBy: { id: "asc" },
  });
  const paid = await current.dare.findUnique({
    where: { id: "compat-paid-evidence" },
    select: {
      id: true,
      proofHash: true,
      bounty: true,
      status: true,
      isSimulated: true,
      venueId: true,
    },
  });
  const state = JSON.parse(JSON.stringify({ rows, paid }));
  if (phase === "before") {
    fs.writeFileSync(snapshot, JSON.stringify(state), { mode: 0o600 });
    return;
  }
  assert.deepEqual(
    state,
    JSON.parse(fs.readFileSync(snapshot, "utf8")),
    "Legacy records, venue references and paid evidence must survive byte-for-byte",
  );
  if (phase === "restored") {
    console.log(
      "PASS: actual dump/restore preserves legacy submissions and paid evidence. Local only.",
    );
    return;
  }
  const newRows = await current.adventureSubmission.findMany({
    include: { venue: true },
  });
  assert.equal(newRows.length, rows.length);
  for (const row of newRows) {
    assert.equal(row.socialUrl, null);
    assert.equal(row.spotlightConsent, false);
    assert.equal(row.creatorCreditConsent, null);
  }
  const schema = await current.$queryRaw<
    Array<{ relrowsecurity: boolean; priv: boolean }>
  >`SELECT c.relrowsecurity, has_table_privilege('authenticated','"AdventureSubmission"','SELECT') AS priv FROM pg_class c WHERE c.oid='"AdventureSubmission"'::regclass`;
  assert.equal(schema[0].relrowsecurity, true);
  assert.equal(schema[0].priv, false);
  const constraints = await current.$queryRaw<
    Array<{ conname: string; convalidated: boolean }>
  >`SELECT conname, convalidated FROM pg_constraint WHERE conrelid='"AdventureSubmission"'::regclass`;
  for (const name of [
    "AdventureSubmission_source_check",
    "AdventureSubmission_private_mime_check",
    "AdventureSubmission_status_check",
    "AdventureSubmission_parentMomentId_fkey",
  ])
    assert.equal(
      constraints.find((c) => c.conname === name)?.convalidated,
      true,
      name,
    );
  const indexes = await current.$queryRaw<
    Array<{ indexname: string; indexdef: string }>
  >`SELECT indexname,indexdef FROM pg_indexes WHERE tablename='AdventureSubmission'`;
  assert.match(
    indexes.find(
      (i) => i.indexname === "AdventureSubmission_active_sourceKey_key",
    )!.indexdef,
    /UNIQUE.*WHERE/,
  );
  const next = await current.adventureSubmission.create({
    data: {
      id: "compat-new-nullable",
      wallet: "0x" + "c".repeat(40),
      activityId: "postcard",
      runId: "compat-new-nullable-run",
      caption: "Disposable new reader fixture",
      hashtag: "basedarepostcard",
      mediaType: "SOCIAL",
      socialUrl: "https://www.instagram.com/reel/Fixture01/",
      publicConsentVersion: "adventure-display-v2",
    },
  });
  assert.equal(next.venueSlug, null);
  assert.equal(next.mediaUrl, null);
  await assert.rejects(
    () =>
      legacy.adventureSubmission.findUnique({
        where: { id: next.id },
        include: { venue: true },
      }),
    /Inconsistent query result|null|non-nullable/i,
  );
  assert.ok(
    await current.adventureSubmission.findUnique({
      where: { id: next.id },
      include: { venue: true },
    }),
  );
  // Remove only the named synthetic fixtures, after all preservation assertions.
  await current.adventureSubmission.deleteMany({
    where: {
      id: {
        in: [
          "compat-new-nullable",
          "compat-legacy-PENDING",
          "compat-legacy-APPROVED",
          "compat-legacy-WITHDRAWN",
        ],
      },
    },
  });
  await current.dare.delete({ where: { id: "compat-paid-evidence" } });
  console.log(
    "PASS: old/new readers preserve legacy records after migration; constraints/index/RLS survive; old reader correctly refuses new nullable rows. Rollback to it is unsafe once writes open.",
  );
}
main()
  .finally(async () => {
    await legacy.$disconnect();
    await current.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
