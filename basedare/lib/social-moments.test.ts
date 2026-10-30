import assert from "node:assert/strict";
import { test } from "node:test";
import { momentSubmissionHref } from "./adventure-sharing";
import { publicSocialPost, socialPostIdentity } from "./social-post-url";
import {
  publicMomentAllowed,
  momentCreditAllowed,
  MOMENT_REVIEW_DETAIL,
} from "./adventure-evidence";
import { boundedRequestBytes } from "./bounded-request";
import { validateMomentFile } from "./moment-media";
import { SponsoredBriefSchema, sponsoredBriefState } from "./sponsored-brief";

test("social post allowlist canonicalizes only supported public-post paths without fetching", () => {
  const cases = [
    [
      "https://www.instagram.com/reels/AbcDE123/?utm_source=foo#x",
      "https://www.instagram.com/reel/AbcDE123/",
    ],
    [
      "https://instagram.com/p/AbcDE123",
      "https://www.instagram.com/p/AbcDE123/",
    ],
    [
      "https://www.tiktok.com/@alice/video/1234567890123456789?lang=en",
      "https://www.tiktok.com/@alice/video/1234567890123456789",
    ],
    [
      "https://twitter.com/Alice/status/1234567890123?s=2",
      "https://x.com/alice/status/1234567890123",
    ],
  ];
  for (const [source, expected] of cases)
    assert.equal(publicSocialPost(source)?.url, expected);
  for (const value of [
    null,
    {},
    '<iframe src="https://x.com/a/status/12345">',
    "http://x.com/a/status/12345",
    "https://localhost/a/status/12345",
    "https://127.0.0.1/a/status/12345",
    "https://x.com.evil.com/a/status/12345",
    "https://x.com@evil.com/a/status/12345",
    "https://user:pass@x.com/a/status/12345",
    "https://x.com:444/a/status/12345",
    "https://vm.tiktok.com/test/",
    "https://instagram.com/alice",
    "https://x.com/a/status/12345/photo/1",
    "https://instagram.com/reel/%3Cscript%3E/",
    "x".repeat(1025),
  ])
    assert.equal(publicSocialPost(value), null, String(value));
  assert.equal(
    socialPostIdentity(
      publicSocialPost("https://x.com/alice/status/123456789")!,
    ),
    socialPostIdentity(publicSocialPost("https://x.com/bob/status/123456789")!),
  );
  assert.equal(
    socialPostIdentity(publicSocialPost("https://instagram.com/p/AbcDE123/")!),
    socialPostIdentity(
      publicSocialPost("https://instagram.com/reel/AbcDE123/")!,
    ),
  );
});
test("creative review and source consent cannot manufacture location, task or outcome verification", () => {
  const row = {
    status: "APPROVED",
    publicConsentVersion: "adventure-display-v2",
    socialUrl: "https://x.com/a/status/12345",
    creatorCreditConsent: false,
  };
  assert.equal(publicMomentAllowed(row), true);
  assert.equal(momentCreditAllowed(row), false);
  for (const status of ["PENDING", "FLAGGED", "REJECTED", "WITHDRAWN"])
    assert.equal(publicMomentAllowed({ ...row, status }), false);
  assert.equal(
    publicMomentAllowed({
      ...row,
      venueSlug: "place",
      venue: { status: "PAUSED" },
    }),
    false,
  );
  assert.equal(
    publicMomentAllowed({ ...row, publicConsentVersion: "unknown" }),
    false,
  );
  assert.equal(
    momentCreditAllowed({
      publicConsentVersion: "adventure-display-v1",
      creatorCreditConsent: null,
    }),
    true,
  );
  assert.match(MOMENT_REVIEW_DETAIL, /doesn’t verify/);
});
test("actual stream bytes enforce upload bounds even when Content-Length is absent or false", async () => {
  assert.deepEqual(
    [
      ...(await boundedRequestBytes(
        new Request("https://test.invalid", {
          method: "POST",
          body: new Uint8Array([1, 2, 3]),
        }),
        3,
      )),
    ],
    [1, 2, 3],
  );
  const req = new Request("https://test.invalid", {
    method: "POST",
    headers: { "Content-Length": "1" },
    body: new Uint8Array(20),
  });
  await assert.rejects(() => boundedRequestBytes(req, 10), /BODY_TOO_LARGE/);
  const chunks = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(6));
      c.enqueue(new Uint8Array(6));
      c.close();
    },
  });
  await assert.rejects(
    () =>
      boundedRequestBytes(
        new Request("https://test.invalid", {
          method: "POST",
          body: chunks,
          duplex: "half",
        } as RequestInit),
        10,
      ),
    /BODY_TOO_LARGE/,
  );
});
test("original upload validation rejects HTML/SVG and mismatched file signatures", async () => {
  for (const type of [
    "image/jpeg",
    "image/png",
    "image/gif",
    "video/mp4",
    "video/webm",
    "image/svg+xml",
    "text/html",
  ])
    assert.ok(
      await validateMomentFile(
        new File(["<html>not a photo</html>"], "fake.jpg", { type }),
      ),
    );
  assert.equal(
    await validateMomentFile(
      new File(
        [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
        "photo.png",
        { type: "image/png" },
      ),
    ),
    null,
  );
  assert.ok(
    await validateMomentFile(
      new File([new Uint8Array(4194305)], "big.png", { type: "image/png" }),
    ),
  );
});
test("sponsored terms are bounded, proposed and incapable of enabling payouts or publication", () => {
  const draft = {
    requestId: "acb0a576-6a7e-4d56-8f70-f2b14251b918",
    sponsor: "Fixture only",
    objective: "Proposed creator campaign",
    activityId: "wave-or-ex",
    audience: "Local creators",
    deliverable: "One original vertical video",
    platforms: ["INSTAGRAM"],
    evidencePolicy: "Original post + rights review",
    reviewCriteria: "Human review before contract acceptance",
    rightsTerms: "Proposed terms only; no license accepted",
    startsOn: "2026-11-01",
    endsOn: "2026-11-07",
    model: "FUTURE_VERIFIED_VIEWS",
    proposedBudgetUsd: 100,
    proposedPerCreatorUsd: 10,
    creatorCap: 2,
    postCap: 4,
  };
  const parsed = SponsoredBriefSchema.parse(draft);
  const result = sponsoredBriefState(parsed);
  assert.equal(result.paymentEnabled, false);
  assert.equal(result.publicationStatus, "PRIVATE_DRAFT");
  assert.equal(result.fundingStatus, "NOT_FUNDED");
  assert.equal(result.liabilityCreated, false);
  for (const bad of [
    { ...draft, paymentEnabled: true },
    { ...draft, endsOn: "2026-10-01" },
    { ...draft, proposedPerCreatorUsd: 101 },
    { ...draft, activityId: undefined },
  ])
    assert.equal(SponsoredBriefSchema.safeParse(bad).success, false);
});

test('submission handoff preserves the canonical activity/public source without transferring guest progress', () => {
  const href = momentSubmissionHref('wave-or-ex', 'public-moment-001', 'real-public-place');
  const url = new URL(href, 'https://www.basedare.xyz');
  assert.equal(url.pathname, '/adventures/wave-or-ex/submit');
  assert.equal(url.searchParams.get('moment'), 'public-moment-001');
  assert.equal(url.searchParams.get('place'), 'real-public-place');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['moment','place']);
  assert.equal(momentSubmissionHref('unknown'), '/adventures');
  assert.equal(momentSubmissionHref('wave-or-ex', 'private/value', '../../secret'), '/adventures/wave-or-ex/submit');
});
