# Graffiti wordmark and shared header — 2026-10-11

## Release surface

The previous neon map and mobile discovery releases are ancestors of this change on main. The shared Navbar, Footer and legacy MobileNav now use a versioned transparent graffiti wordmark. Gold BASE, purple DARE and the braces remain recognizable; painted letters, cream/ink outlines and cyan offsets match the map illustrations. The previous logo asset remains available.

The shared navbar's full-width bottom border is removed. A masked backdrop fades behind the controls, and a static cyan-to-magenta SVG curve creates a subtle lower accent. It is decorative, cannot intercept input and uses a React useId gradient identifier. No extra motion or filter is added to the curve. Phone height/opacity are reduced. Existing mobile map blur suppression remains effective.

Logo sizes and link targets stay unchanged. Footer image sizes are explicit to avoid downloading a viewport-sized source. No page structure, navigation labels, wallet/auth flows, APIs, database, map layers or camera behavior changes.

## Verification

Targeted ESLint: zero errors, one existing no-img-element warning in legacy MobileNav. The new asset has transparent alpha and measures 1024 × 241.

The optimized production build passes. Local browser checks on Now, List view and Map confirm the shared logo and border removal. At 1280px, 390px and 320px, the header fits without horizontal overflow; the mobile menu opens and navigates to List view. The decorative backdrop has a computed 0px bottom border and a fading mask. Local data-error states reflect the checkout's missing database configuration, unrelated to the header changes. Verify the matching production deployment is READY and smoke-check public navigation before closing the release.

## Rollback

Revert the release commit if the wordmark fails to load, navigation is obstructed or the header clips on phones. No data/schema rollback is needed. Artwork provenance and prompt: ../design/basedare-wordmark-graffiti-v1.md.
