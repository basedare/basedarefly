import assert from "node:assert/strict";
import { test } from "node:test";
import { momentReleaseOptions } from "./moment-release";
test("new submissions and private originals require separate exact operator opt-ins", () => {
  assert.deepEqual(momentReleaseOptions({}), {
    socialLinks: false,
    originalMedia: false,
  });
  assert.deepEqual(
    momentReleaseOptions({
      MOMENT_SUBMISSIONS_ENABLED: "TRUE",
      MOMENT_ORIGINAL_MEDIA_ENABLED: "true",
      PINATA_JWT: "fixture",
    }),
    { socialLinks: false, originalMedia: false },
  );
  assert.deepEqual(
    momentReleaseOptions({
      MOMENT_SUBMISSIONS_ENABLED: "true",
      PINATA_JWT: "fixture",
    }),
    { socialLinks: true, originalMedia: false },
  );
  assert.deepEqual(
    momentReleaseOptions({
      MOMENT_SUBMISSIONS_ENABLED: "true",
      MOMENT_ORIGINAL_MEDIA_ENABLED: "true",
    }),
    { socialLinks: true, originalMedia: false },
  );
  assert.deepEqual(
    momentReleaseOptions({
      MOMENT_SUBMISSIONS_ENABLED: "true",
      MOMENT_ORIGINAL_MEDIA_ENABLED: "true",
      PINATA_JWT: "fixture",
    }),
    { socialLinks: true, originalMedia: true },
  );
});
