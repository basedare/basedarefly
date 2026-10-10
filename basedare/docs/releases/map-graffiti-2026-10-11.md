# Neon graffiti map artwork — 2026-10-11

## Release surface

The approved coffee cup establishes a matching set of twelve map and guide illustrations: coffee, nightlife, drinks, surf, outdoors, fitness, rental, wellness, meetups, secrets, challenges and surf boat. Cream outlines and cyan/magenta/violet paint replace ornate gold props. The production set is transparent 256px WebP, about 248 KiB combined, in public/assets/map/graffiti-v1. Original artwork remains available.

Place sprites lose their floating pedestal and use a shorter ink shadow. Category resolution, state badges, clustering, labels and click targets are preserved. The Map key uses the new coffee illustration.

Locate and zoom controls now occupy a stable lane independent of guide state. Desktop controls sit beside the 24rem guide area; phone controls sit at the right edge below the expand control. Phone guide cards reserve that lane instead of covering the buttons when Surf opens.

The whole-map skin recolors existing vector layers: ink land, navy water, violet road edges, mint arterial cores and a cyan coastline. Place labels retain contrasting dark halos. A static stipple texture replaces the dense adventure grid and disappears during camera movement. Guide cards, navigation and Map key use cream ink edges, asymmetric corners and restrained magenta offsets. Older global material overrides are removed so desktop and phone surfaces agree.

No API, database, authentication, wallet, payment, map source, camera or clustering changes.

## Verification

The optimized production build passes. Targeted ESLint reports zero errors and three existing map image warnings. All twelve production assets have transparent alpha and are 256px square.

Browser checks at 1280px, 390px and 320px confirm readable map labels, guide switching, Surf/zoom interaction, reachable 44px navigation targets and no horizontal overflow. Clicking the Greenroom place marker opens the matching place card and directions link. The production-built app was checked again at desktop and 390px after the final build.

The local nearby endpoint returns HTTP 200 with the existing 24-place curated fallback when the production database is unavailable locally. Surf and Tonight retain their existing unavailable/refresh states; this visual release does not change their data paths. Confirm the matching Vercel deployment is READY and smoke-check the public map after pushing.

## Rollout and rollback

Push the reviewed change to main, verify its Vercel production deployment reaches READY, and smoke-check the public map. Previous mobile discovery and place action color changes remain in the branch history.

Revert this commit if category icons fail to load, place selection regresses or navigation is covered by a guide. No data or schema rollback is needed.
