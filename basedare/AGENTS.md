## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

## Product philosophy (read before building features / writing copy)
Build *from* `docs/PHILOSOPHY.md` — BaseDare's durable principles: proof-of-presence is the moat; the map is the feed (anti-viral); lead with connection/adventure/belonging, back it with verified+paid; one city / one loop / one receipt; subtraction over addition; reputation now / token later; working beats perfect (verify before shipping). Market evidence lives in `brain-vault/03-insights/`.

## Multi-agent coordination (Claude Code + Codex in parallel)

Two agents work this repo at once. Check this section before starting, and update it after you ship, so we don't edit the same files.

### 🛑 MAP OWNERSHIP CHANGED (2026-06-09) — Claude now owns the map
Codex's `4704b999 "stabilize desktop Chrome map rendering"` **broke the desktop-Chrome map** (froze the renderer via `preserveDrawingBuffer:isDesktopChromiumRenderer` + "camera movement disabled / static redraws" → tiles never composite after the first frame; only road lines + DOM markers showed). It was reverted (restored `RealWorldMap.tsx` to pre-`4704b999`). **Codex: do NOT edit `components/maps/RealWorldMap.tsx` or `app/map/*` anymore** — Claude owns the map + the proper flicker fix now. Do not re-attempt renderer-freezing. The correct flicker approach is marker-animation pausing during gesture + `isolation: isolate` on the canvas host (NOT disabling camera/redraws).

### Ownership right now
- **Claude owns:** **the map** (`components/maps/RealWorldMap.tsx`, `app/map/*`) + creator surfaces + onboarding — `app/creators/*`, `components/creators/*`, `app/claim-tag/*`, `app/creator/[tag]/*`, the Creator Passport / Signal Points onboarding, the homepage `app/page.tsx`, `docs/gtm/*`, and the Signal Points side of `lib/vault-contributions.ts`. Shared design kit in `components/control/` (tokens) — coordinate before changing tokens.
- **Codex owns:** control chrome (`components/control/ControlChrome.tsx`, `components/BackgroundLayers.tsx`), venue/vault read+write (`lib/spot-vault.ts`, `lib/venues.ts`, `app/api/venues/*`), and the map/control-portal *styling* in `app/first-spark` + `app/scouts/dashboard`. **Not** the map renderer.

### Map flicker — Claude diagnosis for Codex (2026-06-04)
Confirmed live (desktop, dpr 2): pixelRatio is capped to 1 (`getStableMapPixelRatio` ✓, canvas backing 1198×576 = CSS size) and the canvas is layer-promoted (`transform: translateZ(0)`, `contain: paint`) — good. Residual flicker is most likely NOT the canvas itself now. Prioritized remaining suspects:
1. **DOM markers over the canvas during gesture.** Animated/absolutely-positioned `.maplibregl-marker` children repaint over the WebGL layer each frame. Confirm `mapInteractionQuiet`/`data-map-moving` actually engages on a *real* desktop pointer/wheel gesture and pauses marker CSS animations (`animation-play-state: paused`) + drops shadows/blur during movement. (Couldn't verify here: dev DB is down → 0 markers, and synthetic WheelEvents don't drive MapLibre zoom.)
2. **`fadeDuration: 0` on desktop Chromium** → tiles hard-pop across zoom steps (reads as flicker on zoom). Worth A/B vs a short fade.
3. **Host isolation reverted to `auto`** — consider `isolation: isolate` on `.map-canvas-host` so marker repaints don't re-composite the canvas layer.
Best repro: real Chrome → DevTools → Rendering → enable **Paint flashing + Layer borders**, zoom WITH markers present, see what repaints.

### ⚡ Signal Points seam is now WIRED (Claude, 2026-06) — Codex action needed
- `lib/vault-contributions.ts` `onVaultContribution` is **no longer a no-op** — a proof-gated review now awards `VAULT_REVIEW_POINTS` once per (wallet, venue) via a new **`PointsEvent`** ledger (idempotent, anti-farm), then recomputes `CreatorPassport.signalPoints`. It never throws, so your review route call is safe.
- **ACTION: run `npx prisma db push`** — it adds the new `PointsEvent` table. Until then, points award is skipped gracefully (passport reads still work).
- For your live smoke: after db push, a venue review should increment that wallet's `signalPoints` (visible via `GET /api/creators/passport?wallet=`).

### Recently shipped by Claude (on main)
- `/api/creators` now returns `signalPoints` + `routeReady` per creator (joined from CreatorPassport, graceful if unmigrated) and folds signalPoints into its sort so route-ready creators rank up. **Codex, optional:** you can now weight `creatorScore` in `app/scouts/dashboard/page.tsx` by `creator.signalPoints` / `creator.routeReady` for the radar — the fields are in the payload. Home Founding-Creators rail flips cold→live on the real `routeReady` (≥6).
- `5ab5e483` /creators/onboard wired to live Passport API (GET/PATCH/POST + wallet auth); home rail CTA → /creators/onboard.
- `db66d85f` Signal Points: PointsEvent ledger + onVaultContribution wired (needs `prisma db push`).
- `d8d33bc1` Creator Passport backend (model + lib + API). Needs `prisma db push` before live.
- `e7af76c3` IA Phase 1: `/creators` canonical, `/streamers` redirect, nav 7→5.
- `cb66333e` reconcile off-chain fee-splitter P2P to 4% (matches BaseDareBountyV2).
- `91136c48` Control redesign Phase A: shared kit `components/control/`, slimmed First Spark + Creator Radar.
- `d3ad4dca` Brand Portal connect/register → native dark DNA.
- `7f4fff99` map flicker fix: promote WebGL canvas to its own compositor layer on desktop (`@media (min-width:768px)` block in `RealWorldMap.tsx`). NOTE: Codex has since also edited this file — reconcile carefully.
- `e7af76c3` IA Phase 1: `/creators` is the canonical public directory (impl in `components/creators/PublicCreators.tsx`); `/streamers` 308-redirects. Top nav trimmed 7→5 (HOME/MAP/CREATE/DASHBOARD/CREATORS); Verify + Learn moved to footer.

