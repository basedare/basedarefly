## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

## Product philosophy (read before building features / writing copy)
Build *from the single aligned canon* in `docs/PHILOSOPHY.md` and `brain-vault/00-control/vision.md`. BaseDare is a remote, bounty-funded discovery network: safe dares pay contributors to create verified place intelligence; the map is the feed; place memory and verification are the assets being built; every batch must create a durable receipt; events are optional local-partner products; reputation now / token later; working beats perfect. If these two files ever conflict, reconcile them in the same change before continuing. Market evidence lives in `brain-vault/03-insights/`.

## Multi-agent coordination (Claude Code + Codex in parallel)

Two agents work this repo at once. Check this section before starting, and update it after you ship, so we don't edit the same files.

### Codex floating world-marker pass (2026-07-12)
- User explicitly reassigned the map surface to Codex while Claude was out of credits and requested direct-to-main delivery.
- `components/maps/RealWorldMap.tsx` now presents venue/activity sprites as frameless floating AR-style objects with silhouette cuts, world tethers, and ground glows; real venue names and place-memory states remain intact.
- Desktop-only orbit/tilt/north controls are a compact right-side pad. Mobile remains gesture-only and renders no camera-control buttons.
- PeeBear uses the canonical transparent head; tapping cycles field tips without reopening the mission chooser. On mobile, Adventure/Tonight/Secrets/Trail live in the existing horizontally scrollable status rail instead of a second floating row.
- The public place filter has one vocabulary and one control surface: All places / Live now / Verified / Needs proof. Desktop no longer repeats internal heat states; mobile exposes the same four choices under More. Creation actions live under Add to map, and personal views live under Your map.
- Map funding is explicitly the quick, paid, place-locked 24h composer; it links into `/create` as the full paid/free/custom builder. Direct place proof is labeled as an unpaid map contribution with trail/receipt value and a one-time approved-proof Signal Points mission. PeeBear guide cards temporarily hide the mobile fullscreen control so their close targets never overlap.
- Marker art now uses five individual transparent 3D WebPs in `public/assets/map/holograms/` (flag, surf, cafe, gathering, rumor). Hologram rings/beams are lightweight DOM/CSS state modifiers; never restore the baked-background `adventure-sprites-v1.png` atlas or emoji legend stacks.
- Preserve the existing MapLibre camera/renderer and marker gesture calm-down path; this pass changes DOM-marker presentation and existing camera-control placement only.

### Codex universal consumer onboarding pass (2026-07-11)
- Codex is adding a new neutral `/join` entry point, plain-language global nav/sign-in/footer copy, a consumer-first top layer on `/how-it-works`, onboarding CTA analytics, and the `brain-vault/05-playbooks/playable-map-launch.md` launch strategy.
- Files owned in this pass: `app/join/*`, `components/onboarding/*`, `components/Navbar.tsx`, `components/IdentityButton.tsx`, `components/Footer.tsx`, `app/how-it-works/page.tsx`, and the targeted Brain control/playbook edits.
- Codex did **not** edit Claude-owned `app/page.tsx`, `components/home/*`, `app/map/*`, `components/maps/RealWorldMap.tsx`, or `app/creators/*`. Claude follow-up should replace remaining creator-first homepage/map language only after this pass is verified.

### 🚀 Remote proof rail blockers (2026-07-10)
**TAKEOVER CLOSED LOCALLY (2026-07-10):** Claude hit its usage limit mid-closure and the user explicitly assigned Codex to finish Phase 2. Codex completed the implementation and verification pass below. Nothing was staged, committed, migrated, deployed, or sent on-chain. Claude may inspect the handoff after reset, but coordinate before editing these still-dirty files.

**Phase 1 — wallet-first open-dare claim (ship first)**
- Let an authenticated, signed cold wallet submit an open-dare claim request without first owning a verified `@tag`.
- Removing the tag check in `app/api/dares/[id]/claim/route.ts` is not sufficient: `app/api/admin/claims/route.ts`, admin UI, alerts, receipts, and proof/payout paths currently assume `claimRequestTag` exists. Trace and make the full wallet-only path work.
- Keep `claimRequestTag` nullable; never mint a fake tag from a wallet. Use a shortened wallet only as display fallback.
- Preserve the moderated claim safety lane: `PENDING` dare → pending claim request → approved wallet assignment (`claimedBy` + `targetWalletAddress`, `claimRequestStatus=APPROVED`) → proof. Set `streamerHandle` only when a real tag exists.
- Tagged creators must continue to work unchanged. Withdraw, reject, duplicate-request, expiry, wallet mismatch, proof authorization, payout, and receipt actor fallbacks must still work.
- Passport/tag onboarding happens after value is demonstrated; it must not gate first proof or payout.

