# Launch readiness and dependency security — 23 October 2026

## Decision

The product supports a founder-assisted free discovery pilot and buyer qualification. It is **not ready to accept paid work**. A successful deployment, green CI or local settlement fixture does not clear the production money gate.

This release patches newly reported production dependency advisories. It does not change product design, identity, evidence rules, financial terms, database schema, runtime secrets, escrow contracts or historical records.

## Security repair

- Next.js runtime: 16.3.8 → **16.4.1**, including its matching environment and SWC packages. The upstream [image optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [cache advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr) and [Server Actions denial of service advisory](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) identify this patched version. Existing sharp is already 0.35.5; that mitigates the image-library issue but is not a reason to retain the affected framework version. The audit result does not establish exploitation of BaseDare.
- DOMPurify: 3.4.10 → **3.4.17**, through the existing PostHog dependency. The [template/shadow-root advisory](https://github.com/advisories/GHSA-cg2g-xh64-v4q7) and related sanitizer advisories are removed from the resolved tree. BaseDare does not directly use the affected sanitizer modes.
- follow-redirects: 1.16.0 → **1.16.1**. The [array header advisory](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8) describes credentials crossing origins; the separate [sensitive header escaping advisory](https://github.com/advisories/GHSA-8r9p-f939-6h3c) has the same patched version.
- Retain the existing ESLint configuration at 16.3.8 and explicitly pin its existing hooks plugin to 7.0.1. This keeps the prior lint behaviour for this runtime security patch. No lint rule, severity, audit threshold or workflow gate is disabled. A compiler-lint upgrade and map/UI refactor are separate work.

The final lock changes only the runtime Next package family and the two production transitive libraries, plus the explicit existing lint-tool pins. Financial, wallet and Prisma dependency versions are unchanged.

`test:http-redirect-security` starts two local HTTP servers and exercises the actual redirect library. Cross-origin object and array headers must strip Authorization, Proxy-Authorization and Cookie while retaining a harmless correlation header; same-origin redirects must retain authentication. The old 1.16.0 library fails the array case by forwarding the fixture Authorization value. All three cases pass with 1.16.1. CI runs this regression after its existing high/critical production audit gate. No real credential or external destination is used.

Final production dependency audit: **0 critical, 0 high, 33 moderate**. The moderate findings largely include inherited wallet SDK chains; several suggested remediations require incompatible major changes or downgrades. Keep a separate compatibility and recovery test plan for that work. This is not a clean dependency audit or independent penetration test.

## Production findings

The www domain resolved to production commit `c26c8b7efb8f6c549c60981f01fa7985c4745462` at audit start, with a READY deployment. Its build and contract CI passed. The external Ops Cron Dispatcher and Launch Smoke Loop have successful recent runs. Those successes are operational evidence, not real payout receipts.

The authenticated production-safety endpoint returned **1 blocker, 5 warnings, 15 passes**. Runtime checks pass for mainnet mode, simulation off, database configuration, admin/cron/internal credentials, proof storage, referee configuration, Telegram configuration, push keys and RLS. RLS configuration covers the actual model inventory; this is not an end-to-end proof that every authorization boundary is correct.

Outstanding findings:

1. **Paid launch blocker:** no bounty bytecode at the configured Base mainnet address `0xF176ec205e5E5777F6B5964bfeD6DE5a57a911E3`. Canonical USDC has code. The public payment-readiness guard correctly remains false.
2. **Venue QR gate:** no dedicated `VENUE_QR_SECRET`. Plan its introduction with the existing session/token policy; do not rotate secrets or invalidate live tokens as an incidental dependency change.
3. **Funding reconciliation:** runtime reports 33 stuck FUNDING records. There are no queued payouts or expired refunds in this snapshot. Preserve and reconcile the old records; do not fabricate settlement or promote them to funded inventory.
4. **Managed work:** the Sprint and paid activation checks remain blocked. No ready Sprint receipt or buyer repeat decision is established. No commercial rights are granted by an enquiry or this release.
5. **Cron warning:** the built-in Vercel schedule is daily, while the existing GitHub dispatcher supplies additional scheduled execution. The source warning alone does not prove cron is broken. No authenticated cron was manually dispatched during this audit because those routes can mutate queues or send alerts.
6. **Recovery and operations:** email recovery remains disabled; a verified sender and inbox recovery trial are needed if enabling it. Physical iPhone/Android passkey or wallet reconnect/recovery, actual push delivery and a venue's real QR/GPS arrival remain separate checks. Confirm the public operating entity, monitored support and responsible review/backup before paid recruitment.

Vercel environment metadata was inspected with its existing CLI credentials after the connector denied environment listing. Some sensitive variables are intentionally not exported by the CLI: absence from the exported file is not evidence they are absent at runtime. The authenticated runtime report is the stronger signal for those checks. The temporary private environment export was removed. No secret value is included in this release.

## Verification

Local checks on Node 22:

- Production Next build and both app/test typechecks.
- Static production safety, live refund safeguards, discovery, usability, community identity, creator onboarding, buyer/rights policy and Prisma configuration regressions.
- Disposable PostgreSQL intake, claim, content upload, rights, review, appeal and simulated settlement tests. Expected rejected writes are part of the negative tests.
- Disposable PostgreSQL plus a local Hardhat chain: funding registration, 96/4 payout, refund, duplicate callbacks and invalid-funding cases. These are local mock-token transactions, not Base mainnet transfers or a complete real proof/recovery journey.
- Three redirect security regressions, including the old-library negative control.
- Graphify rebuild and whitespace/diff checks.

Live browser checks on the pre-release production build:

- Signed-out Join → eligible adventure → Start; General Luna/Asia-Manila retained.
- Refresh resumes the guest run at 0/3 steps without sign-in. The private test run was stopped; no completion, public post, verified visit or reward was created.
- 390px and 320px widths have no horizontal overflow on that adventure journey.
- Sydney map loads at the explicit city and retains Sydney. At 320px the map starts below navigation, search/filter tools expand over it and have a Back to map control. No claim of confirmed local events or live crowds is inferred from map coverage.
- Ten unauthenticated sensitive/admin/cron requests return HTTP 401. The separately authenticated production report is read-only. No authenticated mutation endpoint was invoked.

CI, preview and production verification must refer to the actual release commit. A local build skips the production database compatibility gate by design. The Vercel production build must run that read-only compatibility gate before release.

## Remaining human money step

Use [the guarded mainnet cutover runbook](../runbooks/mainnet-cutover.md) and the prepared operator handoff. Roles and limits were confirmed on 20 October: owner `0xd5764683C464cAA1B23e97a2D63B1e46Dd59ebfd`, fee treasury `0x60952546f6C6F092CA4866fC7cf6bf12269D002f`, referee `0x4C39D9c061C064D72df2C7e314186A8dBBeE45eC`; 10 USDC gross rehearsal funding and 0.001 ETH total gas cap, with the separate unchanged 0.005 ETH deployer reserve requirement. Refresh balances and estimates before signing; no balance from an earlier report is current proof.

The runbook states: **“Only the human operator runs this command because it signs a real Base mainnet transaction and deploys a contract that can custody real USDC.”** Human deployment, owner/token/fee/referee verification, runtime cutover, one real payout, one supported refund and reconciliation remain required. No signing, transfer, invoice collection, production configuration change or contract deployment occurred in this release.

## Rollback

Stop invitations if the guest entry, session continuity, intake or map regresses. Keep paid work blocked. Preserve all existing records, consent rows, QR sessions and receipts. Returning to the previous vulnerable framework or redirect library is not a clean security rollback; prefer a forward repair or an explicitly reviewed containment decision. No database rollback is needed for this release.
