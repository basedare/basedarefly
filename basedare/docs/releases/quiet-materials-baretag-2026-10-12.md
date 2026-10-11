# Quiet physical materials and Baretag recovery — 12 October 2026

## Result

Now prioritizes meetup/adventure actions and separates secondary discovery tools. Activity/time controls use inset groups with raised selected states; counters and empty states are quieter. List view uses a compact return control, sentence-case heading and aligned cards while retaining physical tape/pin details. Community, My activity, adventures, creator and Control panels share smoked surfaces, neutral edges and satin depth.

Repeated two-line scribbles are removed from content buttons, headings, map search, orbit footer, mode switch and guide/activity decoration. The existing bear, honey artwork, map objects and orbital homepage remain. Verification changes from gold to restrained mint, distinct from paid actions. Selected long map labels remain horizontal and truncate instead of wrapping into vertical ribbons.

Community previously offered Claim @tag when signed out, after a failed lookup, and for pending names. It now distinguishes those states: sign-in, retry or view the pending tag. Only a successful lookup with no usable name offers a claim, alongside Check account. Header and Community share wallet-keyed TanStack reads, preventing a previous wallet's result from being used for a newly selected account. Tag reads accept older mixed-case wallet records. The server binds an explicit actor to that account instead of borrowing a different session account's name.

No tag was reset, reassigned or migrated by this release. The user's exact tag/account diagnosis remains unconfirmed without their @tag and active-account context.

## Verification

- `npm run test:community-identity` passes: checksum-cased legacy record lookup, invalid-wallet rejection without database reads, primary active/pending/revoked resolution, batch isolation, honest UI notices and different-account posting authorization. Added to Build and Test CI.
- `npm run test:usability` passes: existing wallet, curated discovery and venue-room behavior.
- Optimized production build and TypeScript pass. Targeted ESLint has no errors; five existing image/purity warnings remain. `git diff --check` passes.
- Browser checks at 320/390px confirm readable Now hierarchy, 44px filters, right-aligned More menu within the viewport, Community sign-in notice and inset form focus, plus List view and My activity materials. Desktop checks cover adventures, creator pages, About, Earn and creation without horizontal overflow.
- Selected PrimeFit Gym label measures 152×19px with nowrap on a phone. Zoom controls remain at map-relative (298,64) at 390px before/after Free roam and while Surf is open, without overlap.
- The local environment cannot reach the application database. Data-dependent list/Now views correctly show recoverable errors; isolated identity tests do not prove the user's real account state. Live deployment/API checks are recorded after the main push.

## Release and rollback

No schema or environment changes. Existing signature/session checks, payment states, verified attendance rules and map camera behavior remain in force. Logo/X remains plan-only. Revert this commit to roll back the materials and identity lookup changes; no database rollback is needed.
