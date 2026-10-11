# Surf and PeeBear material follow-up — 2026-10-11

## Release surface

Surf break pins and the surf guide share fixed vector contours for a cyan wave with cream foam, ink edges, a dark volume facet and a magenta paint base. Foamy highlights reuse the existing model-tier timing and map-movement/reduced-motion guards. A modest opacity floor makes the artwork legible while retaining tier response; unavailable readings remain muted and static.

PeeBear retains the existing gold head and speaking gesture, with a raised illustrated frame, short paint strokes and a speaking-only frame sway. Guide/speech panels share cream contours, inset highlights and a short dark underside. Surf and suggestion close controls are now 44px with keyboard focus treatment. Labels, source links, model caveats, marker positions, click behavior, camera and data semantics remain unchanged.

The earlier Free roam fix remains intact: zoom placement belongs to the map viewport, and leaving the guide clears selection without resetting the camera. No further behavior change was required to reproduce a stable lane on the current release.

Integrated the latest main wallet/venue-usability commit before this pass. Logo/X work stays plan-only. HumanPost, Hinge and Unconventional AI research was rechecked and translated into proposed experiments in docs/design/product-reference-lessons.md; no new matching, messaging, feedback collection, promotion spend or AI integration was enabled. Instagram continued to throttle the supplied reel.

## Verification

- Final optimized Next production build and TypeScript passed.
- Targeted ESLint: zero errors, three existing map-image warnings.
- React review: shared fixed paths, no new state/effects, data fetching, heavy imports or timers. Decorative SVGs are hidden from accessibility; existing controls retain their names.
- Phone 390px: guide → Free roam → Ask again → Free roam again → Surf keeps navigation at map-relative (298, 64), with no overlap or horizontal overflow.
- Tablet 768px and desktop 1280px: guide → Free roam → Surf keeps navigation at (416, 20), with no overlap or horizontal overflow.
- Narrow phone 320px: hint and Map key fit without overflow; navigation stays in its right lane. Opening Map key hides the dock and closing it restores the dock.
- Reviewed the wave artwork in the available surf model card and the muted unavailable state. A local Cloud 9 place-opening request could not be completed against the unavailable configured database; no place-resolution code changed in this pass.
- Local visual checks used the production build. Exact production SHA/deployment and public smoke verification are recorded separately after pushing.

## Boundaries and rollback

No database migration, wallet/authentication, settlement, contract, environment or source-provider changes. Local database connectivity was unavailable for full venue-detail checks; authenticated or financial actions were not exercised. Existing dependency/middleware and local OnchainKit configuration warnings do not block this visual build.

Revert this visual commit if labels become unreadable, the guide/zoom/key overlap, or motion ignores reduced-motion/map-movement rules. Preserve the preceding wallet/venue release when rolling back.
