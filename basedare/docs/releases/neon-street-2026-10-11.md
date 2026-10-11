# Neon street material release — 2026-10-11

## Surface

The previous discovery, map-art, wordmark and responsive consistency releases are included as ancestors. This pass extends the approved neon coffee-cup illustration style through shared graffiti honey, tactile paint-tick buttons, homepage orbit cards, mode switch, radar/reward rims, Map key, surf markers, PeeBear hints and My activity panels. Markets are translucent matte glass with readable text and unchanged live/scouting status. The shared header sweep and legacy mobile border are removed.

No new dependency, API, schema, contract, authentication, balance or payment behavior is introduced. Surf retains model-tier/unavailable, movement pause and reduced-motion behavior. Map camera handlers, sources, coordinates and clustering remain intact. Orbit/tilt controls are at least 44px. Location/zoom uses a guide-independent viewport lane; Free roam closes prior guide selections without a camera reset. Opening Map key hides the floating PeeBear dock, and opening a hint hides its duplicate Ask button so text keeps its width. QR artwork remains black on white and network/simulation guards are unchanged.

Logo refinement and the optional X signature remain a plan, per user instruction. Competitor research is a documented proposal, not newly enabled matching, outreach or campaign functionality. See docs/design/neon-street-system.md and docs/design/product-reference-lessons.md.

## Verification

Targeted ESLint: zero errors, six existing image/effect warnings. Production build and TypeScript check pass. React review found no new effects, subscriptions, data fetching or interaction barriers; decorations are hidden from assistive technology and do not intercept input. Graphify is rebuilt after the final source changes.

Browser checks cover the desktop homepage, orbit cards, frosted market cards, map guides/key/instruments and signed-out My activity. Now, List view, Community, Create choices, creator directory, How it works and My activity have no horizontal overflow or header SVG seam at 320px. Desktop guide → Free roam → Surf keeps zoom at the same coordinates; mobile navigation stays in the right viewport lane through the same transitions. Orbit right updates the displayed bearing and all five camera targets measure at least 44px. Map key hides the dock and closing restores it; the final hint measures 224px on desktop and 176px on a 320px phone, with no horizontal overflow or key overlap. The 280px phone key scrolls within the available height; Escape closes it and restores focus. At 768px, zoom remains 417px from the map’s left edge and 73px from its top across guide, Free roam and Surf.

The local database cannot reach the configured Supabase endpoint; unavailable data remains honestly labelled. Authenticated wallet/QR/payment actions are not exercised by this visual smoke test. The wallet change is its outer material only. After the main push, require the exact commit's Vercel production deployment to be READY, then check public pages, map interactions and read-only discovery APIs before reporting completion. Live screenshots and deployment proof are saved outside the repository in the chat outputs directory.

## Rollback

Revert this commit if controls cover guides, hint/key text clips, frosted text loses contrast or header navigation regresses. Original raster art is retained; no data or schema rollback is required.
