---
type: product_growth_playbook
system: basedare-brain
status: IMPLEMENTED_ALPHA_NOT_DEPLOYED
created_at: 2026-07-13
updated_at: 2026-07-14
owner: BaseDare
---

# Creator Attribution Journey

## Objective

Attribute a specific creator's short-form story to an intentional BaseDare action and,
when it occurs, one server-verified real-world completion. Preserve that chain when a
viewer moves from a TikTok or Instagram in-app browser to Safari, Chrome, a wallet app,
or another device.

Anonymous exploration remains frictionless. Identity appears only after the participant
chooses an action that requires persistence or authorization. Social in-app browsers are
treated as discovery-and-handoff surfaces, not wallet-execution surfaces.

The honest claim is **attribution, not incrementality**:

> This participant reached and completed this action through this creator path.

Never claim that the creator single-handedly caused demand that would not otherwise have
existed without a separate incrementality experiment.

## Core decision

Browser storage is a convenience layer, not the source of truth. Attribution lives in a
first-party, server-side Journey and append-only event ledger.

`creator link -> server Journey -> anonymous map exploration -> ActionIntent locked ->
Mission Pass -> native-browser resume -> identity/wallet binding when needed -> verified
completion`

Keep this system strictly separate from Dare access, claim authorization, proof
authorization, settlement, and payout. Never overload `Dare.inviteToken` or treat an
attribution token as permission to move value.

## Current substrate to reuse

- The activation funnel already parses UTMs and creates a persistent browser session.
- PostHog can diagnose client-side page and interaction drop-off when configured.
- Drop RSVPs already retain a source field.
- Wallet-action auth can bind an eventual signed wallet to a server action.
- Dare proof attempts already provide an append-only verified-evidence pattern.
- The map already accepts deep links for places and Dares.

The missing seam is a consumer acquisition identity shared by landing, action start,
continuation, claim/RSVP, and verified completion.

## Alpha execution boundary

For the alpha, BaseDare does not initiate wallet connection, message signing, claim
authorization, proof submission, funding, or transactions inside known Instagram,
TikTok, or equivalent social in-app browsers.

This is an operational reliability rule, not a claim that every wallet action is
technically impossible in every webview. Mobile deep-link return behavior varies across
wallets, operating systems, and host applications. BaseDare should fail toward a clear
handoff instead of betting a paid action on the webview surviving an app switch.

Allowed in the social webview:

- open the exact place, mission, or route from a creator link
- explore the map and public place memory anonymously
- preview rewards, requirements, going counts, and creator context
- create a marketing ActionIntent after an explicit **Save**, **Start**, **Join**, or
  **Claim** tap
- request or share a Mission Pass

Required in Safari, Chrome, or another supported ordinary browser:

- bind the persistent participant identity
- connect or sign with a wallet
- reserve or assign a paid claim
- submit proof or perform any action that can move funds

If an emailed or shared Mission Pass opens inside another embedded browser, preserve the
same pass and present the handoff again. Never consume or strand the intent merely
because the first Mission Pass open did not reach a supported execution environment.

An ActionIntent records acquisition intent; it is not a Dare claim, RSVP reservation,
proof authorization, or promise that a reward slot has been held.

## Alpha server records

### AttributionJourney

One anonymous acquisition journey, created at the first tracked redirect.

Minimum fields:

- `id`
- hashed opaque `cookieHash` (the raw cookie is never stored)
- `status`: `ACTIVE | FORGOTTEN | EXPIRED`
- `firstSeenAt`
- `lastSeenAt`
- `expiresAt`
- optional privacy-safe bound participant key after authentication

The browser receives only an opaque first-party Journey reference. It contains no
creator, wallet, location, or authorization data.

### AttributionTouch

Append-only record of each eligible acquisition touch:

- Journey
- creator/partner code
- platform
- campaign and post/content code
- content series
- target type and stable target ID
- UTMs and referrer
- occurred-at timestamp

Study every touch, but select only one primary touch for compensation.

### ActionIntent

Created when the viewer performs an intentional action such as **Start**, **Join**,
**Claim**, or **Save this mission**.

Minimum fields:

- Journey
- stable target type and target ID
- primary attribution touch
- `lockedAt`
- `expiresAt`
- state: `LOCKED | BOUND | COMPLETED | EXPIRED | MERGED`
- optional canonical intent ID when a duplicate is merged
- optional privacy-safe participant key after identity binding