**Phase 1 review gates from Codex (2026-07-10) — close before calling complete**
- The current four-file slice is directionally correct but lint + typecheck are not lifecycle proof. Add route/state tests before handback.
- `DELETE /api/dares/[id]/claim` is still session-only while `POST` accepts a signed cold wallet. Use the same wallet-action authorization model so a wallet-only claimant can withdraw its own pending request.
- The claim API currently checks only `status=PENDING`; enforce server-side that the dare is genuinely open (no assigned target/claimer and only null/open/everyone handles), still unexpired, and claimable. Revalidate those facts during moderator approval.
- Make claim submission and approve/reject decisions compare-and-set/transactional. Two claimers or two moderators must not race through stale reads; return `409` when state changed.
- On wallet-only approval, clear only open sentinel handles such as `@open` / `@everyone` so receipts and proof actors fall back to the assigned wallet. Never leave `@everyone` masquerading as the completing actor, and never clear a real creator handle.
- Reject direct same-wallet funder → claimant self-dealing unless an explicit, separately reviewed policy exception exists. Add per-wallet/IP throttling and a bounded pending-request TTL/release path so disposable wallets cannot squat the single claim slot indefinitely.
- Approval must not revive or assign an expired, refunded, failed, already-claimed, or otherwise non-claimable dare. Preserve the existing tagged-creator path.

**Phase 1 closure audit from Codex (2026-07-10) — verified, with final corrections**
- Independently reproduced: 16/16 claim-policy tests pass, touched-source ESLint passes, and `tsc --noEmit` passes using the bundled Node runtime. The policy extraction is sound, but these remaining items must close before Phase 1 is marked complete.
- `DELETE` currently verifies the same signed action string (`dare:claim`) as `POST`. Use a distinct action such as `dare:claim:withdraw` and update the caller/tests so a fresh claim signature cannot be replayed as a withdrawal authorization.
- `isApprovableAtDecision` must revalidate genuinely-open handle state and same-wallet funder/claimant self-dealing, not only status/assignment/expiry. If `streamerHandle` becomes a real creator between request and moderation, approval must return `409`, not preserve that handle while assigning another wallet.
- Put the relevant open-handle and unexpired predicates inside the approval compare-and-set, not only in the pre-write read. Time passing or a concurrent handle change must make the write lose. Apply equivalent state guards to rejection so it cannot rewrite claim status on a terminal/already-assigned dare.
- The in-memory per-wallet/IP limiter is useful load shedding but is not a durable anti-Sybil control across serverless instances or disposable wallets. Do not claim that it closes squatting. The 30-minute release path limits one lock; durable abuse accounting remains required before public real-money scale.
- `tsconfig.json` now excludes `*.test.ts`, while Node's strip-types runner does not typecheck tests. Add a small test tsconfig/typecheck command or otherwise keep test files typechecked; passing runtime tests alone is not a typed-test convention.
- After these corrections, continue directly into Phase 2. Do not stop for another strategy checkpoint; Phases 1–2 remain one uncommitted/unshipped unit.

