# Controlled launch handoff — 14 October 2026

The discovery app and the paid launch have separate acceptance gates. Do not describe a build, local-chain test or email-provider acceptance as a completed live customer journey.

## Release being built

- PR #21 upgrades Next/NextAuth, repairs onboarding load/save/account isolation, and fixes sign-in dismissal/focus.
- MapLibre 6.14 closes the attribution sanitizer advisory. Namespace imports, an explicit bundled module worker and WebGL2 detection are required. Preserve existing camera and marker behavior. Unsupported graphics must keep the existing map failure/recovery path available.
- Axios, Handlebars, PostCSS, source-map-js and each existing ws major receive targeted security updates. CI rejects critical production dependency advisories; remaining advisories are not waived by this check.
- The Livepeer SDK is replaced with the one Studio stream GET used by the app, retaining the caller's existing stream/proof policy. The client keeps nullable health semantics, has an eight-second timeout, rejects credential redirects, validates relevant response fields and redacts provider errors. No real stream/provider request was used as an approval test. Puppeteer is a development dependency because only the local launch-gauntlet script imports it.
- Final lockfile audit: **0 critical, 3 high, 32 moderate** production dependency entries, compared with 4 critical / 55 high in the baseline. The three high entries are Prisma CLI/config and its deepmerge-ts dependency (one underlying recursive-merge advisory). The local production route traces contain none of `@prisma/config`, `deepmerge-ts` or Hono; this is evidence of the current build boundary, not an exploitability certification. Keep the supported Prisma 6 toolchain until a separately tested upgrade is ready; do not force the audit's suggested downgrade or an unsupported major override. Moderate wallet/SDK advisories still need review before unrestricted launch. Development tooling retains its own advisories and is not represented by the production-only count.
- `funding:audit` collects chain evidence without changing records or sending transactions. Never run the app's mutating reconciler as a substitute for this audit.

## Human-signed escrow cutover

Follow `mainnet-cutover.md`. The refreshed public candidate is `docs/releases/mainnet-candidate-plan-2026-10-14.json`; these are candidate roles, not operator-confirmed custody instructions. The artifact/deployment hashes still match the earlier plan. A predicted address has no custody authority until deployment is mined and checked.

The candidate deployer has 0.004890921759141415 ETH, below the deploy script's 0.005 ETH operational reserve. That reserve is not a quoted deployment price. The 14 October L2 estimate is 0.0000128441372112 ETH, excluding L1 data fees and referee setup; refresh it immediately before signing.

The human operator confirms owner, treasury and separate referee, securely supplies the matching dedicated deployer key, and signs deployment/referee setup. Do not paste keys into chat. Do not rerun deployment if only referee setup failed: finish setup on the already deployed contract.

Then verify mainnet bytecode, USDC binding, owner, platform/referee addresses, 4/0/4 fees and gas. Only then change Vercel's bounty address and redeploy. Repeat the read-only production preflight before requesting any USDC approval.

## Old funding records

The production read on 14 October Sydney found 33 non-simulated `FUNDING` records. None has a transaction hash or stored on-chain ID. A read-only check at the configured mainnet address found no contract; the known Sepolia contract has no active escrow at the IDs derived by the current hash scheme and does not expose usable permanent-ID history. This does **not** prove no money moved under older IDs, contracts or wallets.

The private inventory and per-record report stay outside Git. No rows were deleted, promoted or refunded. Keep these records out of funded inventory. For each record, obtain the funder's receipt or wallet history, identify chain/contract/ID, verify `BountyFunded` amount/backer/recipient and any payout/refund event, then review a bounded repair. Unknown evidence remains unresolved; never mark a cleared mapping as a refund.

Re-run the audit with an operator-exported JSON object containing `rows` (id, status, bounty, isSimulated, onChainDareId, txHash, stakerAddress, targetWalletAddress) and a JSON array of explicit `{chainId,address,rpcUrl}` targets:

```bash
npm run funding:audit -- --input /private/funding-rows.json --contracts /private/contracts.json --out /private/funding-evidence.json
```

The command writes a private local report. RPC failures, missing code, active matches and unknown legacy history remain distinct. It authorizes no financial or database action.

## Paid rehearsal evidence

The existing disposable PostgreSQL + Hardhat test passed concurrent/repeated registration, exact 96/4 payout, wrong amount/recipient/receipt rejection, full contract refund and terminal-state preservation. This test directly exercises settlement on a local contract; it does not prove live media upload, human review, mainnet or physical GPS.