Primary creator attribution locks at this moment. A later creator click cannot snipe the
completion.

### MissionPass

An explicit passwordless continuation object attached to one ActionIntent. "Mission
Pass" is the user-facing label; do not describe it as a ghost account.

Minimum fields:

- `id`
- optional ActionIntent (recovery passes may represent a Journey)
- hashed opaque token
- delivery method: `EMAIL | PORTABLE_LINK`
- state: `ISSUED | OPENED | BOUND | EXPIRED | REVOKED`
- issued, opened, bound, expiry, and revocation timestamps
- optional privacy-safe participant key after verified identity binding

Contact information belongs in a separate protected contact/identity store, not in the
attribution event ledger. An email request remains pending until the magic link proves
control of that inbox. Mission Pass communication is transactional; marketing consent
must be requested separately.

### AttributionEvent

Append-only operational ledger. Suggested event vocabulary:

- `TOUCH_RECORDED`
- `INTENT_LOCKED`
- `MISSION_PASS_ISSUED`
- `MISSION_PASS_OPENED`
- `MISSION_PASS_DELIVERED | MISSION_PASS_DELIVERY_FAILED`
- `INTENT_BOUND_TO_WALLET`
- `PATH_VERIFIED_COMPLETION | DIRECT_VERIFIED_COMPLETION`
- `CREATOR_MISSION_PARTICIPATION`
- `MISSIONS_FORGOTTEN`

Do not rewrite history to make a funnel look cleaner. Mutable rows may cache the current
state; events preserve what actually happened.

## Tracked redirect and attribution rules

Issue a short creator/post link such as:

`https://basedare.xyz/go/maya-rumor-01`

The server validates the creator/post code, records the touch, sets a first-party Journey
cookie, and redirects to the narrowest live target supported by the product.

Alpha rules:

- seven-day click window, shortened when the target action expires sooner
- last eligible creator touch before the first intentional action is primary
- earlier eligible touches remain assisted attribution
- primary attribution locks when the first canonical ActionIntent is created
- one participant earns one credited completion per target action
- no view-through attribution
- no self-referrals, test/demo traffic, or client-declared completion
- RSVP, click, save, and proof submission remain separate funnel states
- only the appropriate server-accepted proof, check-in, or co-sign counts as completion

## Cross-browser continuation

Instagram and TikTok webviews may not share cookies, `localStorage`, wallet state, or
sessions with Safari or Chrome. Do not pretend the browser can be forced to switch
reliably.

After explicit participant intent, the server can issue an opaque Mission Pass URL:

`https://basedare.xyz/continue/<opaque-token>`

Security requirements:

- use at least 128 bits of cryptographic randomness for the URL token
- store only its hash server-side
- put no creator, wallet, participant, or location information in the token
- expire it with the Journey or target action
- rate-limit lookup and manual-code attempts
- make repeated opens idempotent
- after identity binding, prevent another identity from taking ownership
- token possession restores attribution and progress only; it never authorizes claims,
  proof, settlement, payouts, or private participant data

An optional human-entered recovery code may exist as a fallback, but it needs sufficient
entropy, aggressive rate limiting, short expiry, and single-participant binding.

## Mission Pass UI: make the handoff part of play

Do not open with browser troubleshooting. Trigger the prompt only after the person has
shown intent by starting, joining, claiming, or saving an action.

Use a compact map sheet or PeeBear moment inside a known social webview:

> **Take this quest with you**
>
> Instagram may lose your progress when another app opens. Send yourself a private
> Mission Pass and continue in your browser.

Actions:

1. **Email me the pass** — primary; sends a passwordless magic link.
2. **Send mission pass** — opens the native share sheet when supported.
3. **Copy private link** — fallback for unsupported or cancelled share flows.
4. **Keep exploring** — returns to anonymous browsing; it does not complete an
   identity-required join, claim, RSVP, or proof action.

Success feedback:

> **Mission Pass sent.** Open it whenever you're ready.

On a repeat creator-link click from a browser with the live Journey:

> **Welcome back. Your quest is still waiting.**
>
> **Resume quest**

Rules:

- never block the map behind the continuation prompt
- never require a wallet merely to save or resume
- do not show wallet-connect or transaction controls inside known social webviews
- do not force WhatsApp, Telegram, or any specific share destination
- do not create a hidden account; explain that the Mission Pass saves progress
- do not run Google/Apple OAuth inside the social webview; social sign-in may be offered
  later from a supported ordinary browser
