# Island Trials and Chaos Quests — founder launch kit

29 October 2026. Reuse the public guest adventure journal, approved public submissions, Creator Drop OS, captain intake, activation enquiries and founder ledger. No new paid service, external outreach, production participant, reward, venue partnership or commercial permission is created by this release.

## Public journeys

- `/map` → **Play · Free adventures** → Chaos Quests (all twelve) or all free adventures. Browse in a modal; selecting a card enters the existing Adventure Hub. No invented geographic pins.
- `/adventures/wave-or-ex` → guest start → three steps → self-reported completion → Dare a friend / Copy invitation / Download memory card. Creator Inspiration is optional. The original adventures retain IDs and progress.
- `/island-trials` → `/island-trials/no-beaches-allowed` → choose Siargao, El Nido or Boracay → Accept the dare → three steps → I defended my island. A written story is an optional device-only note. A story from a prior visit counts; unfamiliar outdoor visits should be in daylight. Self-report is not presence evidence.
- `/island-trials/no-beaches-allowed/defend/siargao` (also `el-nido`, `boracay`) is an anonymous invitation/preview. A recipient selects their own island. It contains no sender identity, private note or completion state. Unknown islands return 404.
- The existing Siargao hype challenge stays complementary, local and time-limited. Its dates/daylight/archival rules are unchanged.
- Passport remains optional. Guest completion requires no wallet, profile, upload, purchase, social connection or post. Existing Google/passkey/wallet availability is unchanged; see `docs/design/progressive-onboarding-2026-10-28.md`. No Privy migration in this sprint.

## Small first launch

Founder manually recruits three consenting creators: one surf/humour voice, one musician, one local storyteller. Each chooses one prompt they actually like; no following minimum. Start with a private demonstration and one invitation. No obligation to tag, post or grant commercial reuse. Use original/licensed sound and permission from everyone included. Never stage a wipeout, disturb a venue, approach strangers for the doppelgänger prompt, or imply a Gados partnership.

A suggested unsent invitation:

> I’m building BaseDare here in Siargao: tiny real-world adventures people can try for free. “Wave or Ex?” is one of the first — one dramatic line, and your friend guesses which it is. No account, upload or posting obligation. Want to try it and tell me what feels fun or awkward? If you like it, I can make you your own tracked invitation link. You keep your content; anything commercial is a separate conversation.

Nothing in this document authorizes sending it. Confirm the actual recipient/sender and opt-out history first.

## Creator operations

1. `/creators` reuses the guest-friendly Founding Creator form and `/api/creator-captains`. Review actual applicants in `/admin/creator-captains`; never create fake captain profiles.
2. `/admin/creator-drops` now has adventure templates for every Chaos Quest, Trial #001 and the existing Siargao challenge. Selection fills a draft only. Set a real consenting creator's code, unique content code/slug and correct destination, then use existing authorized creation. Do not imply ownership over guest attempts or paid verification.
3. The existing `/go/[slug]` and `/drops/[slug]` handle tracked invitations. The report's touches, intents and verified completions retain their existing definitions. A free journal tick cannot become paid verified work.
4. Public uploads still use the existing signed-in, place-bound consent/review path. `/admin/adventures` approves/rejects/removes submissions. Private guest notes never become public uploads. The Island Trials community view scopes approved submissions to Trial #001 and displays loading, error/retry and honest empty states.
5. `/admin/founder-scoreboard` links these existing tools. Captain assignments, paused creator drops and moderation continue through their existing controls. Auth/session gates stay intact.

Authoring and pausing the global free catalogue currently require a reviewed code release. There is no new live trial CMS or generic winner/leaderboard system. Use existing drop pause controls to stop a particular creator invitation, and remove a public submission through moderation. Do not mistake a paused invitation for a globally paused authored adventure.

## Business conversations

Island Trials links into the existing activity-brief enquiry with neutral pricing. No self-serve sponsorship charge, guaranteed audience, automatically reserved creators, rights grant or customer claim. Ask about a concrete local experience, permission, review, costs and usage. The separate $2,500 Field Sprint and canonical paid 96/4 split remain unchanged.

## Weekly improvement loop

Once a week, founder reviews one cohort and one friction point. Confirm analytics ingestion first. Existing/new client events include adventure landing, start, completion, invite open, island choice and share method; strip URL queries/private notes/coordinates. Client events are directional and can be blocked or duplicated; local journals are not a central participation ledger.

Keep an evidence sheet: date, exact creator link, observed opens, starts, self-reports, invitation opens, actual approved public stories, support issues and a repeat attempt. Use `unknown` for unconnected metrics, never zero. Keep verified QR visits, paid proof/payouts, pass-through reward liability and revenue in their existing authoritative systems. Measure whether one shared invitation produces another real attempt and whether the creator wants a second round. Change one prompt or friction point, verify it, then compare a similar next cohort. No autonomous messages, publishing, spend or growth agent is activated.

## Founder acceptance before announcement

Try one quest on physical iOS Safari and Android Chrome; refresh mid-attempt; finish and download the card; send the invitation to a different browser/device; choose a different island; check that no private note transfers. Ask one actual consenting creator and one traveller whether they understand the prompt without explanation. Public upload/review still needs an authenticated device and a real permissioned file. Confirm analytics events in the real destination before quoting conversion. No winner, partnership or paid opportunity can be announced without its own evidence and permissions.
