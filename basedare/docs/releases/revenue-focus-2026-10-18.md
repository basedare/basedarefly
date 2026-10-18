# Optional memories and a clearer business brief journey

18 October 2026. Application release; paid launch remains gated.

## Behavior

- My activity no longer embeds the full Adventure Passport or includes it among its primary action buttons. A quiet Memories / Passport link preserves the existing feature, journal, routes, explicit account saves and evidence projections.
- Adventure completion prioritizes another eligible adventure, an invitation or a group plan. Downloadable memories and optional public media sharing load on request; there is no automatic Passport destination. Personal completion still awards no cash, Signal Points or verified presence.
- Signed-out and first-run buyers can choose a place-bound content brief or funded local activity. Short enquiries reuse the existing intake with optional budget/timing, 16px input text, clear scope and contact fields, and no wallet requirement. The $2,500 Field Sprint remains a separate disclosed offer.
- Content/activity enquiries retain distinct dedupe keys and their actual requested scope. Preferred timing does not become a slow-window rescue. Their review page does not inherit the First Spark proof-night offer or a default payment checkout. Requesting work neither reserves contributors nor grants media rights.
- Buyer reads fail visibly and offer retry. Both profile and work reads must succeed before displaying a snapshot. New accounts are offered registration only after an explicit NOT_FOUND response. Wallet changes clear prior snapshots, draft selection and contributor shortlists; late reads and registration responses cannot attach to another wallet.

## Verification

- Production build passes.
- Application and test typechecks pass. Test configuration now includes the existing ambient declaration files required by server policy imports.
- Discovery suite: 55 passing tests.
- Revenue focus / financial canon / content / return-path suite: 22 passing tests, including malformed/failed reads, wrong-wallet data, cancellation, neutral enquiry pricing, distinct intent dedupe, legacy pilot preservation and exact-scope review.
- Disposable PostgreSQL route integration passes: actual intake create/retry, separate enquiry kinds and stored review scope. External fetch is disabled for this test. Existing delivery integration passes consent immutability/RLS, claims, upload recovery, rejection/appeal, simulated settlement idempotency, costs and notification destinations. Its stale claim fixture now includes explicit database-only funding evidence, after first asserting that an unfunded reward is blocked. No real chain transaction or customer/operator message was sent.
- Static production safety, wallet/venue usability and community identity checks pass.
- Full lint: zero errors, 221 warnings. These include existing image and React/compiler warnings.
- Phone browser checks at 390px and 320px cover enquiry entry, content/activity scope, collapsed budget/timing, neutral budget default, adventure start/completion, optional memory disclosure, invitation destination/city and signed-out My activity. No horizontal document overflow was observed. These are browser viewport checks, not physical phone acceptance.
- Fresh production-build browser check passes at 1440 × 1000: both buyer entries, accurate payment-unavailable state, separate canonical Field Sprint disclosure and no horizontal overflow. An earlier development tab stalled; a fresh tab running the completed production build recovered normally.

## Scope and remaining gates

No dependency, schema, migration, production environment, wallet authorization, escrow, proof decision or payout policy changes. Existing creator work reputation and payment history remain intact. Do not claim revenue, paid demand or automatic commercial rights from an enquiry.

Local browser configuration lacks production wallet/auth/provider settings; analytics/database transport could not be confirmed there. Production configuration is not changed to work around this. No live request was submitted. Human-signed mainnet deployment/cutover, reviewed commercial rights, real funding/payout/refund receipts and physical-device recovery/push checks remain separate gates.

## Release and rollback

Ship through the existing reviewed PR → main → Vercel path after clean CI. Verify signed-out business entry, both enquiry forms, My activity and Adventures on the deployed main commit. Confirm the production payment-readiness state is accurately displayed. Do not create a real enquiry just to test the page.

Rollback this application commit if saved adventure progress becomes inaccessible, enquiry scope/intent is lost, buyer reads show another account's state or controls clip. Existing records and Passport data need no rollback migration. Never restore old payment availability by weakening the guards.

CI portability: the revenue database harness uses its own socket directory and startup log, matching the existing Passport harness and avoiding Ubuntu system-directory permissions.
