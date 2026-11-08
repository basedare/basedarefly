# Locked direction and P0 inventory — 5 November 2026

Baseline main af693156 / PR40–44. No newer merged code was present when development began. The founder’s Master Unification prompt supersedes exploratory positioning, while preserving financial/security/privacy authority. Code, local tests, deployment, enabled configuration and real acceptance are different states.

| Surface | Decision | Existing evidence and this slice |
|---|---|---|
| Home / Live Around You | KEEP / IMPROVE | Existing guest inventory, approved art and source adapters; align shared positioning to The world is your feed. |
| Now / World Pulse / map | REUSE / CONNECT | Existing LivePlan snapshot shares events, meetups, boats, Sparks and genuine paid metadata; same destination context. Add reviewed ordinary stories to Now and existing map Local Signals projection, not a new feed database. |
| Places / venues / memory | KEEP | Canonical Venue, current place details, memory/QR authorization, delegation and revocation. Story place tags resolve existing ACTIVE rows; no new pins per story or official venue impersonation. |
| Community / Local Signals | REUSE / IMPROVE | Existing NEW→APPROVED/REJECTED operator queue and FounderEvent. Extend with authenticated text stories, explicit display consent, report and terminal withdrawal. Public projection excludes operator fields. |
| Events / meetups / music | KEEP / DEFER enhancement | Existing VenueEvent/Meetup/LivePlan/rooms. No real new Session supplied. Stop auto-generating the hard-coded Sunday occurrence on public API reads or database failures; preserve real published inventory and historical template code. |
| Friends / people / crew / boats | KEEP | Mutual friendships, blocks, authorized rooms, surf crew/operator confirmation remain. Following is a different P1 primitive, not silently implemented as friendship. |
| Adventures / Sparks / Passport | REUSE | Guest play, stable IDs, personal journal, optional memories/account save. Reuse three-details as Make the ordinary look unreal / Dare001; optional ten-second original clip, no posting/prize requirement. Existing No Beaches Allowed and Chaos Quests remain. |
| Moments / Spotlight / CreatorShareKit | KEEP / GATED | PR42 recognition, public privacy checks, creator share tools. PR44 left link/original intake off; no provider/phone acceptance inferred. Text stories do not bypass that media gate. |
| Creator identity / sign-in | KEEP / DEFER provider migration | Existing active/verified primary Baretag and passkey/wallet/session authorization. Text publishing verifies current server-owned identity; guest discovery stays open. Google/Apple/passwordless identity migration needs linking/recovery/rollback acceptance. |
| Business / activation / campaigns | KEEP | PR43 business switch and three-goal guest enquiries, existing advanced workspace, private close-room, follow-up and reports. No new SKU, pricing, charge or contract. |
| Attribution / acquisition / retention | KEEP / CONNECT measurement | PR44 /go, frozen intents, invitations/cohorts and optional double-opt-in email. Count text-story submission records separately; consented client open/action events omit private IDs/GPS. Config presence and fixtures do not prove delivery. |
| PostgreSQL / media / moderation | REUSE | Existing LOCAL_SIGNAL ledger with stable subject references; no migration/dependency/media backend. Approved public reads recheck author/place/consent; review/report/withdraw serialize on row lock. |
| Mainnet / escrow | KEEP / GATED | 96/4/0 canon, human cutover and real funding/payout/refund acceptance. No financial changes or transactions. |
| Public follows / saved relations | GENUINELY MISSING / P1 | Existing friends and memories are not public follows or arbitrary post saves; do not advertise Following yet. |
| Support Creator / referrals | DEFER P1 / real P2 evidence | No verified recipient, consenting musician, negotiated operator offer or reconciled commission provided. Existing attribution/intake can support the first pilot; no marketplace/custody. |

## Narrow complete slice

Signed-out visitor opens Pulse/map → reads a reviewed community experience → explores its canonical place or area → chooses Share an experience from Create → existing account authorizes text submission → private NEW record → existing operator reviews → same source appears on Pulse/map and server-rendered public detail → author can inspect status/withdraw, viewer can report. All text is escaped by React; no HTML/media ingestion. Place association is not physical proof. Untagged posts disclose only a coarse browsing area (two-decimal center), never device presence.

Stories keep their stable public URL until withdrawn/rejected/reported or author/place eligibility is revoked. Current list reads are bounded to the latest100 reviewed Local Signals and eight story cards; they are a recent sample, not exhaustive global search, attendance or popularity. Plan time/participation filters govern scheduled plans; personal stories are explicitly separate from scheduled/verified activity. Shared view navigation retains area through DiscoveryLink. Story detail is no-store/noindex during acceptance.

## Readiness boundaries

Baseline features were deployed in PR40–44 and have extensive fixture coverage; this P0 is a new review branch. Real phones, genuine source-post moderation, private original provider/revocation, sender/domain/inbox and mainnet payment/refund gates remain. This build does not contact people or activate production switches. The ordinary Preview has no DATABASE_URL; do not copy production credentials there or write synthetic hosted records. All integration fixtures use disposable local Postgres.
