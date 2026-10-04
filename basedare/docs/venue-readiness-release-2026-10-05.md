# Venue usability and evidence integrity — 5 October 2026

## Behavior

The pin popup and venue page share one meetup composer, using the venue's time zone for Tonight and custom times. Optional invitations are preserved. Visitor actions lead to directions, the place page, free adventures, reviewed media and meetups. Chat/history and management tools are collapsed to reduce clutter. BaseCash remains an explicitly manual venue-credit pilot inside venue tools; no Yodl settlement is implied.

Seeded place tags, seeded proof hashes, the known Phase5 test dares, simulated records and paid dares without recorded funding are excluded from public venue evidence and tag counts. No historical rows are deleted or reclassified. Legacy aggregate memory buckets are no longer shown as Spot Vault timeline evidence. Internal historical reports may retain legacy aggregates.

The rotating QR endpoint now requires the approved venue operator's session or internal authorization. Operator session mutations additionally require the matching session bearer. Visitors scan the QR displayed at the venue with their phone camera. Verified check-in requires a live signed QR, authenticated wallet, fresh GPS (at most two minutes old), accuracy within the smaller of the venue radius and 100 metres, and the existing radius check. Denied GPS cannot downgrade to QR-only proof. Public temporary presence remains separate.

## Verification

- TypeScript check and focused lint: passed (existing image-optimization warnings only).
- QR authorization tests: anonymous/unrelated wallets denied, owner allowed, private no-store response, mutation session enforced.
- Location tests: missing, stale, future and inaccurate positions rejected.
- Disposable PostgreSQL integration: legitimate direct and funded updates visible; seeded, test, simulated and unfunded records excluded; all historical rows preserved.
- Venue-local time tests cover Manila and invalid/ambiguous/nonexistent DST times.
- Browser checks: desktop and 390px venue page/pin, shared meetup entry, expandable people/chat. No real meetup, check-in or financial transaction was submitted.
- Production build, static safety and Graphify refresh passed. The local env export had an empty VERCEL_URL; the build was rerun with NEXTAUTH_URL explicitly set to the site URL. No deployed environment variable was changed. The read-only database gate confirmed 59 migrations and 77 models.
- Local HTTP checks: anonymous QR 401, missing GPS 400, Hideaway public tags 200 with zero fixture updates.

## Release and rollback

No schema migration or environment change. Push to main and verify deployment plus anonymous QR denial and filtered Hideaway history. If visitor pages fail or real approved evidence disappears, revert this release's UI/filter changes while retaining the operator-only QR boundary.

## Limits

Browser GPS is a fraud signal, not tamper-proof hardware attestation. A real-phone venue scan with an approved operator still needs field validation. Existing legacy reports and historical QR-only receipts are retained. Payment launch remains blocked by missing bytecode at the configured mainnet bounty address; no contract deployment or settlement occurred in this release.
