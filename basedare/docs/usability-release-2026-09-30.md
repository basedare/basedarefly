# Usability and continuity release — 30 September 2026

## What changed
- Public buyer actions say “Request on-site checks” or “Describe what you need.” FAQ, How It Works, invoice intake and repeat-work links use the same language. The existing managed price and approval requirements remain unchanged.
- First Spark is a venue activity request. It no longer advertises dated example nights, a preselected 20-person outcome, or internal routing notes. Place, proposed time, optional offer, visitor target and contact details stay attached to the request. Nothing publishes or charges on submission.
- Shared discovery links retain area, radius, participation category and time window. Nearby data is still independently refreshed by each surface; this is not a new unified backend or a claim that every map/list filter is identical.
- Meetup creation leads with what, where and when; activity templates and optional group details stay behind two compact disclosures. Meetup drafts survive refresh for 24 hours in session storage, separately by area and explicit venue/repeat context. Sign-in opens in place; publication requires a separate user action. Scheduling uses the selected venue timezone, with explicit UTC fallback outside Siargao when no timezone is supplied.
- Dashboard prioritizes activity, work and saved adventures. A missing public profile is no longer labelled “Not connected.” Management reports are collapsed on venue pages.
- Venue access is explained as map search → View place → owner/manager section → public handle and access request → approval → Manage venue. Claim-tag links retain a safe return to that venue. Access control and review remain unchanged.
- Mobile Directions/View place controls use a fixed 48px height. The adventure link no longer shares the View place button’s height-filling layout. Existing homepage segmented controls and cosmic backgrounds are preserved.
- Failed listings have distinct recovery states instead of false empty results. Venue summaries use UTC calendar buckets rather than the last N recorded rows. Public reward totals exclude simulated/unfunded dares and require recorded funding/payment evidence; these are database records, not a new on-chain reconciliation service.

- Subtraction pass: First Spark asks five essential fields (three with venue/area context); one request replaces separate goal, attendance, reward and baseline questions. Optional planning details carry forward. An undecided budget is stored as null, never an assumed $2,500 commitment. The managed quote and explicit downstream approval remain unchanged. Repeat enquiries create a fresh lead after a scope reaches invoicing/payment, preserving the agreed record.

## Validation
- 25 targeted tests pass: discovery context, destination-local scheduling, venue calendar reporting, homepage activities, World Pulse, First Spark windows and unpriced/repeat enquiry protection.
- Typecheck and production build pass. Changed-file lint has no errors; existing image/effect warnings remain.
- Phone-width checks cover buyer entry, the compact First Spark form (including its optional unpriced budget), dashboard, community, adventures, paid listings and the expanded Greenhouse map panel. Directions and View place render as unclipped 48px controls. Meetup draft restoration and in-place sign-in were exercised without publishing. Public venue data may be replayed locally for layout checks; this does not verify a production claim, check-in or payment.
- No schema, contract, payout, permissions or production data changes. Real-phone wallet/payment completion, live venue approval, push delivery and previously documented mainnet reward readiness remain separate verification gates.

## Release / rollback
Ship through origin/main and confirm the matching Vercel deployment is ready. Smoke-test the public entry pages and venue panel after deployment. Revert this release if navigation loops, primary actions become inaccessible, or the new report queries fail in production. Do not resolve an unrelated money-rail blocker by changing live contract settings in this release.