For the live rehearsal, propose two $5 gross escrow tests ($10 total USDC plus gas), subject to the operator's explicit spending decision. Use separate backer/contributor/referee wallets. Do not use a real influencer as a test account without their agreement.

1. Freeze a safe brief, recipient, evidence rules, review/appeal policy and expiry before funding. Save exact release SHA and chain/contract configuration.
2. The operator signs funding. Record approval/funding receipts; registration must leave `FUNDING` with the expected chain ID, reward, contributor and backer.
3. The contributor accepts, uploads fresh trusted media and follows the actual proof flow. Save the proof attempt and review decision. A failed upload must remain retryable and must not claim payment.
4. The authorized reviewer approves valid evidence. Confirm the payout receipt, contributor increase of 4.80 USDC and platform increase of 0.20 USDC; gas is separate. Replay the submission/callback and confirm no second payout.
5. Exercise rejection/retry/appeal separately. Rejection alone is **not** a refund. The existing expired-refund API covers eligible `AWAITING_CLAIM` records, not arbitrary rejected proofs. Do not forge status/deadlines to make a test pass. A different refund scenario needs a reviewed operator decision and real contract receipt plus database reconciliation.
6. Capture an actual supported refund case: 5.00 USDC returns to the original backer, no successful-settlement fee, and replay cannot refund twice. Keep paid onboarding paused if the product cannot demonstrate its promised refund case end to end.

## Device and delivery matrix

Record device, OS/browser, account, release SHA, time and evidence for every row. Desktop responsive emulation does not satisfy a physical-device check.

| Trial | Required result | Current evidence |
|---|---|---|
| Preview onboarding at 390px | Close/Escape/focus, honest preview state, all four steps | Browser verified; live identity saves still need an account |
| iPhone Safari + Android Chrome | Passkey creation/return, wallet reconnect after refresh/app switch | Physical trial pending |
| Existing/pending/missing Baretag | Correct account identity, no accidental claim/reset, account switch clears prior state | Automated identity regressions; operator account trial pending |
| Mission return | Exact mission survives sign-in, rejected signature cannot write | Auth regressions; real wallet trial pending |
| Email recovery in another browser | Only explicitly emailed activities restored; unknown email stays private | Mock/database checks; sender and inbox pending |
| Push notifications | Explicit opt-in, one useful notification, unsubscribe honored | Physical delivery pending |
| Venue QR + fresh GPS | Authorized staff starts session; on-site visitor succeeds; stale/remote attempt fails | One active QR session, five check-ins recorded; controlled trial pending |

Production lacks a dedicated `VENUE_QR_SECRET`, and one session is active. Coordinate with that venue: pause its display/session, add high-entropy dedicated material in secure Vercel settings, redeploy, refresh the QR and verify arrival before resuming. Do not silently invalidate an active venue's tokens. Keep fallback-signing behavior unchanged until that cutover is coordinated.

Email needs a verified BaseDare sender/domain, scoped Resend key in secure settings and an operator-owned test inbox. Keep the production email enable flag off until a real delivery/recovery trial succeeds. Do not send test email to a guessed recipient.

## Pilot and public demonstration

Use `docs/gtm/controlled-influencer-pilot-2026-10-14.md`. Legal operating name, jurisdiction, public support address and named operational owners are still required. Keep sponsor commercial reuse gated until the versioned terms are reviewed; no automatic rights arise from a shared adventure.

Investor demo: Now → map/place → free adventure → device journal. Use real records and disclose example/self-reported states. Show a paid receipt only after the live rehearsal exists. Do not treat old linked campaigns, signups or local tests as customer traction.

Pause paid onboarding for missing escrow/configuration, inability to recover a failed payment, incorrect identity, lost evidence, duplicate settlement or unresolved refund behavior. App rollback does not reverse chain transactions; retain the transaction and evidence ledger during any code rollback.

## Security sources

- MapLibre advisory: https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579
- MapLibre bundler migration: https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/
- Handlebars: https://github.com/advisories/GHSA-8r5x-fm3f-whwj
- PostCSS: https://github.com/advisories/GHSA-fxqj-rqcc-2cmp
- Source maps: https://github.com/advisories/GHSA-68fv-2mgg-jv7q
- WebSocket parser: https://github.com/advisories/GHSA-96hv-2xvq-fx4p
- Socket.IO parser: https://github.com/advisories/GHSA-2m8v-j782-fhvr
- Hono: https://github.com/advisories/GHSA-hxh3-vqpv-xpqv
- Remaining deepmerge-ts: https://github.com/advisories/GHSA-ggr8-5vv4-36mx