**Phase 2 — submission-time proximity enforcement (ship with Phase 1)**
- Trace every proof entry point, especially `components/SubmitEvidence.tsx`, `app/api/upload/route.ts`, `app/api/verify-proof/route.ts`, Telegram/internal submissions, and retry paths. This is an end-to-end change, not a schema-only check.
- For nearby IRL dares, capture browser location at proof submission, including latitude, longitude, accuracy, and capture time. Validate all values server-side and compare against the dare's stored latitude/longitude and `discoveryRadiusKm` using the shared geo utility.
- Persist the submitted location plus calculated distance/proximity result for auditability; add a Prisma migration if fields are needed. Never overwrite the dare's target coordinates with contributor coordinates.
- A nearby IRL proof with missing, stale, invalid, or out-of-radius location must never auto-approve. Route genuinely uncertain/missing-location cases to Sentinel/manual review; reject clearly out-of-radius evidence with an actionable response. Preserve STREAM behavior.
- GPS is one evidence rung, not spoof-proof truth. Keep existing trusted-upload, freshness, deduplication, wallet authorization, paid-mission, Sentinel, review, payout, and appeal protections. Include proximity in verification reason/receipt data without exposing unnecessarily precise public coordinates.
- Add boundary tests: inside radius, exactly at boundary, outside radius, bad coordinates, excessive/stale accuracy data, missing permission, retry, internal submission, and STREAM regression.

**Phase 2 evidence-rail addendum (2026-07-10)**
- Prefer an append-only `DareProofAttempt`/equivalent evidence ledger over mutable proof-location columns on `Dare`. Retries, appeals, internal submissions, and disputes must not overwrite the earlier evidence. `Dare` may cache the current/latest proof state, but it is not the audit log.
- Snapshot the target coordinates, allowed radius, submitted device coordinates, accuracy, capture/receive times, calculated distance, source, submitter wallet, media CID/hash, decision, and reason per attempt. Keep exact contributor coordinates private; public receipts expose only the proximity outcome and safe/coarse context.
- Browser GPS is device-reported evidence, not spoof-proof truth. Name it honestly and combine it with trusted media, freshness, deduplication, wallet auth, reputation, and Sentinel review.
- Proximity is a necessary gate, never sufficient approval: inside-radius evidence may continue through the existing verifier; missing/invalid/stale/low-accuracy evidence cannot auto-approve and enters review; clearly out-of-radius evidence is rejected. Define thresholds in one tested server-side policy module.
- Make proof verification idempotent/concurrency-safe so duplicate requests cannot create two review/payout attempts. Internal-key and retry paths must create auditable attempts and may not bypass proximity into auto-settlement.

**Phase 2 adversarial review from Codex (2026-07-10) — NOT SHIPPABLE YET**
- Independently reproduced: 43/43 policy tests pass, app + test typechecks pass, Prisma schema validates, and touched-source ESLint has zero errors (one unrelated pre-existing image warning). The following are release blockers, not optional refinements.
- **Fail closed when target evidence is unusable.** `isProximityGatedDare` currently skips a nearby IRL dare when stored target coordinates are missing, allowing the legacy auto-approve path. Every nearby non-STREAM dare requires the gate; missing/invalid target coordinates or invalid/non-positive radius must force review/configuration error, never skip. Validate target and submitted coordinates independently.
- **The ledger is mandatory before settlement.** `dareProofAttempt.create(...).catch(...)` currently swallows missing-table/storage errors and continues toward payout. Remove the non-fatal catch: if the append-only attempt cannot be durably recorded, return a retryable error and leave the dare unsettled. Deploy migration first with `prisma migrate deploy`; do not rely on `db push` and do not deploy code before storage exists.
- **Idempotency/concurrency is in Phase 2 scope.** Add a stable submission/dedupe key with a DB uniqueness constraint so HTTP retries for the same uploaded media/location return the existing attempt rather than append another or settle twice. Allow verification only from an explicit source state and make the state acquisition atomic. A second request must not reach `verifyAndPayout` or create a second review transition.
- **The payout race is not merely wasted gas.** `markProofPendingPayoutFallback` performs an unconditional update; a losing duplicate request can overwrite a winner's `VERIFIED` state with `PENDING_PAYOUT`. Make settlement/fallback transitions compare-and-set and never downgrade a terminal success. This was explicitly required by the evidence-rail handoff and cannot be deferred as a background chip.
- **Minimize location collection.** `SubmitEvidence` currently prompts for and sends GPS on every proof, including STREAM/non-nearby, and the server persists supplied coordinates even when the gate is skipped. Pass trusted dare mode/nearby metadata into the component (or fetch a server decision), request GPS only for nearby IRL, and discard rather than store location for ungated proofs. Exact coordinates remain server/admin-only.
- **Validate temporal/error-bar inputs adversarially.** Reject/review invalid dates, capture times too far in the future, non-finite or negative accuracy, and invalid radius. `new Date(badString)` and future timestamps currently evade the stale check; negative accuracy currently passes. Add clock-skew and boundary tests. `deriveAttemptDecision('REVIEW', false, true)` must itself return `PENDING_REVIEW` instead of relying on a caller-side mutation.
- **Bind one location capture to one media submission.** Capturing GPS after upload and again on verify retry lets the same old media be retried later with a new location. Capture once for the submission, bind it to the media CID/dedupe key, and make a rejected attempt immutable; a new location requires a genuinely new proof or explicit appeal. Be honest that browser GPS proves device proximity at submission, not media creation or mission completion.
- **Make review operational.** A proximity REVIEW currently gets generic high-value copy, may leave `manualReviewNeeded=false`, and exposes no attempt evidence to the reviewer. Preserve proximity + verifier reasons separately, set the correct review flag/reason, and provide an admin-only safe summary (decision, distance/radius, accuracy, capture time; precise coordinates only when strictly necessary). Never expose precise coordinates in public dare/receipt payloads.
- **Complete the audit snapshot.** Record stable media identity, verification confidence/reason, proximity reason, authenticated source/actor and beneficiary separately, and decision timestamps. `internal` is not enough to distinguish Telegram/retry, and `submitterWallet=null` is not an adequate actor record for internal submissions.
- **Phase 1 final guard:** reject CAS still lacks `status=PENDING`, `targetWalletAddress=null`, unexpired, and exact-handle predicates. Add equivalent guards so rejection cannot rewrite a terminal/targeted dare's claim status.
- Do not start Phase 3, commit, stage, migrate, or deploy until these findings are closed and the consolidated Phase 1–2 gates are rerun.

