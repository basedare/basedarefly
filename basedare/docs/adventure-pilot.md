# Adventure and venue pilot — September 2026

## What ships

- The homepage, NOW and Community use the existing authored free-activity catalogue. Suggestions follow destination daypart rules and remain clearly separate from published plans, attendance and paid work.
- /adventures and /adventures/[id] provide time filters, step-by-step progress, sharing, completion, repeat and a device-local adventure journal. Starting another adventure replaces the unfinished one. Active runs expire after 24 hours; up to 30 total runs are stored. Clearing browser data removes the journal. These self-reported entries never award verified reputation, money or venue perks.
- A shared tray resumes the active adventure on Map, NOW, Community, Board, Dashboard and earn listings. Accepted paid work takes priority. Map place panels and venue pages link to place-specific adventures. The existing verified map Trail remains a different, proof-backed record.
- Meetup sign-in preserves a short-lived join intent for the exact plan. Existing authentication, RSVPs, invitations, calendar links and repeat-plan pages remain in use. This is not anonymous RSVP or verified attendance.
- Community refreshes published plans on return, every minute and after local plan changes. It explicitly covers Siargao; local posts now use the same 12 km area. NOW uses its selected area and refreshes on return. API failures are not described as empty community inventory.

## Venue offers

Newly enabled offers require a quantity, start and end time, and explicit requirements. An offer has a stable ID across edits. A new non-overlapping window after expiry gets a new ID.

Check-in locks the venue before checking inventory. One confirmed allocation per signed-in wallet reserves stock; expired or subsequently revoked allocations continue consuming that offer's stock. Revoking a visit cannot replenish a reward already handed over. This conservative rule avoids promising the same reward twice. It does not establish one human per wallet. Legacy unbounded offers retain legacy behaviour until edited.

Staff still verify the stated activity or purchase requirements. Only the claimed venue wallet or existing internal authorization can redeem. Redemption locks venue and check-in, rejects expired or revoked claims, and increments venue memory once under concurrent retries. A free adventure completion alone cannot unlock a reward.

## Spend locally: manual Yodl pilot

Hidden by default. The claimed venue owner must record a successful test of the actual merchant QR, confirm PHP receipt, and supply a test date and receipt reference. The test must be within 30 days. Public visitors see only test date and guidance; private setup and purchase records are restricted to the venue owner.

The outbound Yodl link opens its existing app/download page. It is not an embedded SDK, payment session, balance conversion or verified payment handoff. No webhook, exchange rate guarantee or automatic payment attribution is implemented.

With participant consent, operators can log stablecoins spent, quoted/received PHP, elapsed time, outcome, references and fee/failure notes. Participant-reported and manually merchant-confirmed results remain distinct. Failed attempts may record zero spent. Records use idempotent IDs in the existing FounderEvent store and do not enter BaseDare revenue or automatically award perks. BaseCash credit and its settlement rules are unchanged.

## Verification and release boundaries

Focused tests cover personal progress, corrupted storage, expiry, offer windows and pilot validation. A disposable PostgreSQL integration replays the complete migration history and verifies concurrent last-unit allocation, duplicate redemption, owner authorization, expired claims, revoked check-ins and a single memory count.

Verification passed: 12 focused tests, the PostgreSQL integration, app typecheck, full lint (zero errors; existing warnings and one event-handler purity warning), static safety, production-mode build and Graphify rebuild.

Browser checks cover anonymous start, individual steps, persistence after reload, completion and repeat on a 390px viewport, plus the resume link on the map. Write-restricted storage retains in-memory steps and displays its limitation. NOW and Community show the same suggestions without horizontal overflow at 390px; the paid-only filter excludes these free ideas. Desktop adventure and NOW layouts were inspected. Local backend inventory uses unavailable/curated fallback states; no production venue offer, RSVP, reward or purchase was created.

No schema migration is needed. Actual venue staff redemption, wallet sign-in on physical phones and ordinary Yodl purchases still require the real pilot. Production paid rewards remain blocked by the separately documented bounty-network mismatch. These changes do not resolve that deployment issue.

Next sync work, separate from this pilot: a shared selected-area preference across Map/NOW/Community/home, unified pagination and expiry policy for community records, and canonical per-activity completion/attendance status. Community is not yet a worldwide mirror of an arbitrary map viewport.

## Main release

The user authorized the adventure pilot and occasional lightning builds together on September 29. Ship through the existing main-branch Git deployment, with the production database compatibility gate enabled. No schema, credentials, chain addresses or pilot activation settings change as part of this release.

After deployment, check /adventures, a complete free adventure, /now, /community and the map return link. Authenticated merchant operations require a willing venue and participant; do not create a public test reward or payment. Roll back the release if free activity navigation fails, claimed perks lose their expiry/quantity enforcement, or an inactive payment pilot appears publicly. Disable only the decorative lightning with NEXT_PUBLIC_ENABLE_AMBIENT_LIGHTNING=false and a redeploy if it causes rendering or motion problems.
