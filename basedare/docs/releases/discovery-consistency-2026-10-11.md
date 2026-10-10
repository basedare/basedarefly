# Public page consistency — 2026-10-11

## Release surface

The previous mobile discovery, neon map, place button and graffiti header commits remain ancestors of this release. This pass keeps the homepage's visual world and map behavior, and tightens the surrounding content design.

Shared opt-in typography aligns Now, Create choices, List view, Community, Adventures, About, How it works, Earn, the creator directory and signed-out My activity. FAQ, Leaderboard and the creation form receive matching top spacing while preserving their existing display art. The homepage CTA/feed actions and global footer use the same raised control family. Navigation uses cyan, main actions gold, adventures violet and PeeBear quiet gold. No new motion, assets or dependencies.

Creation choices use paid dare / free challenge / meetup. The existing community challenge form uses matching wording and a free activity explanation instead of the paid funding/payout sequence. Internal identifiers, routes, submission handlers and payment logic are unchanged. Homepage filters reuse the existing participation taxonomy used by Now; both wrap into two columns on phones. The homepage activity section recovers nested horizontal padding below 768px without changing the hero. Creator directory navigation is a single semantic link per action, replacing nested buttons. Below 375px, compact logo/account slots and gaps reserve space for the loaded notification bell; the mobile menu has a 44px target. Default logo sizing remains unchanged on wider phones. Compact navigation stays available below 1280px so tablet widths do not clip the desktop navigation or overlap the logo.

## Verification

Targeted ESLint has zero errors, with six existing image/hooks warnings in the affected source. The optimized Next build and TypeScript check pass. Browser review covered the homepage, Now, creation choices/free challenge form, List view, Community, Adventures, creator directory, About, How it works, FAQ, Leaderboard and signed-out My activity. Responsive checks at 320, 390, 768, 1024 and 1280px found no document overflow; compact menu open/navigation/close and desktop link spacing pass. The final homepage check confirms 44px filter targets, the shared labels and a working Free challenges selection. Hero/orb and graffiti assets remain present. Graphify is rebuilt. Exact-commit Vercel readiness and public smoke checks are required after the main push. Local database requests cannot reach the configured Supabase endpoint; do not classify their honest unavailable states as a visual regression or fabricate activity. Public production data is checked separately after deployment.

No API, auth, wallet, contract, database schema, migration, map source, camera or marker change is included. Authenticated wallet actions and external payments are outside this visual smoke test.

## Rollback

Revert this commit if headings or controls clip on phones, page navigation regresses or content loses contrast. No data/schema rollback is required. Confirm the exact main commit's Vercel production deployment is READY and public navigation loads before calling the release complete.
