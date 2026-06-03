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

### Recently shipped by Claude (on main)
- `cb66333e` reconcile off-chain fee-splitter P2P to 4% (matches BaseDareBountyV2).
- `91136c48` Control redesign Phase A: shared kit `components/control/`, slimmed First Spark + Creator Radar.
- `d3ad4dca` Brand Portal connect/register → native dark DNA.
- `7f4fff99` map flicker fix: promote WebGL canvas to its own compositor layer on desktop (`@media (min-width:768px)` block in `RealWorldMap.tsx`). NOTE: Codex has since also edited this file — reconcile carefully.
- `e7af76c3` IA Phase 1: `/creators` is the canonical public directory (impl in `components/creators/PublicCreators.tsx`); `/streamers` 308-redirects. Top nav trimmed 7→5 (HOME/MAP/CREATE/DASHBOARD/CREATORS); Verify + Learn moved to footer.

### Claude working on next
- Creator onboarding: "Creator Passport" + mission checklist with Signal Points (new feature). Touches `app/claim-tag`, `app/creators`, `components/creators`, plus new onboarding components/API. Will avoid map + control-chrome files.