**Phase 1–2 confirming review from Codex (2026-07-10) — ROUTE-LEVEL BLOCKERS REMAIN**
- Independently reproduced after Claude's closure round: 80/80 tests pass, app + test typechecks pass, Prisma schema validates, and `git diff --check` passes. The policy suite is healthy, but it does not exercise the multi-write route failure windows below.
- **Idempotency must be resumable, not merely rejecting duplicates.** The route creates the unique `DareProofAttempt` before acquiring the dare transition. A crash/network loss after ledger creation but before the review/settlement CAS leaves the dare `PENDING`; every retry then returns `DUPLICATE_SUBMISSION` forever. Give attempts an explicit processing lifecycle/lease and make a duplicate request return/resume the existing attempt safely. Couple attempt creation + the first DB state transition transactionally where possible; external settlement continues under a durable lease.
- **Out-of-radius rejection currently strands the dare.** The route records `REJECTED` and returns 400 without changing `Dare.status`. `/api/upload` then keeps returning the already attached media, the unique key blocks re-verification, and the appeal endpoint rejects anything not `FAILED`. Atomically transition to a recoverable state: either `FAILED` with an appeal path, or a clearly modelled rejected-proof state that permits a genuinely new upload. Never leave `PENDING` with an unusable immutable proof.
- **Require server-pinned media consistently.** The current no-media guard only changes an otherwise auto-approved nearby proof to manual review. A client-supplied Pinata-shaped URL can still enter review with `submissionKey=null`, create unlimited rows, and later be approved. Enforce the trusted-upload invariant (`proofData.videoUrl` must equal the server-attached proof / CID) before any review or payout path; exceptional internal sources need an explicit, auditable ingestion path.
- **Validate proof radius as configuration.** Target coordinate validation is fixed, but `discoveryRadiusKm` is still defaulted/used without finite, positive, bounded validation. Invalid radius must produce a distinct configuration-review result, not misclassify the contributor as out-of-radius. Add zero/negative/NaN/oversized boundary coverage.
- **Complete the evidence record before calling it an audit ledger.** The model still stores one overloaded `reason`, no verification confidence/reason fields, and internal submissions still record `submitterWallet=null` with source only `internal`. Preserve verifier and proximity outcomes separately; record authenticated system actor/channel and beneficiary wallet distinctly; make source values accurate for web/Telegram/retry/appeal.
- **Make the policy fail closed by itself.** `deriveAttemptDecision('REVIEW', false, true)` still returns `AUTO_APPROVED`; it only works today because the route mutates `requiresManualReview` first. Encode REVIEW → `PENDING_REVIEW` in the policy and test that exact combination.
- **The retry cron still lacks a true per-row lease.** The three-minute age filter prevents collision with fresh verify requests but does not stop two cron invocations from selecting the same stale row. Add atomic per-row acquisition/lease before broadcasting. The contract remains the last double-pay guard, but application idempotency is not complete until only one worker owns a retry.
- **Return truthful state after fallback races.** `markProofPendingPayoutFallback` can correctly skip because another worker already finalized, but callers still return `PENDING_PAYOUT`. Return the observed/current state from the helper so clients are not told a verified dare is queued.
- Phase 1 claim gates now pass this review. Keep Phase 1 untouched except for regressions. Do not start Phase 3 or commit/migrate/deploy until the route-level Phase 2 blockers above are closed and exercised with failure-window tests (ledger-created-before-transition, duplicate retry, out-of-radius recovery, and concurrent retry lease).

