# Global map entry, phone ergonomics and shared materials — 18 October 2026

## Result

The map fills the phone viewport directly below navigation. A compact area/search control expands the existing search, city and filters over the map, with Back to map and Escape dismissal. Fullscreen clears navigation and retains the browsing target. Normal landscape rotation works without accelerometer access. Search and guide dismissal do not move the map or its zoom lane.

The initial camera uses explicit destinations, a chosen/remembered area, an approximate Vercel city hint, then the existing Siargao demo. The explicit location action requests phone GPS; an already granted permission may be reused on an undecided entry. Deep links and city selection never claim physical presence. Failed location reads keep the current map and offer city selection. Empty local inventory no longer teleports a global visitor to Siargao. List view carries the actual browsing area. Surf and weekly Siargao nightlife advice are shown only within the regional coverage area.

City search is a manual request using the existing search route's area scope, separate from venue queries and creation. OpenStreetMap attribution is visible. New read guards keep stale searches/GPS from overriding a newer city selection. The public Nominatim endpoint has an upstream deadline and per-caller/per-instance rate guard; it is not a globally distributed quota implementation. A managed or self-hosted geocoder/shared limiter is required before high-volume expansion. See [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/), [search API](https://nominatim.org/release-docs/latest/api/Search/) and [Vercel request headers](https://vercel.com/docs/headers/request-headers).

FAQ is server-rendered with a lightweight SVG/existing PeeBear image, searchable topic groups and native question disclosures. The page has no local Three/HDRI renderer. Its Passport answer reflects manual account saving added in PR #23. The homepage verification/settlement/network/location explanation shares the site's satin glass cards. Dare rewards is a quiet 128px tactile dial with explicit refresh, unavailable/stale states, close/Escape/focus restoration and separate financial categories. No totals become a wallet or claimable balance.

## Validation

- Integrated main d1176cb61523e4b1f8fe97d135678ac943197222 (PR #23); preserved its Passport, privacy, paid-availability and migration work.
- 46 combined discovery/progression/privacy tests; wallet/venue usability and Community identity checks pass. Static production safety passes. Full lint: zero errors, existing warnings remain.
- App typecheck and optimized production build pass. Graphify rebuilt for the final code.
- Browser at 390×844: map top is 96px (directly under navigation), search opens without changing the 748px map height, Back to map retains the area, Free roam retains camera and zoom-control positions. Tokyo manual search succeeds and updates the visible city, URL and List link; no current-location marker is fabricated.
- Browser at 844×390: fullscreen removes site navigation and shows the map, search, guide, location, zoom, Map key and List view. Portrait/landscape use responsive dimensions, no motion sensor request.
- Browser FAQ search finds the Passport answer, disclosures open, no horizontal overflow, and page-local canvas count is zero. Desktop reward unavailable/refresh/Escape/focus recovery and the blended homepage cards were inspected.
- Local database pool settings cause slow/fallback venue/activity/reward reads. Do not equate those unavailable states with confirmed empty inventory. Candidate/live deployment checks are recorded in the accompanying task verification output after release.

## Release boundaries

No new dependency, migration, production config, contract deployment, QR rotation, payment, payout or refund. Existing account authorization and verified-evidence policies are unchanged. World map coverage and authored free ideas are available globally; local plans and rewards depend on real published inventory. Physical-phone permission/GPS, passkey, native rotation and wallet checks remain operator acceptance work; browser viewport testing does not substitute for a physical device.

Ship through PR checks and an unaliased production candidate, then merge and verify the actual main deployment. Roll back this application release if the map camera jumps, search obscures required controls, scrolling fails after leaving the map, or existing local discovery/account flows regress. Keep the independent Passport schema from PR #23 intact.
