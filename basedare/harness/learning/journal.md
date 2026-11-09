# Learning journal

## November 8, 2026 — initial harness

Verified repository fact: Graphify indexes code relationships; it is not a runtime social graph. Runtime sources remain canonical Venue, identity, events, stories, relationships and attribution records. Graphify edge checks cannot establish a real participant or booking.

Verified engineering gap: the existing Field Station QR rail is designed around density/verified-outcome gates and rewrites destinations to a Board. A static discovery invitation needs a direct, current canonical destination and separate permission/expiry controls. The QR sprint reuses CreatorAttributionLink and existing attribution; no new merchant/feed/graph store.

Evidence: code inspection and the named regression receipts in this release. Product impact: NOT MEASURED. Real scan, physical sticker, creator/venue consent, phone acceptance and repeat participation remain field work. The example observation is a fixture.

For future entries record: hypothesis; evidence source and comparable window; exact revision/PR; tests and independent review; founder release decision; observed outcome with sample sizes; limitations; retain/reject/unknown decision. Never overwrite a failed experiment or infer causal improvement from views.

## November 9, 2026 — permission feedback in QR management

Manual browser verification found that a new paused QR without host permission still offered an enabled Activate button. The real API correctly rejected it; there was no unauthorized activation. The UI now disables activation until permission, tracking readiness and current-source eligibility pass. Pause/revocation stay available. This is a bounded usability correction, not measured conversion lift. Final browser and CI receipts belong to the release handoff.