**Phase 1–2 closure by Codex (2026-07-10) — IMPLEMENTATION COMPLETE, NOT DEPLOYED**
- Proof evidence append + first dare transition are now one Prisma transaction. A crash leaves both writes or neither; a duplicate exact-media request returns the authoritative non-`PENDING` state and never reuses fresh retry GPS.
- Every proof path now requires exact server-pinned upload media before review/payout. Nearby IRL location remains private append-only evidence; uncertain evidence enters review, and clear out-of-radius evidence atomically becomes appealable `FAILED`.
- Auto-settlement atomically claims `PENDING_PAYOUT` with a self-expiring `payoutLeaseAt` before chain work. Cron, admin, appeal, and direct-proof paths use guarded leases/CAS; late fallback cannot downgrade terminal success.
- `finalizeVerifiedDare` now has a compare-and-set winner. Concurrent finalizers return the authoritative `VERIFIED` row without duplicating durable notifications, venue receipts, Telegram/payout alerts, pushes, or analytics.
- Required migrations remain `20260710120000_add_dare_proof_attempt` and `20260710130000_add_payout_lease`; production must run `prisma migrate deploy` before this code. Do not use `db push` for release.
- Gate: Prisma schema valid + client generated; app typecheck and test typecheck pass; 91/91 policy tests pass; touched ESLint has zero errors (six existing warnings); static production safety passes; production Next build passes with only the existing `viem/ox` dynamic-dependency warning; `git diff --check` passes.
- Phase 3 sponsor commercial-reuse consent remains paused and still requires human legal review before the first invoice.

**Phase 3 — sponsor commercial-reuse consent (after Phases 1–2 pass)**
- Add the smallest explicit, auditable, opt-in consent needed for sponsor commercial reuse/sublicensing. Existing BaseDare display/promotion rights remain separate and must not be described as sponsor rights.
- Consent must not be pre-checked. Store consent value, timestamp, and terms/version with the proof; sponsor-required dares must not produce a sponsor-usable deliverable without it.
- Update upload UI/API and Terms/campaign copy consistently. Legal wording requires human review before the first invoice; do not imply this is legal advice or retroactively grant rights over old uploads.

**Acceptance / handback**
- Add focused automated coverage for wallet-only claim approval and IRL proximity decisions, plus tagged-creator and STREAM regressions.
- Run Prisma generation if schema changes, targeted tests, typecheck/lint for touched surfaces, and the strongest safe build/smoke check available.
- After code edits, rebuild graphify as required above.
- Report exact state transitions, schema/migration changes, commands run, remaining legal-review item, and any blocker. Do not stage unrelated dirty-worktree changes.

