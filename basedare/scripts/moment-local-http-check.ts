/** Actual optimized localhost server and signature verification. Never targets production. */
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { buildWalletActionMessage } from "@/lib/wallet-action-auth";
import { spotlightWeek, compareMomentHref } from "@/lib/moment-motivation";
const origin = "http://localhost:3217";
const account = privateKeyToAccount(("0x" + "1".repeat(64)) as `0x${string}`);
async function signed(
  action: string,
  resource = "community",
  signer = account
) {
  const issuedAt = new Date().toISOString();
  const walletAddress = signer.address.toLowerCase();
  return {
    "x-basedare-wallet": walletAddress,
    "x-basedare-wallet-issued-at": issuedAt,
    "x-basedare-wallet-signature": await signer.signMessage({
      message: buildWalletActionMessage({
        walletAddress,
        action,
        resource,
        issuedAt,
      }),
    }),
  };
}
async function main() {
  const options = await fetch(origin + "/api/adventure-submissions/options");
  assert.equal(options.status, 200);
  assert.deepEqual((await options.json()).data, {
    socialLinks: true,
    originalMedia: false,
  });
  // The fixture-only label must be visibly present before any local write.
  const fixture = await fetch(origin + "/moments/moment-browser-approved");
  assert.equal(fixture.status, 200);
  assert.match(await fixture.text(), /Local verification fixture/);
  assert.equal(
    (await fetch(origin + "/moments/moment-browser-pending")).status,
    404
  );
  const wallet = account.address.toLowerCase();
  const form = new FormData();
  for (const [key, value] of Object.entries({
    wallet,
    activityId: "wave-or-ex",
    runId: "http-signed-fixture-run",
    caption: "HTTP signature fixture only — not a real participant.",
    socialUrl: "https://www.instagram.com/reel/HttpFixture01/",
    consent: "adventure-display-v2",
    creatorCreditConsent: "true",
    spotlightConsent: "true",
  }))
    form.set(key, value);
  const submitted = await fetch(origin + "/api/adventure-submissions", {
    method: "POST",
    headers: { Origin: origin, ...(await signed("adventure:submit")) },
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(submitted.status, 200, await submitted.clone().text());
  const id = (await submitted.json()).data.id;
  const mine = await fetch(
    origin + "/api/adventure-submissions?mine=1&wallet=" + wallet,
    { headers: await signed("adventure:read") }
  );
  assert.equal(mine.status, 200);
  assert.ok((await mine.json()).data.some((p: { id: string }) => p.id === id));
  assert.equal((await fetch(origin + "/moments/" + id)).status, 404);
  const login = await fetch(origin + "/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      adminSecret: "local-browser-fixture-admin-secret-2026",
    }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  const reviewed = await fetch(origin + "/api/admin/adventures", {
    method: "PUT",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      status: "APPROVED",
      reason: "Local HTTP fixture reviewed; not real attendance.",
    }),
  });
  assert.equal(reviewed.status, 200, await reviewed.clone().text());
  const publicPage = await fetch(origin + "/moments/" + id);
  assert.equal(publicPage.status, 200);
  const html = await publicPage.text();
  assert.match(html, /Reviewed creation/);
  assert.doesNotMatch(html, /Location verified|Outcome confirmed/);
  const card = await fetch(origin + "/moments/" + id + "/opengraph-image");
  assert.equal(card.status, 200);
  const png = new Uint8Array(await card.arrayBuffer());
  assert.equal(new DataView(png.buffer).getUint32(16), 1200);
  assert.equal(new DataView(png.buffer).getUint32(20), 630);
  const week = spotlightWeek();
  const feature = await fetch(origin + "/api/admin/adventures", {
    method: "PUT",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      featured: true,
      spotlightWeek: week.key,
      reason: "Local signed HTTP weekly selection fixture",
    }),
  });
  assert.equal(feature.status, 200, await feature.clone().text());
  assert.equal((await fetch(origin + week.href)).status, 200);
  const weeklyImage = await fetch(origin + week.href + "/opengraph-image");
  assert.equal(weeklyImage.status, 200);
  assert.equal(
    new DataView(await weeklyImage.arrayBuffer()).getUint32(16),
    1200
  );
  const second = privateKeyToAccount(("0x" + "2".repeat(64)) as `0x${string}`);
  const replyForm = new FormData();
  for (const [key, value] of Object.entries({
    wallet: second.address.toLowerCase(),
    activityId: "wave-or-ex",
    runId: "http-independent-reply-fixture",
    caption: "Local signed independent reply fixture only",
    socialUrl: "https://www.instagram.com/reel/HttpReplyFixture01/",
    consent: "adventure-display-v2",
    parentMomentId: id,
  }))
    replyForm.set(key, value);
  const sentReply = await fetch(origin + "/api/adventure-submissions", {
    method: "POST",
    headers: {
      Origin: origin,
      ...(await signed("adventure:submit", "community", second)),
    },
    body: replyForm,
  });
  assert.equal(sentReply.status, 200, await sentReply.clone().text());
  const replyId = (await sentReply.json()).data.id;
  assert.equal(
    (
      await fetch(origin + "/api/admin/adventures", {
        method: "PUT",
        headers: {
          Cookie: cookie,
          Origin: origin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: replyId,
          status: "APPROVED",
          reason: "Local signed reply review fixture",
        }),
      })
    ).status,
    200
  );
  const comparison = compareMomentHref(id, replyId);
  const compared = await fetch(origin + comparison);
  assert.equal(compared.status, 200);
  assert.match(await compared.text(), /Same dare. Two takes./);
  assert.equal(
    (await fetch(origin + comparison + "/opengraph-image")).status,
    200
  );
  const withdraw = await fetch(origin + "/api/adventure-submissions", {
    method: "DELETE",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(await signed("adventure:withdraw")),
    },
    body: JSON.stringify({ id, wallet }),
  });
  assert.equal(withdraw.status, 200);
  assert.equal((await fetch(origin + "/moments/" + id)).status, 404);
  assert.equal(
    (await fetch(origin + "/moments/" + id + "/opengraph-image")).status,
    404
  );
  for (const revoked of [
    week.href,
    week.href + "/opengraph-image",
    comparison,
    comparison + "/opengraph-image",
  ])
    assert.equal((await fetch(origin + revoked)).status, 404, revoked);
  const emptySpotlight = await fetch(origin + "/moments/spotlight");
  assert.equal(emptySpotlight.status, 200);
  assert.match(await emptySpotlight.text(), /No creation selected for/);
  console.log(
    "PASS: real signed independent reply, weekly selection, dated page/card, two-take page/card and revocation after owner withdrawal. Local fixtures only."
  );
  const sponsor = {
    requestId: "bb232c22-7d02-4de0-9215-14c2f7903859",
    sponsor: "Local HTTP fixture only",
    objective: "Prepare an illustrative fixed deliverable",
    activityId: "coconut-ceo",
    audience: "Consenting creator fixture",
    deliverable: "One original vertical video",
    platforms: ["INSTAGRAM"],
    evidencePolicy: "Original media and permissions review",
    reviewCriteria: "Explicit deliverable acceptance under agreed terms",
    rightsTerms: "Proposed display only; no acceptance or commercial license",
    startsOn: "2026-11-01",
    endsOn: "2026-11-07",
    model: "FIXED_DELIVERABLE",
    proposedBudgetUsd: 100,
    proposedPerCreatorUsd: 50,
    creatorCap: 2,
    postCap: 2,
  };
  const draft = await fetch(origin + "/api/admin/sponsored-briefs", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sponsor),
  });
  assert.equal(draft.status, 200);
  const proposals = await fetch(origin + "/api/admin/sponsored-briefs", {
    headers: { Cookie: cookie },
  });
  assert.equal(proposals.status, 200);
  const terms = (await proposals.json()).data[0].metadataJson;
  assert.equal(terms.paymentEnabled, false);
  assert.equal(terms.publicationStatus, "PRIVATE_DRAFT");
  const growth = await fetch(origin + "/api/admin/moment-growth", {
    headers: { Cookie: cookie },
  });
  assert.equal(growth.status, 200);
  assert.ok(
    (await growth.json()).data.unavailable.includes(
      "Social impressions and views"
    )
  );
  const roomPath =
    origin +
    "/api/live-plans/meetup/moment-browser-meetup/room?walletAddress=" +
    wallet;
  assert.equal((await fetch(roomPath)).status, 401);
  assert.equal(
    (
      await fetch(roomPath, {
        headers: await signed(
          "live-plan-room:read",
          "meetup:moment-browser-meetup"
        ),
      })
    ).status,
    403
  );
  const joined = await fetch(
    origin + "/api/meetups/moment-browser-meetup/rsvp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await signed("meetup:rsvp", "meetup:moment-browser-meetup")),
      },
      body: JSON.stringify({ walletAddress: wallet }),
    }
  );
  assert.equal(joined.status, 200, await joined.clone().text());
  assert.equal(
    (
      await fetch(roomPath, {
        headers: await signed(
          "live-plan-room:read",
          "meetup:moment-browser-meetup"
        ),
      })
    ).status,
    200
  );
  const publicPlan = await fetch(
    origin + "/community/meet/moment-browser-meetup"
  );
  assert.equal(publicPlan.status, 200);
  assert.doesNotMatch(await publicPlan.text(), /private room message fixture/);
  console.log(
    "PASS: actual signed RSVP and Crew Room authorization (401 → 403 → joined → 200), exact public plan, private sponsor draft read/write and honest founder growth endpoint. Local fixture records only; no message sent."
  );
  console.log(
    "PASS: actual optimized HTTP server, EOA action signatures, admin session, pending 404, approval, public receipt, 1200×630 PNG, owner withdrawal and revoked page/card. Local fixtures only; no provider upload, real device or money movement."
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
