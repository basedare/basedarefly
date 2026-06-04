## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

## Multi-agent coordination (Claude Code + Codex in parallel)

Two agents work this repo at once. Check this section before starting, and update it after you ship, so we don't edit the same files.

### Ownership right now
- **Codex owns:** the map + control chrome — `components/maps/RealWorldMap.tsx`, `app/map/*`, `components/control/ControlChrome.tsx`, `components/BackgroundLayers.tsx`, and the map/control-portal styling in `app/first-spark/page.tsx` + `app/scouts/dashboard/page.tsx`. (Recent: "Stabilize desktop Chrome map rendering", "align control portals".)
- **Claude owns:** creator surfaces + onboarding — `app/creators/*`, `components/creators/*`, `app/claim-tag/*`, `app/creator/[tag]/*`, and the upcoming Creator Passport / Signal Points onboarding (new files). The shared design kit lives in `components/control/` (tokens) — coordinate before changing tokens.

### Map flicker — Claude diagnosis for Codex (2026-06-04)
Confirmed live (desktop, dpr 2): pixelRatio is capped to 1 (`getStableMapPixelRatio` ✓, canvas backing 1198×576 = CSS size) and the canvas is layer-promoted (`transform: translateZ(0)`, `contain: paint`) — good. Residual flicker is most likely NOT the canvas itself now. Prioritized remaining suspects:
1. **DOM markers over the canvas during gesture.** Animated/absolutely-positioned `.maplibregl-marker` children repaint over the WebGL layer each frame. Confirm `mapInteractionQuiet`/`data-map-moving` actually engages on a *real* desktop pointer/wheel gesture and pauses marker CSS animations (`animation-play-state: paused`) + drops shadows/blur during movement. (Couldn't verify here: dev DB is down → 0 markers, and synthetic WheelEvents don't drive MapLibre zoom.)
2. **`fadeDuration: 0` on desktop Chromium** → tiles hard-pop across zoom steps (reads as flicker on zoom). Worth A/B vs a short fade.
3. **Host isolation reverted to `auto`** — consider `isolation: isolate` on `.map-canvas-host` so marker repaints don't re-composite the canvas layer.
Best repro: real Chrome → DevTools → Rendering → enable **Paint flashing + Layer borders**, zoom WITH markers present, see what repaints.

### Recently shipped by Claude (on main)
- `d8d33bc1` Creator Passport backend (model + lib + API). Needs `prisma db push` before live.
- `e7af76c3` IA Phase 1: `/creators` canonical, `/streamers` redirect, nav 7→5.
- `cb66333e` reconcile off-chain fee-splitter P2P to 4% (matches BaseDareBountyV2).
- `91136c48` Control redesign Phase A: shared kit `components/control/`, slimmed First Spark + Creator Radar.
- `d3ad4dca` Brand Portal connect/register → native dark DNA.
- `7f4fff99` map flicker fix: promote WebGL canvas to its own compositor layer on desktop (`@media (min-width:768px)` block in `RealWorldMap.tsx`). NOTE: Codex has since also edited this file — reconcile carefully.
- `e7af76c3` IA Phase 1: `/creators` is the canonical public directory (impl in `components/creators/PublicCreators.tsx`); `/streamers` 308-redirects. Top nav trimmed 7→5 (HOME/MAP/CREATE/DASHBOARD/CREATORS); Verify + Learn moved to footer.

### Claude working on next
- Creator onboarding: "Creator Passport" + mission checklist with Signal Points (new feature). Touches `app/claim-tag`, `app/creators`, `components/creators`, plus new onboarding components/API. Will avoid map + control-chrome files.
