# Challenge motivation and staged social-link pilot — 31 October 2026

Source requirements: shared chats `t_6ae59e34ca488191a3bc5c4166fc1636` and `t_6ae59e7b458c8191b2e4964d3ef49197`. Build on the deployed Moments system. No schema, contract, dependency or financial-policy change is needed.

## Product changes

- Chaos Quests explain the actual prompt, personal card, willing-friend invitation and optional editorial recognition before starting. Ordinary adventures remain noncompetitive and guest-friendly. Saved progress, original authored safety rules and three-step completion are unchanged.
- The existing moderator Spotlight action now selects one **dated weekly editorial pick**, using the existing FounderEvent ledger and approved Moment. Weeks run Monday 00:00 to the next Monday in Asia/Manila, with the timezone/date range displayed. A lock and unique weekly ledger key serialize different editors; a repeated selection does not notify again. A stale admin week is refused. No automatic weekly promise, deadline, winner, prize or invented selection.
- `/moments` displays a weekly feature only when a genuine eligible selection exists. `/moments/spotlight/{Monday-date}` and its 1200×630 preview show the chosen creation and consented active Baretag. Past dated pages say featured creation, not this week's creation. Future/unselected/removed entries have no public page/card.
- Genuine approved parent/reply pairs from different wallets get `/moments/{parent}/compare/{reply}` and a shareable preview. The page displays both takes together on desktop and stacks them on phones. Unrelated submissions, siblings, self-pairs, different challenges and hidden/non-consented sources are refused. This is a display comparison, not a formal Battle or a vote.
- Reporting, rejection, unselection and withdrawal invalidate existing weekly records. Every Spotlight/comparison page/card rechecks current source approval, display permission, venue visibility and applicable credit/Spotlight permission. Creator rights stay theirs. No commercial reuse is granted.
- Moment invitations encourage an independent twist and use neutral wording when a visitor shares somebody else's creation. No sender progress or private notes transfer.
- Founder metrics add actual reply submission/current approval counts. Configured client analytics emit comparison/Spotlight opens; these are explicitly unavailable in the server growth ledger. No unique-human, delivered-invite, view, prize or revenue count is inferred.

## Staged activation and human evidence

The founder explicitly requested staged link activation and supplied official accounts: TikTok `@basedarexyz`, X `@basedare_xyz`, Instagram `@base_dare`. The founder has both an iPhone and Android for checks. Those are supplied identities/device availability, not proof of a completed test or verified social ownership. Public X product announcements were visible; they were not misrepresented as challenge attempts or published as fake participant Moments.

Deploy the verified code with both production intake flags still false. The source brief requires a genuine phone/sign-in/moderation/withdrawal check before broad link activation; profile handles and local fixtures do not satisfy it. Arrange a bounded acceptance window with the founder once a genuine permissioned attempt and phones are ready, then verify the real flow before leaving `MOMENT_SUBMISSIONS_ENABLED=true`. Keep `MOMENT_ORIGINAL_MEDIA_ENABLED=false` until the separate private-provider checks pass. Every new link remains PENDING until actual review. Do not describe the creator launch as validated while these checks are outstanding.

1. On actual iPhone/Safari and Android/Chrome, open `/adventures/wave-or-ex`, start free, refresh/resume and finish without signing in. A written attempt is valid; filming/posting is optional.
2. For the contribution test, choose a genuine permissioned attempt, open its full post address in the phone browser and copy it. Profile URLs and vm/vt/Instagram-share short links are not posts. Open the exact `/adventures/wave-or-ex/submit` route, sign in with the normal account and submit. Verify the exact challenge returns after sign-in/cancellation/reconnect and a truthful pending status appears.
3. In the existing `/admin/adventures` queue, inspect that actual source, challenge, display/credit/Spotlight choices and private details. Test rejection and a separate valid approval. A social link does not verify ownership, attendance or a paid outcome.
4. Share the real approved Moment into an installed messaging app. A different participant opens it and gets their own fresh attempt. Verify a genuine reply and the Two takes route if available. Copied/opened messages are not proof of delivery.
5. If selecting Spotlight, require the creator's explicit option and active credited Baretag. Inspect the dated page/card, notification and share link. Test owner withdrawal/report and confirm the Moment, comparison and Spotlight page/card disappear. Do not approve a fixture or invent a weekly winner to fill the screen.
6. Record actual device/browser, result and failure detail with the founder. Pause new intake via the single link flag if authentication, moderation capacity or privacy fails; reports/withdrawal remain available. Previously public downloads/platform preview caches cannot be recalled.

Original files remain unavailable pending genuine private-provider upload, owner/admin preview, playback and revocation proof. The separate paid-mainnet, rights and operating gates remain intact. No external post, DM, email, payment, commercial license or campaign activation is part of this release.

## Verification and rollout

Run Moment policies/week-boundary tests, real PostgreSQL moderation/concurrency/privacy checks, the actual signed optimized local HTTP journey, discovery, typecheck, lint, build, audit and Graphify. The local browser seed labels all illustrated attempts as fixtures; it never targets production. Confirm 320/390px and desktop, empty states, the new preview cards and actual operator controls.

No migration is required: production retains the already-applied 61-migration / 78-model schema. CI and protected preview must pass before main. Verify the exact production revision and link-only options after deployment, with no fabricated production participation. Record physical and genuine-contribution acceptance independently; automated fixtures do not satisfy it.

The future named Battle format, mutual consent, judging/voting integrity, rights, disputes and funded-reward boundaries are in [moment-battles-format.md](../design/moment-battles-format.md). Voting, monetary competition and automatic performance compensation remain design-only per the requested priority.

## Local verification receipt

The optimized build, app typecheck, 10 Moment policy tests, 70 discovery tests, dependency high/critical gate and static safety checks passed. Lint has zero errors and 234 warnings. The disposable PostgreSQL suite passes concurrent selection, stale-week/retry behavior, real approval/report/withdrawal handlers, current-consent projections and mid-card-render revocation races. The optimized local HTTP journey passes actual fixture EOA signatures, admin sessions, approval, independent reply, dated Spotlight/comparison pages and 1200×630 cards, followed by withdrawal hiding all related public routes. The offline EOA fixture refuses external RPC and uses viem's cryptographic fallback; it does not certify smart-wallet or phone authentication.

Phone-sized browser checks at 320/390px and desktop confirm the comparison layout; these are viewport checks, not physical-device evidence. Branded preview assets and bundled font are explicitly traced into the server card routes. The shared artwork no longer needs a remote fallback font for its action label. Graphify is rebuilt. No synthetic fixture was written to preview or production, no real contribution was invented, and no social message was sent.
