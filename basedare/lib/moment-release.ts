/** Runtime write switches. Configuration is an operator decision, not provider verification. */
export function momentReleaseOptions(
  env: Record<string, string | undefined> = process.env,
) {
  const socialLinks = env.MOMENT_SUBMISSIONS_ENABLED === "true";
  return {
    socialLinks,
    originalMedia:
      socialLinks &&
      env.MOMENT_ORIGINAL_MEDIA_ENABLED === "true" &&
      Boolean(env.PINATA_JWT),
  };
}
export const MOMENT_SHARING_PAUSED =
  "Sharing is not open yet. Your adventure and saved progress are still available. Please try again later.";
export const MOMENT_FILES_PAUSED =
  "Original uploads are not open yet. You can submit a supported public post link instead.";
