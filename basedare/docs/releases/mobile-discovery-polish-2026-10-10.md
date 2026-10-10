# Mobile discovery polish — 2026-10-10

## Release surface

- Map objects are smaller and quieter; cluster counters use one dark glass material with a fine colored rim. Preserve category artwork, renderer, camera, tile sources, clustering policy and touch footprints.
- A compact Map key explains places, paid dares, free challenges, meetups, tonight and verified updates. It has an explicit close button, keyboard Escape and bounded height for scrolled mobile screens. Free activity badges read FREE. Nearby suggestions use plain descriptions and separate suggestions from scheduled events.
- The mobile Now drawer has a 44px close control below map guides. List view is also in navigation; the board page calls itself List view and describes meetups, events, completed dares and recent activity.
- Notifications prioritize actions, chats and updates; device push settings follow those. Update links and mark-read controls retain wallet authorization and restore state on failed writes.
- Wallet receive address includes a QR with a white quiet zone. Correct configured-network and simulation guards remain. Balance errors, refresh, last check time and zero-balance explanations are explicit; USDC, network-fee ETH, pending rewards and BaseCash remain separate.
- Account menu and ordinary venue chat resolve current approved usernames. Guests have a neutral name; system receipts retain their recorded actors. Room access and notification permissions are unchanged.
- Gados is a canonical curated place at 9.7867894, 126.1621528, beside Sibol. Public listing: https://www.siargaolocal.com/business/gados/ . No current event, hours, official partnership or verified visit was invented.
- Included the parallel chat's passkey wording and close-zoom name readability changes. Unrelated local artifacts and other branches were excluded.

## Verification

- Production build with Node 22, mainnet public configuration, simulation disabled.
- TypeScript and targeted ESLint: zero errors; three existing map image warnings.
- Identity and map signal policy: 10 tests pass.
- Isolated room identity check: current approved names replace historical wallet labels, unknown users are Guests, system receipt actors and own-message state persist, locked rooms expose no messages, and identity reads are batched.
- Static production safety passes.
- Read-only production database compatibility passes: 59 migrations, 77 models. No migration, environment, contract, settlement or authorization changes.
- Graphify rebuilt as required by AGENTS.md.
- Gados persisted through the existing curated-venue upsert; room snapshot exists and anonymous access remains locked.
- Browser: 390px wallet and notification fixtures checked with clearly labelled sample data. Real built map renders Gados and responsive controls. Private wallet signatures and location-gated chat posting require the user's own device and were not impersonated.

## Rollout and rollback

Push the reviewed commit to main; verify the matching Vercel production deployment reaches READY and smoke-check the public map, list view and Gados place/chat entry. On a new render, navigation or identity regression, revert the release commit and redeploy. No schema rollback is needed. Existing paid-launch and email-provider gates are outside this UI release.

## Product decisions

The surf boat action stays secondary and says Find surf boat crew. Siargao Beach Club is an existing Cemetery launch context; a boat action should only appear for places with that capability.

Public profiles already live at /creators. The account menu now exposes People & friends, with existing handle search, requests and private connections. Interest-based recommendations are a follow-up requiring explicit interests and an explainable match reason; no location-based friendship inference was added.
