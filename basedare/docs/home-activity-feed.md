# Live Around You: next-move feed

## Scope

The homepage reads the existing shared Live Plan projection and local community posts. Published events, meetups, boats, free Sparks and paid missions keep their canonical detail/join/request destinations. No attendance, reward, venue opening hours or event is generated to fill a gap.

Sparse results are filled to at least three cards with authored, clearly labelled free suggestions. Suggestions rotate daily and on request. Outdoor ideas respect destination daylight; late-night ideas can be done from where the visitor already is. The map, hero, node background and community/paid product model remain intact. Mobile retains a snapping card rail, continuation control and supported-device haptics.

The initial area is explicitly General Luna, Siargao, within 25 km. Location access is requested only when the visitor chooses it. Area-scoped responses cannot leak into another selected area. The feed refreshes every visible minute and on return; expired/cancelled activities disappear. Failed live data is labelled as unavailable, with useful suggestions still accessible.

Suggestions have editable-by-choice personal progress: one chosen next move, steps, and an optional self-reported completion. Progress stays on this browser for 24 hours. It grants no verified presence, points, paid claim or automatic invitation.

## Island Pulse poster workflow

1. Open /admin/island-pulse and use the existing moderator/session authentication.
2. Attach a public JPG/PNG poster, at most 4 MB. Crop private messages out first.
3. Optionally read its text on-device. OCR downloads its worker/language resources on demand; the flyer itself is processed locally. Correct the extracted words and add them to the existing source text.
4. Build a draft. This uploads the original image through existing public media storage and retains its link beside the extracted draft. If draft creation fails after upload, retry reuses that uploaded file.
5. Compare with the original, choose the canonical venue, and explicitly confirm date/year, venue-local start/end, summary and source confidence through the existing publishing form.

An image attachment never publishes an event. Ambiguous “tonight” or “9/25” remains a mention until an operator confirms it. Instagram professional-account caption ingestion already exists; this change does not connect additional accounts, scrape Stories or establish complete local event coverage.

## Measurement

- home_activity_opened: activity_id, activity_kind, source; real plans also carry canonical plan_id/plan_type.
- home_suggestion_started: visitor explicitly saves a suggested next move.
- home_suggestion_completed: self_reported only.
- home_activity_returned: a recent activity open followed by a homepage mount/tab return, consumed once per stored open. This is a return signal, not proof of attendance.
- Existing live_plan_joined events record successful event/meetup/boat participation. Boat and meetup events now include their canonical plan_id to join the funnel. Paid requests retain the existing mission flow and tracking.

Use existing PostHog configuration. Without it, development logs allow verification and production collection remains disabled. Never infer a join or purchase from a card click.

## Rollout

No database migration or settlement change. Add the pinned OCR dependency through the lockfile. Public poster storage needs the existing media-upload credentials. Verify a real operator upload and event publication after deployment; no production event, file upload, RSVP or paid transaction is created during local checks.

Monitor activity opens → actual participation starts → returns, failed refreshes, and the time an operator spends keeping sourced events current. Feed coverage still needs venues and operators supplying current information.

## Local verification, 26 September 2026

- 23 focused activity/event/recommendation tests pass. App and test typechecks pass; full lint reports zero errors (202 warnings across the repository). Static safety checks and production compilation pass.
- Desktop and 390px browser checks cover sparse/error inventory, three suggestions on an empty feed, a synthetic sourced event ahead of suggestions, expiry on return, canonical detail links, saving/restoring/completing a personal activity, and mobile swipe/progress.
- The supplied Mr Turtle flyer was processed by the real browser OCR worker. Stylised lettering and the date were not reliably extracted; manual correction remains required. A synthetic admin session/upload/draft response verified corrected text preservation after failure, reuse of one uploaded image on retry, original-image comparison and a blank exact start until human confirmation.
- The real local upload endpoint returns 401 without authentication. Admin upload/draft success was mocked; no production storage, database write, publish or participation action was performed. Local shared-feed database access was unavailable, so populated-feed rendering was verified with browser fixtures. Production event coverage and analytics receipt remain deployment checks.
- An existing content-delivery test fixture received an explicit ContentDeliveryBrief annotation to make the test-project typecheck valid; no content-rights behavior changed.
