# Launch, funding and creator intake — 19 October 2026

## Launch decision

**Paid public launch remains blocked.** Discovery/demo and pre-launch interest conversations can proceed with accurate limitations. A successful website deployment is not proof of production money movement. The first market is Siargao, confirmed by the founder; Manila/Cebu follow evidence from that pilot.

## Current evidence

| Area | Result | Evidence / remaining action |
|---|---|---|
| Public routes | PASS for availability only | Production `/`, `/join`, `/earn`, `/creators/onboard`, `/brands/portal`, `/activations`, `/faq`, `/privacy`, `/terms` returned HTTP 200 without the framework server-exception marker. This is not a full user-journey test. |
| Production payment availability | BLOCKED | `/api/config/payment-readiness`: `ready:false`, chain 8453, bounty `0xF176ec205e5E5777F6B5964bfeD6DE5a57a911E3`. Official Base RPC returned chain `0x2105` and `eth_getCode=0x` at that address. No approval, funding, payout or refund was attempted. |
| Candidate escrow | BLOCKED / not deployed | Public candidate `0x6e86208600E7801F9eab27261acF812EC55288a2` also has `0x` code; candidate owner pending nonce remains 2. Candidate deployer balance is 0.004890921759141415 ETH, below the script's 0.005 ETH operational reserve. This reserve is not a quoted deployment fee. Prior candidate roles require human confirmation; a prediction is not custody authorization. |
| Contract local checks | PASS with limits | Standard compilation, 19 tests and coverage completed. V2 line coverage 93.18%, branch coverage 60.87%; aggregate line coverage 66.39%, including the untested legacy Protocol. These tests do not substitute for an independent audit, role verification or a production rehearsal. Standard artifacts recompiled after coverage. |
| Creator intake | FIXED and DB-tested | Atomic insert-if-absent retains reviewed status/notes on retries, deduplicates concurrent alerts, rejects whitespace-only name/city. Tests use a disposable PostgreSQL database and stub only notification transport/framework scheduling. No production leads or messages created. |
| Operator alerts | IMPROVED, live delivery unproven | Use Next `after` for mission-alert and legacy creator application notifications. Repeat mission alerts do not ping again. This keeps work in the response lifecycle but is not a durable delivery queue; operators still check saved applications. |
| Global/mobile signup | FIXED | Explicit city wins; otherwise reuse the actual selected browsing area, or leave city blank. User edits/clearing are retained. Inputs are 16px; requests time out after 12 seconds, errors retain entered details, malformed/unconfirmed replies cannot show success. |
| Buyer and paid consent workflows | PASS locally with limits | Existing disposable-DB buyer/claim/upload/review/appeal/simulated settlement checks passed alongside creator intake. Fixture/simulated receipts are not chain evidence. |
| App build and checks | PASS locally | Production build, TypeScript, targeted lint, 55 discovery checks, 22 revenue checks and creator signature checks passed. Existing build middleware/viem warnings remain. |
| Push | CONFIGURED, not delivery-proven | Public push-config endpoint reports delivery/client configuration present. Actual iPhone/Android delivery and unsubscribe still need testing. |
| Private production config / schema | UNVERIFIED in this audit | Connected Vercel credential received 403 for env metadata; installed CLI fallback could not use the newer mapped options. Existing local config has no admin credential for the read-only safety report. Do not interpret inaccessible settings as missing variables. Production CI's database gate remains applicable. |
| Dependency advisories | INCOMPLETE current local audit | npm audit registry request failed; no current clean-audit claim. Earlier 14 October report had 3 high and 32 moderate production entries; those counts are historical. CI's critical gate is narrower than resolving all advisories. |
| Old FUNDING rows | STILL UNRESOLVED | The earlier read-only audit recorded 33 non-simulated legacy records without stored receipt/chain mapping. Not re-audited here. Never delete, relabel, refund or infer no money moved from absent mapping. |
| Operating details / real devices | NEEDS HUMAN | Terms/Privacy still defer formal operating-entity details. Confirm entity/jurisdiction, support coverage and owners; physically test recovery, existing Baretags, exact mission return, QR + fresh GPS, push and email before promising them. |

## Concrete next funding step

Follow [mainnet-cutover.md](../runbooks/mainnet-cutover.md), particularly: “Only the human operator runs this command because it signs a real Base mainnet transaction and deploys a contract that can custody real USDC.” The command is `npm run mainnet:deploy:v2` with explicit confirmed public owner/treasury/referee roles and securely supplied matching deployer credentials. Never paste private keys into chat.

Refresh the unsigned preparation and gas/nonce checks first; the old [candidate plan](mainnet-candidate-plan-2026-10-14.json) is context, not a fresh fee quote. A bounded attempt to run the current read-only preparer could not reach RPC through its process transport; no fresh gas estimate or unsigned deployment artifact was produced. The separate official-RPC curl reads above succeeded. Do not lower the reserve guard. After human deployment/referee setup, verify bytecode, USDC, owner, treasury, referee and 4/0/4 fee metadata. Only then change runtime/CI public configuration and both simulation flags, redeploy, and check production readiness again. If deployment mines but setup fails, finish that contract rather than blindly deploying another.

Browser verification at 390px and 320px found no horizontal overflow. A selected Sydney area populated Sydney; an explicit General Luna city took precedence; a fresh entry with no selection stayed blank. With the local app deliberately disconnected from the database and all outbound message credentials disabled, a failed signup kept the typed city/contact/name, displayed an error and allowed retry. No browser signup was submitted to production. The 12-second timeout is implemented; a stalled-network timeout and physical-device behavior still need their own checks.

Then obtain an explicit rehearsal budget: proposed two $5 gross tasks plus gas, one real payout ($4.80 contributor / $0.20 fee) and one supported $5 refund to the original backer. Reconcile chain receipts with database transitions. This proposal is not an approved spend. Rejection without an actual refund transaction does not pass the refund test.

## Recruitment and investment work

The [Siargao launch pack](../gtm/siargao-launch-pack-2026-10-19.md) contains a small proposed cell, the existing commercial offer, qualification questions, source-linked prospects, unsent outreach drafts, fundraising framing and a scorecard. No partnership, recruited participant, investment commitment or reward allocation is claimed.

## Release boundaries

No schema migration, dependency upgrade, production environment change, contract deployment, lead/contact import, outreach, rights grant or money movement in this change. Existing paid guards remain intact. Read-only production/RPC checks and local/disposable tests are kept distinct from physical and signed launch requirements.
