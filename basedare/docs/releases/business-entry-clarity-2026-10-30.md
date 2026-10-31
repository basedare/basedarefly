# Business entry clarity — 30 October 2026

## Result

`/brands/portal` and the general `/activations` entry now explain BaseDare in the requested plain language and offer three outcomes: Bring people in, Get creator content, Get more visibility. Choose one, then **Grow my business** opens the existing goal-specific enquiry. The Control homepage and business role card use the same CTA.

Guest enquiries ask for business, area, a short goal-specific brief, name and reply email. Place, planning budget and timing are optional. The proposed plan is reviewed before anything goes live; this form does not register an account, charge, reserve creators, publish an offer or grant content rights. Examples are expressly illustrative. Unapproved prices and invented results are not presented.

The original authenticated brand workspace is retained at `/brands/portal?workspace=1`, with existing targeted venue/campaign/composer/report links preserved. Explicit Field Sprint, First Spark, venue and legacy activation configurations keep their original routes. New entry pages reuse ActivationIntakeForm, the same API, FounderEvent records, admin queue and private review link. No parallel merchant system or business schema migration.

Business enquiries and private review pages bypass decorative loading and optional installation prompts. Phone layouts preserve readable fields and clear touch targets. Once a goal is selected, the short form comes before the full process explanation.

Confirmation requires an actual saved enquiry reference. An empty success or honeypot acknowledgement cannot claim a request was saved. Timeout/errors retain typed details. Saved confirmation receives keyboard/screen-reader focus and scrolls into view when the form collapses. Actual streamed request bytes are capped at 64 KiB, including chunked bodies without Content-Length; invalid JSON returns a readable 400. Existing retry deduplication and guards for agreed/paid work remain.

## Security repair discovered during final CI

The previous social-loop head built on Vercel, but its dependency gate failed on the newly published [decode-uri-component advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f). Pin the patched upstream 0.5.1 through a three-line CommonJS compatibility adapter: old query-string callers require a function, while the maintained patch is ESM. The adapter imports the upstream package unchanged. No wallet-provider major upgrade or audit exemption.

Clean `npm ci`, callable query-string, malformed 224 KB percent input in a timeout-bounded subprocess, actual WalletConnect URI parsing and the optimized webpack build validate compatibility. The existing high/critical audit gate remains active; URI regressions now run in CI. The local audit reports 0 high, 0 critical, 20 moderate, 2 low. Moderate/low advisories remain tracked risk, not a clean dependency tree.

## Verification

- 25 business policy tests: legacy deep links, three distinct goal requests, city handoff, no priced/live action, truthful receipt, safe private review link, existing financial/rights/delivery rules.
- 70 discovery and 6 Moment policy checks; 4 validation/provider compatibility checks.
- Real disposable buyer/payment-state database regressions, including existing enquiry retry/agreed-work guards. Fixture settlement is not an on-chain payment.
- Clean dependency install, Prisma generation, typecheck, full lint (0 errors), static safety and optimized build.
- `scripts/business-local-http-check.ts` targets only the explicit localhost 3217 disposable fixture: all three actual guest POSTs, three separate NEW/unpriced admin records, same-goal retry, saved private review pages, chunked-body 413. Email/Telegram/provider signing keys are blank; no external message is sent.
- Actual browser: all three goals selected and submitted without sign-in, goal-specific prompts, city continuity, actual reference/private review and focus on saved confirmation. No horizontal overflow at 320, 390 or 1440px. The original workspace/on-ramp remains reachable; real connected-account recovery is still unverified. Screenshots are in the task outputs (`business-entry-390.png`, `business-entry-320.png`, `business-entry-desktop.png`, `business-enquiry-saved-390.png`). Remote head/CI state is recorded on PR40.

## Release boundary

PR40 merged with this work and the social Moments migration. Business entry alone needs no new schema. Its initial production build correctly stopped at the database compatibility gate. The required migration was intentionally applied on 31 October after a verified backup restore; [the cutover report](moments-production-cutover-2026-10-31.md) tracks the final hardening rollout. Follow the remaining provider, device and mainnet gates in `docs/launch/FOUNDER_LAUNCH_HANDOFF.md`. No financial transaction, campaign publication or outreach was performed.