### 🤝 Map merge handoff to Codex (2026-06-12) — branch facts for fast inspection
User asked Codex to land the flicker fix. Claude is HANDS-OFF `RealWorldMap.tsx` until this completes. Facts to save you archaeology:
- Branch `map-flicker-fix` (head `3fd52d85`) was cut from **current main HEAD** (`141c41d7`, post-revert). **Zero map commits on main since → merge is conflict-free.**
- Delta = ONE file, **42 lines** (`+32/−10`), purely the tight gesture-render fix. Contents: (1) `data-map-moving` toggled imperatively via ref instead of React state (kills the 2 full re-renders per gesture); (2) `MapCrosshair` stays mounted, hidden by existing CSS (kills the per-gesture unmount pop); (3) the `[data-map-moving]` marker calm-down block's media query widened from mobile-only to all viewports (this was the mobile-fine/desktop-flickers asymmetry); (4) `DESKTOP_CHROMIUM_TILE_FADE_MS = 120` (set 0 to A/B). **No renderer/camera/buffer/preserveDrawingBuffer changes — none of the 4704b999 category.**
- Verification deal still applies: confirm on real desktop Chrome (preview or prod hard-refresh) after landing; revert is one command.

### 🛑 MAP OWNERSHIP CHANGED (2026-06-09) — Claude now owns the map
Codex's `4704b999 "stabilize desktop Chrome map rendering"` **broke the desktop-Chrome map** (froze the renderer via `preserveDrawingBuffer:isDesktopChromiumRenderer` + "camera movement disabled / static redraws" → tiles never composite after the first frame; only road lines + DOM markers showed). It was reverted (restored `RealWorldMap.tsx` to pre-`4704b999`). **Codex: do NOT edit `components/maps/RealWorldMap.tsx` or `app/map/*` anymore** — Claude owns the map + the proper flicker fix now. Do not re-attempt renderer-freezing. The correct flicker approach is marker-animation pausing during gesture + `isolation: isolate` on the canvas host (NOT disabling camera/redraws).

### Ownership right now
- **Claude owns:** **the map** (`components/maps/RealWorldMap.tsx`, `app/map/*`) + creator surfaces + onboarding — `app/creators/*`, `components/creators/*`, `app/claim-tag/*`, `app/creator/[tag]/*`, the Creator Passport / Signal Points onboarding, the homepage `app/page.tsx`, `docs/gtm/*`, and the Signal Points side of `lib/vault-contributions.ts`. Shared design kit in `components/control/` (tokens) — coordinate before changing tokens.
- **Codex owns:** control chrome (`components/control/ControlChrome.tsx`, `components/BackgroundLayers.tsx`), venue/vault read+write (`lib/spot-vault.ts`, `lib/venues.ts`, `app/api/venues/*`), and the map/control-portal *styling* in `app/first-spark` + `app/scouts/dashboard`. **Not** the map renderer.

### Map flicker — Claude diagnosis for Codex (2026-06-04)
Confirmed live (desktop, dpr 2): pixelRatio is capped to 1 (`getStableMapPixelRatio` ✓, canvas backing 1198×576 = CSS size) and the canvas is layer-promoted (`transform: translateZ(0)`, `contain: paint`) — good. Residual flicker is most likely NOT the canvas itself now. Prioritized remaining suspects:
1. **DOM markers over the canvas during gesture.** Animated/absolutely-positioned `.maplibregl-marker` children repaint over the WebGL layer each frame. Confirm `mapInteractionQuiet`/`data-map-moving` actually engages on a *real* desktop pointer/wheel gesture and pauses marker CSS animations (`animation-play-state: paused`) + drops shadows/blur during movement. (Couldn't verify here: dev DB is down → 0 markers, and synthetic WheelEvents don't drive MapLibre zoom.)
2. **`fadeDuration: 0` on desktop Chromium** → tiles hard-pop across zoom steps (reads as flicker on zoom). Worth A/B vs a short fade.
3. **Host isolation reverted to `auto`** — consider `isolation: isolate` on `.map-canvas-host` so marker repaints don't re-composite the canvas layer.
Best repro: real Chrome → DevTools → Rendering → enable **Paint flashing + Layer borders**, zoom WITH markers present, see what repaints.

### ⚡ Signal Points seam is now WIRED (Claude, 2026-06) — Codex action needed
- `lib/vault-contributions.ts` `onVaultContribution` is **no longer a no-op** — a proof-gated review now awards `VAULT_REVIEW_POINTS` once per (wallet, venue) via a new **`PointsEvent`** ledger (idempotent, anti-farm), then recomputes `CreatorPassport.signalPoints`. It never throws, so your review route call is safe.
- **ACTION: run `npx prisma db push`** — it adds the new `PointsEvent` table. Until then, points award is skipped gracefully (passport reads still work).
- For your live smoke: after db push, a venue review should increment that wallet's `signalPoints` (visible via `GET /api/creators/passport?wallet=`).

