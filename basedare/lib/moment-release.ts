/** Runtime write switches. Configuration is an operator decision, not provider verification. */
export function momentReleaseOptions(
  env: Record<string, string | undefined> = process.env,
  verifiedWallet?: string | null,
  now = Date.now()
) {
  const allowlist = (env.MOMENT_ACCEPTANCE_WALLETS ?? "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  const acceptance =
    momentAcceptanceOpen(env, now) &&
    allowlist.length > 0 &&
    allowlist.length <= 10 &&
    allowlist.every((w) => /^0x[a-f0-9]{40}$/.test(w)) &&
    !!verifiedWallet &&
    allowlist.includes(verifiedWallet.toLowerCase());
  const socialLinks = env.MOMENT_SUBMISSIONS_ENABLED === "true" || acceptance;
  return {
    socialLinks,
    originalMedia:
      socialLinks &&
      (env.MOMENT_ORIGINAL_MEDIA_ENABLED === "true" ||
        (acceptance && env.MOMENT_ACCEPTANCE_ORIGINALS_ENABLED === "true")) &&
      Boolean(env.PINATA_JWT),
  };
}
/** A bounded acceptance window is separate from broad public availability. */
export function momentAcceptanceOpen(
  env: Record<string, string | undefined> = process.env,
  now = Date.now()
) {
  const start = Date.parse(env.MOMENT_ACCEPTANCE_STARTS_AT ?? ""),
    end = Date.parse(env.MOMENT_ACCEPTANCE_UNTIL ?? "");
  return (
    env.MOMENT_ACCEPTANCE_ENABLED === "true" &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end > start &&
    end - start <= 24 * 3600000 &&
    now >= start &&
    now < end
  );
}
export const MOMENT_SHARING_PAUSED =
  "Sharing is not open yet. Your adventure and saved progress are still available. Please try again later.";
export const MOMENT_FILES_PAUSED =
  "Original uploads are not open yet. You can submit a supported public post link instead.";
