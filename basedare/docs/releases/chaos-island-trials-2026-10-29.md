# Chaos Quests, Island Trials and local-pay handoff

29 October 2026. Guest-first participation release. Branch `codex/chaos-island-trials-20261028`. No migration, provider activation, production data write, live payment, public upload or outreach performed.

## Implemented

Twelve authored free Chaos Quests, appended with stable IDs to the original eight: Wave or Ex?; The Unnecessary Soundtrack; Main Character Entrance; The Worst Tour Guide; Wipeout Idol; The ₱0 Blockbuster; Coconut CEO; Your Life, But It’s a Song; The Dramatic Weather Report; I Came for Three Days…; The Most Suspiciously Normal Thing; Dare Your Doppelgänger.

They share a cover/card system using existing owned graffiti illustrations with deliberate branded backgrounds, category, duration and hook. No licensed photos/creators are invented, no generated assets or new dependency. One recommended adventure still leads, filters/alternatives stay optional, and original templates/progress are retained. Now/community suggestion cards and all adventure detail heroes share this visual system. Map Play / Free adventures browses all twelve, respects time/mood and links the selected quest; anywhere prompts have no fake map pins. Wave or Ex? leads the dedicated Chaos collection.

Guest start/resume/three steps/self-report/completion postcard, optional creator inspiration and Dare a friend use the existing journal and invitation system. Completed quest/trial postcards are visible without opening Passport. Native sharing has a copy fallback plus an explicit Copy invitation action. Memory download renders the existing escaped SVG to a PNG locally; failure gives a clear screenshot/invitation fallback. Public uploads retain sign-in, public-storage disclosure, consent and review. No one must upload, tag, film or post to finish.

Island Trials hub and Trial #001 No Beaches Allowed reuse AdventureHub. Explicit choice among Siargao, El Nido and Boracay; an allowlisted island field survives canonical account saving and cannot switch on merge. A private device-only story is excluded from account saves/cards/invitations/analytics. Fixed island invitations and branded 1200×630 PNG previews give recipients a fresh attempt with their own island. Invalid islands 404. Existing Siargao hype pilot and archive remain unchanged; install/decorative loaders stay out of focused guest routes.

Creator Drop admin has draft-only templates, existing captain applications/moderation/attribution remain authoritative, and the founder scoreboard links existing launch tools with honest metric definitions. Business enquiries use existing activity-brief scope and neutral pricing. Global trial publishing/pausing remains a reviewed catalogue change, not a new live CMS. Weekly improvement and unsent creator invitation are in `docs/gtm/island-trials-launch-2026-10-29.md`.

Map entry now retains explicit/restored timezone. Camera rounding within a city preserves that zone; distant pans discard the previous city context. The renderer, camera mechanics, control lanes, source/layer styling, GPS evidence and place records are unchanged.

`/pay-local`, wallet guidance and the existing owner pilot make the external payment boundary clear. Availability requires merchant permission and recent specific tested rails; manual confirmed purchases need separate provider/PHP receipt evidence. Owner/config are rechecked under lock, read failures/stale responses are handled, and record-ID idempotency remains. See `pay-like-a-local-2026-10-29.md` for current primary-source research, gated provider decisions and permissioned manual field protocol.

## Verification

- 69 discovery/progress tests: all quest IDs/owned assets, filtering across hours/cities, step/complete/reload, account saves, independent invites, island validation/merge, mobile surface policy, creator template compatibility, exact tested rails and merchant/provider receipt requirements.
- Actual local-spend route regression with isolated session/DB boundaries: guest data privacy, unauthorized requests, wrong token/network, missing confirmation, owner/pilot changes under lock, idempotent retry. Added to Build CI. These are fixtures, not a live purchase.
- Existing usability, creator onboarding and community identity regressions pass; revenue focus (22) and refund safety (27) pass; static production safety passes with existing allowlists.
- App typecheck passes. Full lint has 0 errors / 222 existing warnings; touched follow-up lint has no errors. Optimized Next build passes (217 pages) before the final camera-zone regression refinement; final build/hosted CI are recorded in the PR handoff. Local build intentionally uses preview/local database mode, not production credentials.
- Graphify rebuilt. No migrations or contract changes. Existing paid launch guardrails and funding/recovery/physical-device gates remain.

Browser checks in the production build: 320px trial invite starts a fresh guest with Boracay after a Siargao invitation, no inherited progress or story, zero horizontal overflow; 390px Wave or Ex? and Island Trials; desktop Wave or Ex?; all twelve map links visible, accessible modal close, selected city preserved. Local guest start, mid-step refresh, completion, private note persistence, explicit copy and card download exercised. HTTP social images return valid 1200×630 PNGs; invalid island card returns 404. One dev-only test on a separate loopback hostname failed to hydrate; repeated successfully with a fresh localhost port on the optimized build. No production auth or storage state was mocked as success.

Screenshots: task `outputs/chaos-island-launch-2026-10-29/` contains actual browser previews. Browser layouts do not replace physical iOS/Android, real auth/recovery, analytics ingestion or a permissioned public-upload/moderation test. Local API inventory reads without DATABASE_URL fail visibly; a local empty/error state is not proof of production inventory.

## Release and rollback

Review the PR and exact hosted preview/checks before production promotion. No new env or DB step. Existing pilot listings lacking new permission/rail fields will hide until the owner records a complete recent test; do not bulk-enable them. Paid escrow readiness and payment-provider contracts are still independent gates. Announce only free challenges/guest invitations once that release is live; no official venue/creator partnership, winners, guaranteed payout or global payment acceptance.

Rollback the catalogue/UI/journal serializers together so new island records remain readable; retain device/private account journals and public submissions. Preserve all Venue metadata and FounderEvent history if rolling back local-pay UI/API. Never weaken evidence/auth or change existing paid financial policy to restore an option.
