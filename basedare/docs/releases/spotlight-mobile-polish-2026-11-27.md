# Spotlight and Live Around You — mobile polish

## Scope

- Preserve the homepage hero, PeeBear, electric background, orbit, radar, CHAOS/CONTROL switch, full map and all existing routes.
- Compact the existing Live Around You panel. Keep the location and map controls, all four activity filters and the original community features. Surface the canonical funded inventory first in Everything/Paid dares, distinguish an unavailable feed from an empty listing, and fold duplicate links into a secondary disclosure.
- Preserve `/moments/spotlight` and canonical dated links. The current-week entry redirects only when the existing approved, consented editorial selection is present. Otherwise, show a branded empty stage and links to paid and free dares. The selected creation uses a responsive media-first layout, preserves credit, original source, sharing, reporting and optional editorial recognition. No additional publication rights, automatic selection, prize, payout or BaseClips integration.

## Local evidence

- Optimized application build, existing Moments/discovery/Dare Loop/harness suites and touched-file lint passed (existing hook warnings only).
- Render rehearsals exercised the actual empty and eligible featured Spotlight components with local-only selection fixtures, including credit, playback, try/share/report, canonical redirect, unavailable dated route and the non-reward disclosure. This is presentation evidence, not provider/DB proof.
- Loopback browser checks at 320, 390 and 1440 CSS pixels confirmed no horizontal homepage overflow, direct map access, paid-card reward and action, category filtering and preserved original sections. The Spotlight presentation fixture fit 320/390px without horizontal overflow; the empty paid/free actions fit the 390×844 viewport and the selected media used two desktop columns. No fixtures were sent to production.
- The disposable PostgreSQL suite could not start because the local managed environment denied `shmget`. Run the existing DB and optimized HTTP Moment journey in an authorized CI/runtime with local PostgreSQL before marking the release ready. Existing build warnings and missing local provider keys do not establish live provider readiness.

## Acceptance and rollback

Run the unchanged hosted checks, inspect both mobile presentations and the current production selection, verify the direct MAP and CHAOS/CONTROL behavior, and obtain release approval. Revert this UI-only increment if layout or discovery regresses. Payment, review, publication and BaseClips readiness remain independent gates; no runtime configuration or production data is changed here.
