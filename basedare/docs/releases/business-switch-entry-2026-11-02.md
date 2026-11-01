# One business entry from the homepage switch

The Chaos/Control switch still opened an older inline Control landing view even though `/brands/portal` and general `/activations` already used the new business welcome. The switch now navigates straight to `/brands/portal?from=home`, with the three business goals and existing guest enquiry flow. It does not set a global business view that would leak into subsequent community navigation.

Existing `/?mode=control` links redirect to that same entry before the old page renders; the client fallback also replaces legacy navigation. The welcome includes a clear Community return link. Goal-specific enquiries, existing workspaces, venue and advanced tools retain their routes and authorizations. The workspace link in the legacy view explicitly targets `?workspace=1`.

This is a navigation repair. No account, enquiry persistence, pricing, rights, funding, payment, schema or runtime setting changes are included. Check the real desktop/mobile switch, legacy redirect, all three goal routes, guest form, return to community and existing workspace. Run the existing buyer policy tests, typecheck, lint, build and Graphify.

The preceding Moments release is already live from PR #42 at main `fdf5a58a251f6fe86b356053e03aa8d7629ecfb9`, deployment `dpl_EXJVpHm5K99JbjR7jQWj6qkszRkn`. Its automated/local checks pass, while actual permissioned-source/physical-phone acceptance and both production intake flags remain unchanged. Ordinary Preview currently lacks DATABASE_URL; production-configured staging and the subsequent live revision passed database-backed read checks. Do not describe Preview as an isolated functional database or insert synthetic records remotely.