- one clear hero action; browser details stay secondary
- preserve the real map behind the sheet so it still feels spatial
- do not show creator-credit mechanics to the participant
- respect reduced motion and ordinary mobile accessibility

## Double-click and duplicate-intent policy

### Same browser state survives

If the viewer closes the webview, reopens the creator link, and the Journey cookie still
exists, record the return touch and restore the existing live ActionIntent. Do not create
a second Journey or intent for the same Journey and target.

Recommended invariant:

`unique(Journey, targetType, targetId)` for non-merged active intents.

### Browser state is wiped

A fresh Journey and duplicate ActionIntent may be created because the server has no safe
way to know the anonymous visitor is the same person. Do not fingerprint the device.

When both intents later bind to the same authenticated wallet, BareTag, confirmed RSVP
identity, or another approved participant key:

1. transactionally select the earliest valid locked intent for that participant+target
   as canonical
2. preserve its primary attribution
3. mark later duplicates `MERGED` and reference the canonical intent
4. append `DUPLICATE_INTENT_MERGED` events; never delete the history
5. allow only the canonical intent to receive a completion or compensation credit

This preserves the original lock-on-start rule while retaining later touches as assisted
evidence.

If a user later types `basedare.xyz` directly and signs into a participant identity that
was already verified and bound through a Mission Pass, BaseDare may restore that
participant's live intents. If no Mission Pass was verified, no browser state survived,
and no approved participant identity was bound, the earlier anonymous Journey cannot be
recovered honestly. Record the visit as direct/unattributed. Optional self-reported
referral can inform research but cannot authorize performance compensation.

## Identity binding

Identity appears only when the chosen action requires persistence or authorization:

- verified passwordless email participant key for a saved Mission Pass
- signed wallet/session for paid Dares and proof
- session-owned BareTag for identity-based social features
- server-derived RSVP or check-in participant key for approved wallet-less flows

Anonymous map exploration is never gated on email, social login, a wallet, or a BareTag.
Email entry is triggered only by an explicit persistence action and must say why the
address is needed. Do not put raw contact information into the attribution ledger. When
a wallet-less flow needs deduplication, derive a scoped server-side participant key from
the authoritative identity/action record. Never expose that key publicly.

## Creator reporting

A creator receipt must distinguish two different completion signals:

1. **Path-attributed completion** — the server Journey, locked ActionIntent, participant
   binding, and verified outcome preserve the creator-to-completion path. This is the
   only category that may later become performance-compensation evidence.
2. **Creator-mission participation** — someone completed a mission or route authored,
   narrated, or fronted by the creator, but the acquisition path was unavailable. This
   demonstrates participation around the creator's campaign, not a proven conversion or
   causal lift.

The receipt should separate interest, handoff quality, and real-world outcome:

- platform views, entered from the platform source
- unique tracked link opens
- map target opens
- ActionIntents locked
- Mission Pass requests, sends, and opens by delivery method
- cross-browser resumes
- verified participant bindings
- proofs/check-ins submitted
- path-attributed server-verified unique completions
- creator-mission participation without a preserved acquisition path
- duplicate intents merged
- unattributed completions in the same target/window
- participant return where safely measurable

Never combine the two completion categories into one conversion number. Report
**attributed completion**, **creator-mission participation**, and **unattributed activity**
separately; never report guaranteed lift or incrementality.

## Compensation gate

During the alpha, use an agreed flat content fee and/or clearly displayed mission reward.
Measure performance without paying automated yield or revenue share.

## Implemented alpha surfaces and seams (2026-07-14)

- `GET /go/<slug>` records an immutable creator touch and redirects to one local target.
- `POST /api/attribution/intents` locks or restores one intent per Journey+target.
- `POST /api/mission-passes` issues email or portable-link passes.
- `GET /continue/<token>` restores the Journey; known social webviews are routed through
  `/mission-pass/handoff/<token>` instead of being pushed into wallet execution.
- `/missions` lists saved/started/completed intents, sends passwordless recovery passes,
  and supports forgetting uncompleted passes.
- The global identity control becomes **Mission Pass** inside known social webviews.
- Open Dare pages offer **Save Mission Pass** before wallet connection.
- A successful claim-request CAS binds the locked intent to the signed wallet without
  changing claim authorization or referral economics.
