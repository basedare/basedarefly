# Moments production cutover — 31 October 2026

## Result and scope

PR40 merged at `9ca1e6d41ebc7e4f2b0dd2ec244d5e27f5544735`. Its first production deployment correctly stopped at the read-only database gate; the prior healthy deployment stayed live. The founder explicitly requested fixing that blocked deployment and finishing the hardening task.

The sole pending migration, `20261029100000_adventure_moments`, is now applied and registered in the production Prisma ledger. The read-only release gate passes **61 migrations / 78 models**; all **78 application tables** retain RLS. No customer submission, paid record, balance, contract or campaign was changed by the migration. There were zero AdventureSubmission rows before the cutover.

Before production mutation, a private custom-format backup of the entire public application schema, data, policies and grants was restored into a password-protected disposable PostgreSQL instance. All 79 public tables (including the migration ledger) restored successfully. The exact migration succeeded on that restored backup; unaffected table digests and submission counts stayed identical, and the new constraints and RLS were checked. Supabase-managed auth/storage schemas are outside this application-only migration and backup scope. The verified backup and detailed receipts are retained privately outside Git; no customer data or credentials are included here.

Backup SHA-256: `95ec9fc0338f19dd0a1f7d195b5569686155a43997d4804e15d4206cac7a8292` (424,572 bytes).

Production SQL ran in one transaction with a five-second lock timeout and a thirty-second statement timeout. It first locked the affected table and checked the expected old schema, unchanged row count, RLS and absence of unresolved migrations. Prisma's explicit `migrate resolve --applied` registered the unchanged reviewed migration afterward. Never replay the SQL if ledger registration alone needs recovery. Builds still do not run migrations automatically.

## Hardening completed

- Independent server write switches default off: `MOMENT_SUBMISSIONS_ENABLED` and `MOMENT_ORIGINAL_MEDIA_ENABLED`. Both are explicitly false in production. Existing reads, reports and owner withdrawal remain available while new submissions are paused. Free guest play is unaffected.
- The contribution page checks actual server availability before asking for sign-in. Failed availability reads offer retry; unavailable original uploads are hidden. TikTok/Instagram short-link guidance appears before sign-in. No redirect resolver or scraping was added.
- SDK upload/signing waits are bounded to twelve seconds, alongside existing bounded private gateway fetches. Private failures never fall back to public upload. This bounds the app's wait; it cannot cancel an already-running SDK upload, so a late private orphan may need operator cleanup.
- Founder attribution no longer reports a complete linked-start count when either the starts or Moment-touch input exceeds the 10,000-row sample. The actual database regression fails against the old implementation and passes with this fix.
- Migration tests now generate actual old/new Prisma readers, preserve legacy and paid-proof fixtures, restore a real backup, inject a late SQL failure to verify full transaction rollback, exercise explicit ledger registration, repeat normal Prisma deploy, and check constraints, indexes and browser-role denial.
- Business HTTP checks cover three distinct guest enquiries, retry deduplication, private saved reviews, chunked-body limits, and authorized NEEDS_INFO/operator-note updates without setting a price or sending a message.

## Verification and limits

The release's local checks pass: eight Moment/release/storage tests, expanded real PostgreSQL route/migration/privacy tests, real signed optimized HTTP Moment and business journeys, typecheck, lint with zero errors, static safety, optimized build and Graphify. The preceding hardening run also covered discovery (70), business policies (25), URI security (3), validation/provider compatibility (4), Passport/buyer DB checks and 19 contract tests. Remote CI remains the source of truth for the final pushed revision. The production dependency audit has no high/critical findings; moderate/low advisories remain.

The production database checks above are genuine production evidence. HTTP fixture users, reviews, RSVPs, enquiries and sponsor drafts are disposable local records and are not traction, revenue, attendance or chain receipts. The ordinary preview database targets the same Supabase project as production (transaction pool rather than session port), so no hosted write rehearsal was performed there. A separate temporary rehearsal database/project was prepared during the earlier run, but its full hosted journey is not certified. No production fixture records were inserted.

Private provider file playback, physical iOS/Android recovery and installed-app sharing remain unverified. Both new-write switches stay off until the relevant checks and founder moderation operation are ready. Paid mainnet funding/payout/refund and legacy FUNDING reconciliation remain separate gates.

## Rollout and recovery

Ship the tested hardening revision through main after clean CI; verify the production deployment's exact source revision and the live business, challenge, Moments, FAQ and map routes. The options endpoint must report both switches false and a new submission must return a truthful paused response. A successful build alone is insufficient. Record the actual deployment receipt after completion.

Leave the additive schema intact on application rollback. An old reader cannot handle new nullable/social submissions. While writes remain off and the affected table is empty, the known prior app remains a viable fallback; after new contributions exist, prefer a forward fix and explicitly verify all public/private readers before any rollback. Stop new writes/publication on privacy, withdrawal, data-compatibility or paid-guard regressions. Never delete contributions to make an old reader work.

## Physical device acceptance before opening contributions

On one real iPhone/Safari and Android/Chrome: start as guest, refresh/resume, finish without sign-in, open the exact optional submission, sign in/reconnect, return to the same activity, submit a consented canonical source, review it, share its actual Moment into an installed messaging app, open as a different participant and start fresh. Withdraw and confirm page/card/media access is revoked. Test report/review and recovery after cancellation/network failure. Keep originals disabled until the genuine private upload/owner/admin/public/revocation checks also pass.