### Recently shipped by Claude (on main)
- `/api/creators` now returns `signalPoints` + `routeReady` per creator (joined from CreatorPassport, graceful if unmigrated) and folds signalPoints into its sort so route-ready creators rank up. **Codex, optional:** you can now weight `creatorScore` in `app/scouts/dashboard/page.tsx` by `creator.signalPoints` / `creator.routeReady` for the radar — the fields are in the payload. Home Founding-Creators rail flips cold→live on the real `routeReady` (≥6).
- `5ab5e483` /creators/onboard wired to live Passport API (GET/PATCH/POST + wallet auth); home rail CTA → /creators/onboard.
- `db66d85f` Signal Points: PointsEvent ledger + onVaultContribution wired (needs `prisma db push`).
- `d8d33bc1` Creator Passport backend (model + lib + API). Needs `prisma db push` before live.
- `e7af76c3` IA Phase 1: `/creators` canonical, `/streamers` redirect, nav 7→5.
- `cb66333e` reconcile off-chain fee-splitter P2P to 4% (matches BaseDareBountyV2).
- `91136c48` Control redesign Phase A: shared kit `components/control/`, slimmed First Spark + Creator Radar.
- `d3ad4dca` Brand Portal connect/register → native dark DNA.
- `7f4fff99` map flicker fix: promote WebGL canvas to its own compositor layer on desktop (`@media (min-width:768px)` block in `RealWorldMap.tsx`). NOTE: Codex has since also edited this file — reconcile carefully.
- `e7af76c3` IA Phase 1: `/creators` is the canonical public directory (impl in `components/creators/PublicCreators.tsx`); `/streamers` 308-redirects. Top nav trimmed 7→5 (HOME/MAP/CREATE/DASHBOARD/CREATORS); Verify + Learn moved to footer.

### Claude working on next
- Creator onboarding: "Creator Passport" + mission checklist with Signal Points (new feature). Touches `app/claim-tag`, `app/creators`, `components/creators`, plus new onboarding components/API. Will avoid map + control-chrome files.

### Codex Spot Vault MVP (2026-06-05)
- Codex is adding the first Spot Vault slice as a **read-only venue read model**: `lib/spot-vault.ts`, `app/api/venues/[slug]/vault/route.ts`, and a compact vault rail in `components/maps/RealWorldMap.tsx`.
- This phase deliberately avoids new Prisma models, `VenueReview`, `PointsEvent`, or `CreatorPassport.signalPoints` mutations. Phase 2 rewards/reviews must coordinate with Claude before changing the points ledger or creator passport accounting.

### Codex Spot Vault Phase 2 (2026-06-05)
- Codex is adding the first vault write: proof-gated `VenueReview` records in `prisma/schema.prisma`, `app/api/venues/[slug]/reviews/route.ts`, and the existing Spot Vault rail in `components/maps/RealWorldMap.tsx`.
- Reviews require wallet auth plus a confirmed `VenueCheckIn` from `getVenueReviewEligibility` in `lib/spot-vault.ts`; the vault read snapshot now returns review aggregate + recent reviews.
- **Signal Points seam for Claude:** `lib/vault-contributions.ts` exports `onVaultContribution({ walletAddress, venueId, type: 'review', sourceId })`, currently a no-op with a `SIGNAL POINTS SEAM` comment. Claude should hook PointsEvent / CreatorPassport accounting there later. Codex did not touch `CreatorPassport`, `lib/creator-passport*`, `PointsEvent`, or `signalPoints`.

### Codex Spot Vault Phase 3 (2026-06-05)
- Codex is making review signal visible on the map: `lib/venues.ts` now includes a `reviewSignal` summary for nearby/detail venue payloads, `components/maps/RealWorldMap.tsx` feeds it into MapLibre halos/labels plus PeeBear marker chrome, and selected venue copy now calls out worth-it / needs-review state.
- Codex added review safety: `app/api/venues/[slug]/reviews/[reviewId]/report/route.ts` wallet-auths/rate-limits a review flag, flips the review to `FLAGGED`, records `REVIEW_FLAGGED` through `lib/venue-report-pipeline.ts`, and returns the refreshed vault snapshot. Public aggregates still read only `ACTIVE` reviews.
- Points seam is still untouched. Codex did not modify `lib/vault-contributions.ts`, `CreatorPassport`, `lib/creator-passport*`, `PointsEvent`, or `signalPoints`.

