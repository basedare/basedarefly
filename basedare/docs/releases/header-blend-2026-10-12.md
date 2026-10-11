# Page wash blend — 12 October 2026

The Create entry (/start) had a page-local cyan/purple gradient beginning abruptly at the shared main area's 96px offset. This looked like a line beneath the navigation even though the navbar had no border or shadow. List view, Now and Community used the same hard-start pattern.

All four decorative layers now use bd-page-wash, a static transparent-to-opaque mask over the first 9rem. The shared background remains continuous at the top edge while the existing colour and text contrast return gradually. Standard and WebKit mask declarations are included. Only decorative, aria-hidden, pointer-events-none layers are masked; content, controls and header geometry are unchanged.

## Verification

- Optimized production build including TypeScript passes; targeted ESLint passes; Graphify rebuilt; whitespace check passes.
- Compared live before and local after at 2048×1026. Checked 390px Create/List view, 320px List view, and phone menu → List view navigation. No horizontal overflow; the mask resolves to a 144px fade.
- Local Now, paid/free Create, My activity, Community, About and FAQ render with zero header border/shadow and no horizontal overflow at 1280px. List data is unavailable in this local environment; no activity or financial data was altered.
- Browser evidence is saved outside the repository in outputs/header-blend. Verify the exact commit's Git production deployment and the public Create/List view mask after pushing to main.

## Rollback

Revert this release if a page wash obscures text, intercepts input or creates another visible band. No database, configuration, identity, payment or map-renderer changes are involved.