### Claude working on next
- Creator onboarding: "Creator Passport" + mission checklist with Signal Points (new feature). Touches `app/claim-tag`, `app/creators`, `components/creators`, plus new onboarding components/API. Will avoid map + control-chrome files.

### Codex Spot Vault MVP (2026-06-05)
- Codex is adding the first Spot Vault slice as a **read-only venue read model**: `lib/spot-vault.ts`, `app/api/venues/[slug]/vault/route.ts`, and a compact vault rail in `components/maps/RealWorldMap.tsx`.
- This phase deliberately avoids new Prisma models, `VenueReview`, `PointsEvent`, or `CreatorPassport.signalPoints` mutations. Phase 2 rewards/reviews must coordinate with Claude before changing the points ledger or creator passport accounting.

### Codex Spot Vault Phase 2 (2026-06-05)
- Codex is adding the first vault write: proof-gated `VenueReview` records in `prisma/schema.prisma`, `app/api/venues/[slug]/reviews/route.ts`, and the existing Spot Vault rail in `components/maps/RealWorldMap.tsx`.
- Reviews require wallet auth plus a confirmed `VenueCheckIn` from `getVenueReviewEligibility` in `lib/spot-vault.ts`; the vault read snapshot now returns review aggregate + recent reviews.
- **Signal Points seam for Claude:** `lib/vault-contributions.ts` exports `onVaultContribution({ walletAddress, venueId, type: 'review', sourceId })`, currently a no-op with a `SIGNAL POINTS SEAM` comment. Claude should hook PointsEvent / CreatorPassport accounting there later. Codex did not touch `CreatorPassport`, `lib/creator-passport*`, `PointsEvent`, or `signalPoints`.

### Codex Spot Vault Phase 3 (2026-06-05)
- Codex is making review signal visible on the map: `lib/venues.ts` now includes a `reviewSignal` summary for nearby/detail venue payloads, `components/maps/RealWorldMap.tsx` feeds it into MapLibre halos/labels plus PeeBear marker chrome, and selected venue copy now calls out worth-it / needs-review state.
- Codex added review safety: `app/api/venues/[slug]/reviews/[reviewId]/report/route.ts` wallet-auths/rate-limits a review flag, flips the review to `FLAGGED`, records `REVIEW_FLAGGED` through `lib/venue-report-pipeline.ts`, and returns the refreshed vault snapshot. Public aggregates still read only `ACTIVE` reviews.
- Points seam is still untouched. Codex did not modify `lib/vault-contributions.ts`, `CreatorPassport`, `lib/creator-passport*`, `PointsEvent`, or `signalPoints`.

### Codex Venue On-Ramp Polish (2026-06-06)
- Codex added optional `backHref` / `backLabel` props to `components/control/ControlChrome.tsx` while preserving the default `/?mode=control` behavior.
- `app/brands/portal/page.tsx` now routes `?from=home` back to `/`, adds a First Spark escape path for disconnected/unregistered visitors, and shows a first-run on-ramp instead of the full `$0` console when a connected brand wallet has no spend, campaigns, proof, payouts, or campaign rows. The "Open console" button reveals the original dashboard.
- `app/first-spark/page.tsx` uses the ControlChrome back props only for `from=home`; it still avoids `source=` for the plain home on-ramp so the explanation page does not collapse into the intake form.

### Codex iPad WebKit Home Stability (2026-06-06)
- Codex touched Claude-owned `app/page.tsx` narrowly for a production load blocker: iPad Safari/Chrome were receiving the desktop `md` home hero/background path and could stall on hydration behind a black Suspense fallback.
- `lib/client-performance.ts` now treats iPad/tablet WebKit viewports as constrained; home and global shell code use that to suppress the heaviest desktop-only animation/canvas/blur layers until larger `lg` viewports or interaction.
- `app/page.tsx` now has a real static Suspense fallback with creator/venue/map CTAs instead of a blank black screen. This is a stability patch, not a homepage messaging/design ownership change.

### Codex Desktop Chrome Map Fallback (2026-06-08)
- Desktop Chrome/Chromium kept dropping MapLibre's WebGL base layer during marker/camera interaction even after DPR caps, canvas isolation, fade tuning, and camera-noop patches. The stable fix is now a Chrome-only DOM/SVG fallback inside `components/maps/RealWorldMap.tsx`.
- In desktop Chromium only, `RealWorldMap` skips MapLibre startup, marks the map ready, renders `.desktop-chrome-map-fallback` with projected venue markers, and keeps marker clicks opening the normal venue side panel. Safari, mobile Chrome, and mobile Safari still use the MapLibre path.
- Do not remove this fallback just because the MapLibre code still exists nearby; it is intentionally browser-gated to avoid Chrome's WebGL compositor flicker/black-tile bug.
