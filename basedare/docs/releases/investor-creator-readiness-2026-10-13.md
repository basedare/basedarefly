# Investor demonstration and creator onboarding readiness

Audit began 12 October UTC / 13 October Sydney. Baseline production: 57d5a152.

## Decision

14 October follow-up: the npm 10 lockfile repair has passed clean Build and Test, Contracts CI and exact-commit Vercel preview. Phone-width browser verification passed sign-in dismissal/focus and all four guest onboarding steps with honest preview/save labels. The follow-up build removes the Livepeer SDK test-tool tree, upgrades MapLibre with its module worker and adds a read-only funding evidence tool. See `docs/runbooks/controlled-launch-2026-10-14.md` for current acceptance and operator steps; the baseline advisory counts below are historical, not the follow-up result.

The public discovery app is deployed. Do not describe the product as 100% launch-ready or start an unrestricted paid influencer campaign. A working website and green CI do not prove signed sessions, live settlement, recovery delivery or operating readiness.

## Verified baseline

- Vercel production READY on www.basedare.xyz at the exact baseline commit; Build and Test and Contracts CI passed.
- Nineteen public route visits at 390px rendered without document overflow: core discovery, community, onboarding, creator directory, paid-work entry, signed-out activity page, help/contact/legal and a venue page. Map warming-up is an intermediate state; its rendered controls and artwork were separately checked during the preceding release.
- Sign-in chooser and provider list open. Live passkey/session persistence and real phone wallet return are not verified by opening the chooser.
- Ten unsigned admin/Telegram/refund/cron requests were rejected with 401. No authenticated cron job, outreach, email, payment, check-in or public post was triggered.
- Authenticated production preflight: mainnet, simulation off, database and upload configuration present, all 77 checked tables have RLS. Configuration presence is not a delivery or end-to-end proof.
- Free adventure choose/start/steps/complete/device journal was verified in the preceding release; public links preserve area, time and mood.
- Mocked recovery and BaseCash auth checks passed. These are not actual inbox or wallet trials.

## Blocking work, in order

1. **Runtime dependency hardening.** Fresh npm audit flagged critical advisories on the baseline Next.js, NextAuth, MapLibre and transitive Handlebars packages. Counts include transitive packages and are not a count of proven exploitable paths. Candidate updates Next to 16.3.8, NextAuth to 4.24.15 and the matching lint configuration. The lockfile audit removes their direct critical advisories but still reports 2 critical, 54 high, 38 moderate and 1 low package entries. MapLibre's published fix crosses a major version; review renderer/API compatibility and retest camera, controls, labels, attribution and phone performance. Triage Handlebars' dependency path and the remaining advisories before broad launch. No exploit was attempted and no compromise is asserted.
2. **Mainnet escrow.** Production reports bounty bytecode missing at the configured address while canonical USDC bytecode exists. Follow docs/runbooks/mainnet-cutover.md. Human operator confirms owner/treasury/referee separation, signs deployment/referee setup, verifies contract bindings/fees and supplies the deployed address for runtime cutover. Do not switch strings to a predicted or testnet address.
3. **Funding reconciliation and paid rehearsal.** 33 old FUNDING rows, including one stale venue funding row, need chain-by-chain reconciliation. Never delete or mark them paid/refunded without evidence. After escrow readiness, run one small authorized fund → claim → accept → fresh proof → review → settlement → receipt, plus rejection/retry/refund. Record transaction hashes, database transitions and balances. No such real-money test ran here.
4. **Creator activation.** Public /earn shows zero open missions; /creators/signup routes to mission alerts. Recruiting a pilot group is possible, but promises of immediate paid work are not supported. Publish the first real funded brief only after the financial gate clears. Verify cold sign-in, existing/pending/missing Baretag, profile refresh, logout/account switch and mission return on real devices.
5. **Recovery, notifications and venue arrival.** Production env metadata has no Resend key, sender or enabled email flag. VENUE_QR_SECRET is missing. Configure each deliberately, then test inbox recovery on another browser, physical phone push and a staff-operated rotating-QR + fresh-GPS arrival. Do not rotate signing material without checking existing sessions. Telegram configuration is present; actual inbox delivery was not tested and no messages were sent.
6. **Operating and content permissions.** Terms and Privacy still defer formal operating-entity details. Human legal/operating information and support ownership are needed. Public adventure display consent is not sponsor advertising/social reuse permission. Agree influencer deliverables, review rules, payment terms and commercial usage rights before a paid brief.

## Candidate repairs

- Sign-in picker gains a labelled dialog, 44px close button, Escape dismissal and trigger focus restoration.
- Creator onboarding is keyed to the connected wallet, clearing another actor's local wizard state on account change.
- Load failures offer retry and block advancement until the creator record is confirmed.
- Save failures remain visible and keep the current step. Controls freeze during saves; the completion screen no longer unconditionally claims all edits were saved.
- Explicit mission requests use the server's mission-specific authorization scope. Offline route regression verifies real signatures against settings/mission boundaries, including unsigned, wrong-action and wrong-mission rejection.
- Local dependency installation timed out twice against npm. The shared node_modules tree was not mutated. Candidate package/lock validation must finish in clean CI and a deployed preview before a main merge.

## Investor demo scope

Show the real public product: Now → map/place → a free adventure → personal journal. Explain social plans and paid work as separate paths. Use real records; label examples and self-reported progress. Describe paid settlement as undergoing production validation until the receipt exists. Do not show internal campaign counts as paid traction.

## Social manager / influencer pilot

Start with a small, consented pilot and one concrete brief rather than a broad recruitment blast. A manager should be able to send one link, see a creator finish onboarding without assistance, explain what is public, confirm the brief and usage rights, observe proof review and point to an actual settlement receipt. Track onboarding completion, time to first useful action, failed saves/sign-ins, support requests and repeat participation. Do not count signups as activation.

## Evidence and release acceptance

Evidence is in task outputs/launch-readiness: production-safety.json, public-pages.json, dependency reports and the final readiness report. No secrets are included.

Before calling the candidate deployed: clean Build and Test CI including creator authorization checks, exact-commit preview READY, public browser smoke for sign-in close/Escape/focus and onboarding, then exact-commit main production READY. This repairs bounded issues; it does not clear the remaining launch gates above.

Rollback candidate code/dependencies if sign-in, creator saves, page rendering or map behavior regresses. Keep money flows blocked while escrow or settlement evidence is missing.

## Primary security references

- https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j
- https://github.com/nextauthjs/next-auth/security/advisories/GHSA-x445-f3h2-j279
- https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579