- `finalizeVerifiedDare` runs a resumable, deduplicated attribution write for both CAS
  winners and retries. Attribution failure is logged and may be repaired by a later
  finalizer call; it never blocks or duplicates payout.
- `/admin/creator-attribution` creates immutable tracked links, separates path completion
  from creator-mission participation, and exports verified outcomes as CSV.

Raw email is used only for transactional delivery, then discarded. The database stores
only a keyed HMAC. Mission Pass identity is isolated from NextAuth `User`, wallets,
BareTags, `Dare.inviteToken`, `Dare.referrer*`, and every payout split.

## Deployment gate

1. Run `prisma migrate deploy` for
   `20260714090000_add_creator_journeys_mission_passes` before deploying the code.
2. Configure `MISSION_PASS_HMAC_SECRET` (dedicated random value, at least 32 characters),
   `RESEND_API_KEY`, `MISSION_PASS_FROM_EMAIL`, and the production app URL. Set
   `NEXT_PUBLIC_MISSION_PASS_EMAIL_ENABLED=true` only after the sending domain is
   verified; portable share/copy passes remain available while email is disabled.
3. Verify the sending domain in Resend; test actual Instagram and TikTok webviews plus
   Safari/Chrome continuation on real iOS and Android devices.
4. Keep performance compensation disabled. Only `PATH_VERIFIED_COMPLETION` is eligible
   evidence for a later manually reviewed bonus policy.

Performance bonuses may begin only after:

- creator/post codes are server-issued and immutable
- primary attribution locks at ActionIntent creation
- cross-browser continuation and duplicate merging pass real-device tests
- one canonical intent can receive at most one verified completion
- self-referral, demo/test, fraud, rejection, appeal, and dispute policies are defined
- compensation is capped and has a review/dispute window

Only a server-verified unique **path-attributed completion** may become
performance-compensation evidence. Creator-mission participation is displayed as a
broader campaign/cultural signal but is not silently converted into payout attribution.

## Alpha acceptance tests

1. Anonymous map exploration works without email, social login, wallet, or BareTag.
2. Known social webviews do not expose wallet/transaction execution controls.
3. An intentional Save/Start/Join/Claim creates one ActionIntent without reserving a paid
   claim or falsely confirming the underlying action.
4. A same-webview second click restores the existing Journey and intent.
5. An emailed Mission Pass opened in Safari/Chrome restores the same intent.
6. Native-share and copy fallbacks preserve the same intent without forcing a share
   destination.
7. A Mission Pass opened in another embedded browser remains resumable and does not
   expose wallet execution controls.
8. A Mission Pass works on a second device without granting action authority.
9. An expired, malformed, brute-forced, or revoked token fails safely.
10. A leaked token cannot claim a reward, submit proof, reveal identity, or move funds.
11. A verified email identity can restore its live bound intents after a direct return.
12. A later creator click cannot replace attribution after intent lock.
13. Two anonymous intents bound to one participant+target merge into the earliest locked
   canonical intent.
14. Repeated proof/finalization cannot produce duplicate completion credit.
15. RSVP and proof submission do not masquerade as verified attendance/completion.
16. Path-attributed completion and creator-mission participation remain separate.
17. Direct/unrecoverable journeys remain explicitly unattributed.

## Explicitly not building in the alpha

- device fingerprinting
- forced Safari/Chrome hacks
- wallet execution inside known social webviews
- Google/Apple OAuth inside social webviews
- hidden ghost accounts or marketing opt-in bundled with Mission Pass delivery
- forced WhatsApp/Telegram sharing
- a native app solely for attribution
- onchain storage for high-volume acquisition events
- an elaborate creator dashboard
- automated performance payouts
- view-through attribution

## External platform constraints to re-check before release and later changes

- Google OAuth policy for embedded user-agents:
  `https://developers.google.com/identity/protocols/oauth2/policies`
- WalletConnect mobile-linking return behavior:
  `https://docs.walletconnect.network/wallet-sdk/ios/mobile-linking`
- W3C Web Share destination and user-choice behavior:
  `https://www.w3.org/TR/web-share/`

These platform rules can change. Re-read the primary documentation before release and
again before changing the handoff or wallet-execution boundary.

Build the smallest honest bridge, test email delivery and native-browser resume in real
Instagram and TikTok webviews, and measure where continuity actually breaks before
expanding the system.