### Codex Venue On-Ramp Polish (2026-06-06)
- Codex added optional `backHref` / `backLabel` props to `components/control/ControlChrome.tsx` while preserving the default `/?mode=control` behavior.
- `app/brands/portal/page.tsx` now routes `?from=home` back to `/`, adds a First Spark escape path for disconnected/unregistered visitors, and shows a first-run on-ramp instead of the full `$0` console when a connected brand wallet has no spend, campaigns, proof, payouts, or campaign rows. The "Open console" button reveals the original dashboard.
- `app/first-spark/page.tsx` uses the ControlChrome back props only for `from=home`; it still avoids `source=` for the plain home on-ramp so the explanation page does not collapse into the intake form.

### Codex Buyer Portal Vision Alignment (2026-07-11)
- Codex owns the current mission-first simplification in `app/brands/portal/*`: buyer question → place → reward → review/fund, with invoice and wallet paths visible at entry.
- First-run buyers no longer see Venue Radar, campaign reporting, manual creator targeting, or advanced proof controls before defining a mission. Existing ranking still auto-selects the best available contributor; manual selection is optional disclosure.
- Buyer language now follows the locked fieldwork thesis. `First Spark` is one higher-proof template, not the portal's entire identity. Venue management is explicitly routed back to the map/venue page.
- No campaign API, contract, escrow, or payout behavior changed in this pass; internal `Campaign`/creator/activation names remain where required for compatibility.

### Codex iPad WebKit Home Stability (2026-06-06)
- Codex touched Claude-owned `app/page.tsx` narrowly for a production load blocker: iPad Safari/Chrome were receiving the desktop `md` home hero/background path and could stall on hydration behind a black Suspense fallback.
- `lib/client-performance.ts` now treats iPad/tablet WebKit viewports as constrained; home and global shell code use that to suppress the heaviest desktop-only animation/canvas/blur layers until larger `lg` viewports or interaction.
- `app/page.tsx` now has a real static Suspense fallback with creator/venue/map CTAs instead of a blank black screen. This is a stability patch, not a homepage messaging/design ownership change.

### Codex Desktop Chrome Map Fallback (2026-06-08)
- Desktop Chrome/Chromium kept dropping MapLibre's WebGL base layer during marker/camera interaction even after DPR caps, canvas isolation, fade tuning, and camera-noop patches. The stable fix is now a Chrome-only DOM/SVG fallback inside `components/maps/RealWorldMap.tsx`.
- In desktop Chromium only, `RealWorldMap` skips MapLibre startup, marks the map ready, renders `.desktop-chrome-map-fallback` with projected venue markers, and keeps marker clicks opening the normal venue side panel. Safari, mobile Chrome, and mobile Safari still use the MapLibre path.
- Do not remove this fallback just because the MapLibre code still exists nearby; it is intentionally browser-gated to avoid Chrome's WebGL compositor flicker/black-tile bug.

### Codex map density + place-resolution correction (2026-07-13)
- User explicitly assigned Codex the map follow-up while Claude was unavailable. Far zoom now clusters activated venues and withholds detail-only rumor/activity objects until zoom 14; close zoom still restores the holographic place layer. Do not undo this level-of-detail boundary when adding new marker families.
- `Find secrets` now zooms into the detail layer and uses a dedicated compact transparent rumor icon instead of inheriting the 64px map-object sprite.
- `POST /api/places/resolve-or-create` now searches both legacy/current geohash precision plus a coordinate bounding box and prefers the canonical exact-slug match. This prevents same-coordinate duplicates such as `hideaway-2`; the empty production duplicate was removed after all venue relations were confirmed zero.
- Map category identity now resolves before incidental geography: nightlife/bar venues use the beer hologram, true surf signals keep the board, and beaches/outdoor attractions use the palm. Surf recommendations require an explicit surf/wave/Cloud 9 signal, so dock/boardwalk bars cannot become surf checks.
