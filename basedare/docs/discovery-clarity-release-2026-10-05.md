# Discovery entry and public explanation — 5 October 2026

Follows venue release 17d2bbd3, deployed successfully. Production read-only checks confirmed operator-only QR access (anonymous 401), Hideaway fixture history excluded and the updated venue page served.

## Changes

- Homepage area controls now use the physical All/Play/Meet/Earn button material with visible focus/press/selected states, a 44px target and feedback when choosing Siargao. Location is requested fresh; denial does not erase the selected area.
- Now offers Start an adventure alongside Start a meetup, including an adventure fallback when published plans are empty or unavailable. The link keeps the selected coordinates and discovery context.
- How It Works explains the current free adventure → journal → optional reviewed sharing flow, meetup entry, assignment approval/payment distinction and operator QR plus fresh GPS check-in. Old Rally/Spark glossary removed. Earning deep links now land on a visible section after the app shell hydrates.
- Homepage, default search/share metadata and About use a shared product description. About no longer redirects to Trust & Safety. WebSite structured data matches the visible description. Discovery/help pages are included in the sitemap, and fixture/simulated/unfunded paid records are excluded from it.

## Verification

Browser checks cover the mobile earning anchor (128px below the viewport top, no horizontal overflow) and Now → adventure selection → Start this adventure without sign-in. Test progress was stopped; no media, meetup, check-in or payment was published. The production live-plans API returned 200 with zero plans. The local preview's live aggregation returned an error, so the free-adventure fallback was also exercised.

Typecheck, production build and Graphify refresh passed. Focused lint had zero errors and three React effect warnings. The homepage Siargao button was clicked from a different selected area: its selected state, feedback, map, community and adventure links all updated together. No database migration or new dependency.

## Search limits

Google generates its own summaries from indexed content. Updating descriptions, visible copy and discoverability provides clearer source material; it cannot force a particular AI summary or instant recrawl. Google guidance: https://developers.google.com/search/docs/appearance/ai-features and https://developers.google.com/search/docs/appearance/snippet.

## Remaining launch dependency

No paid funding/payout/refund trial occurred. The configured mainnet bounty address still requires the separate operator-signed cutover and real transaction proof described in the payment release/runbook.
