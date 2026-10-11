# Wallet and venue usability completion — 11 October 2026

This batch completes the wallet, venue chat and discovery follow-up against main's latest neon/graffiti design. Existing passkey wording, larger close-zoom map objects/labels, the Gados record, desktop node background and animated mobile PeeBear are preserved.

## Result

- Wallet balances come from a read-only server route, avoiding browser RPC/CORS stalls. Each endpoint confirms the configured Base chain. Requests have bounded timeouts, no automatic retry loop and a canonical public fallback. USDC and ETH fail independently; an unavailable reading is never presented as zero. Refresh can recover, and the receive QR carries the actual wallet address with explicit native-USDC/network instructions. No custody, transfer or checkout flow is introduced.
- Venue chat and nearby presence show current ACTIVE/VERIFIED handles, normalized to one `@`. People without handles receive a stable Explorer alias. Identity resolution is batched. Receipt actor names remain recorded evidence; old wallet-looking labels are replaced only for display. Nearby GPS access remains distinct from verified rotating QR + GPS attendance.
- Curated discovery inserts missing records in one batch and leaves existing venue/operator metadata intact. This avoids repeated writes and prevents map searches from overwriting operator settings. Gados uses the [published SiargaoLocal map anchor](https://www.siargaolocal.com/business/gados/); uncertain opening hours are not promised.
- List view consistently describes nearby activities and labels historical check-ins as recorded visits. The mobile nearby-activity panel has a close control clear of the map guide lane and reopens through the existing guide/mood controls. Repetitive funding actions are removed from suggestions; funding remains on the place. The boat CTA is restricted to Kanaway.
- Notifications retain main's compact dark panel and reduce empty count clutter. Copy explains that venue group chats live on each place. The existing People & friends panel opens from its deep link, clears stale search errors and allows an authorized friend request without a separate preliminary list load. The contributor directory links to it.

## Verification

- Focused usability regression suite passes: invalid wallet address, wrong-chain fallback, partial/full RPC failure, recovery, insert-only venue discovery, handle/alias display, locked-room access and batched identity reads. Added to Build and Test CI.
- Existing venue-room identity check passes, including recorded receipt names.
- TypeScript and targeted ESLint pass with no errors; the map retains three existing image-element warnings.
- Optimized production build passes. Read-only production database compatibility gate passes: 59 migrations and 77 models. No schema migration or environment change is required.
- Browser checks at 390px confirm the wallet's unavailable/retry state, successful live Base balance refresh, address QR, notification fit without horizontal overflow and nearby-panel dismissal. Desktop checks confirm larger close-zoom labels. The integrated optimized list view renders with the new copy and recent verified activity. Test-only wallet preview and connector were removed before the production build; no wallet was signed and no funds were moved.
- The production preview had intermittent local database connectivity errors; the list view recovered and rendered. Deployment and live smoke results are checked separately after the main push.

## Product reference

The supplied Instagram reel could not be loaded. The usable lesson from [HumanPost's public site](https://humanpost.com/) is a clear task → submission → review → outcome loop. No claims from the unavailable reel, account-farm mechanics or extra onboarding steps were implemented.

## Limits and rollback

Physical Brave-on-phone performance is not certified by desktop mobile emulation. Existing reduced-motion, hidden/offscreen and resource limits remain in place; PeeBear and the node background were not removed.

Mainnet escrow still needs the human-signed deployment/cutover and real money-path recovery trial described in `docs/runbooks/mainnet-cutover.md`. Mission Pass email sending still needs a verified sender/API key and a real inbox recovery trial. This usability release does not clear those launch gates or enable automatic local-currency settlement.

Revert this commit if wallet readings or room display regress. No database rollback is needed. Keep the upstream design changes and historical evidence rows intact.
