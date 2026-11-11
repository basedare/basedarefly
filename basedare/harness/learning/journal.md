# Learning journal

## November 8, 2026 — initial harness

Verified repository fact: Graphify indexes code relationships; it is not a runtime social graph. Runtime sources remain canonical Venue, identity, events, stories, relationships and attribution records. Graphify edge checks cannot establish a real participant or booking.

Verified engineering gap: the existing Field Station QR rail is designed around density/verified-outcome gates and rewrites destinations to a Board. A static discovery invitation needs a direct, current canonical destination and separate permission/expiry controls. The QR sprint reuses CreatorAttributionLink and existing attribution; no new merchant/feed/graph store.

Evidence: code inspection and the named regression receipts in this release. Product impact: NOT MEASURED. Real scan, physical sticker, creator/venue consent, phone acceptance and repeat participation remain field work. The example observation is a fixture.

For future entries record: hypothesis; evidence source and comparable window; exact revision/PR; tests and independent review; founder release decision; observed outcome with sample sizes; limitations; retain/reject/unknown decision. Never overwrite a failed experiment or infer causal improvement from views.

## November 9, 2026 — permission feedback in QR management

Manual browser verification found that a new paused QR without host permission still offered an enabled Activate button. The real API correctly rejected it; there was no unauthorized activation. The UI now disables activation until permission, tracking readiness and current-source eligibility pass. Pause/revocation stay available. This is a bounded usability correction, not measured conversion lift. Final browser and CI receipts belong to the release handoff.

## November 9, 2026 — explicit proposal uncertainty and research backlog

- Observed gap: the deterministic planner already separated fixtures, missing evidence and self-reports, but its proposal omitted explicit confidence, user impact, safety risks, required tests and rollback. Six aggregate totals also cannot establish matched cohorts, guardrail outcomes or distinct individuals.
- Change: retain the exact observation schema and rules; add reviewable proposal fields, mandatory comparability checks and unmeasured completion-quality, complaint/privacy, moderation/reliability guardrails. Thresholds remain triage heuristics. Large coherent totals never become proof of causal lift or automatically pass those gates.
- Evidence: repository inspection and the primary-source observations linked in [the research note](../../docs/design/discovery-research-2026-11-09.md). Koobo/TravelGO public descriptions suggest practical context/action/status lessons; official OpenAI documentation supports map visualizations and source-based conversational refinement, not a verified separate “GPT Maps” product. No interviews, competitor traction, fulfilled bookings or psychological effects were established.
- Validation: `node --test harness/evaluate.test.mjs` passed 13 tests, including real CLI privacy/output behavior, every proposal path, large-sample uncertainty, missing versus zero, stage mismatches and deterministic isolation. This receipt is for harness behavior only, not browser/device/provider acceptance or the whole release.
- Experiments: [A–E](../experiments/discovery-learning.md) and [the record template](../experiments/template.md) are PROPOSED, not activated or authorized outreach. Outcome: NOT MEASURED. Guardrail outcomes and interviews: UNKNOWN/UNAVAILABLE. WVRP remains a proposed measurement definition; the Constitution's core metric is unchanged.
- Review/release: independent review and founder decision remain pending for this increment. No production access, messages, money, new tracking or automatic experiment was used. Decision: retain the explicit evidence gates for review; actual user-impact hypothesis remains UNKNOWN. Rollback: revert this planner/documentation increment without changing historical exports, consent, attribution or product data.

## 2026-11-11 — Discovery eligibility and recognition review

- Actual parser/database regressions caught comma-separated budgets parsed as prefixes, and future outdoor events bypassing daylight checks through a generic browse window. Parse the whole stated budget; evaluate future suitability at the scheduled start.
- Display eligibility alone is not creator-credit authority. Related reads now recheck current credit, source wallet and profile ownership before emitting derived creator/place edges; actual interleaved DB mutations exercise that boundary.
- Header search needed the same current canonical venue/identity filters. An inactive/blocked canonical place must not reappear through static curated fallback.
- Recognition XP uses a separate namespace, source-authoritative awards, retry-safe immutable drafts and append-only correction/consent audit. Real DB tests show XP/reversal does not alter existing Signal Points. Reviewed creation still does not prove presence.
- These are verified engineering findings. No field interviews, campaign participation, delivered messages, revenue or causal product lift has been measured by this release.
