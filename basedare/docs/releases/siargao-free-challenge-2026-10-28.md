# Siargao free launch — 28 October 2026

## Scope and reuse audit

| Finding | Classification | Result |
| --- | --- | --- |
| Guest start, steps, refresh/resume, private journal | Reuse as-is | Existing adventure catalogue, progress hook and lifecycle |
| Siargao-specific eligibility and campaign window | Small modification | Local authored suggestion, fixed destination and automatic archive |
| Map discovery | Small modification | One independent marker using the existing MapLibre/approved PeeBear language |
| Verdict and anonymous invitation | New narrow implementation | Three allowlisted choices, existing native share plus explicit clipboard/manual fallback |
| Share preview/card | Small modification | Existing card fallback, approved artwork, bundled font, three fixed public preview routes |
| Creator interest and buyer intake | Reuse as-is | Existing mission alerts and public content/activity enquiries; no artificial inventory |
| Social/email login and deferred embedded wallet | Deliberately deferred integration | Concrete account audit/migration plan; no provider or ownership change |
| Mainnet, paid delivery, new services and outreach | Outside free milestone | Existing launch guards remain; no transactions, messages or spend |

## User journey

`/adventures/siargao-verdict` → Take the challenge → mark The hype and The underdog → choose Worth the hype / Overrated / It's complicated → Save my verdict → optionally share, copy an invitation, or download PNG.

An optional private note stays in this browser only. It is not included in shared URLs, public cards, analytics or account backups. Choosing a verdict does not publish it. A share URL accepts one of three fixed choices; it does not verify that anyone completed an adventure or import another person's progress. No free-form public review feed is added.

Free adventure routes skip the decorative protocol-loading overlay, so an invitation opens directly into the experience. The homepage intro remains. Unavailable session storage no longer throws in the loader.

The destination stays General Luna/Asia-Manila even if a shared link has another city's query parameters. Map and homepage/Adventures discovery are local and temporary. Existing unfinished adventures keep priority. The pilot ends after 15 November Philippine time. Completed runs, share pages and cards remain accessible; no history is deleted.

## Verification

- 59 discovery tests pass, including required verdict/stages, invalid choices, refresh serialization, optional account-save preservation, note exclusion, geographic/daylight bounds and archival without history deletion.
- Production build includes application type checking and all 197 pages. Full lint has zero errors and 222 warnings. Eleven regression suites plus four validation-security checks pass; this includes existing refund, identity, revenue, creator, static-safety and database-release-policy checks.
- Local browser: guest start, first-step refresh/resume, remaining steps, verdict, private-note recovery, completion and copied-link privacy pass. Layouts at 320px, 390px and 1440px have no horizontal overflow.
- The General Luna map shows one authored challenge marker; its link opens the exact adventure. No underlying map camera or tile changes are made.
- Valid PNG returns 200 with the selected fixed headline; invalid choice returns 404. Browser metadata points at the selected verdict card. Generated artwork was visually inspected; PNG exports fix the renderer's unsupported WebP input.
- A temporary local daylight clock was used only for the browser participation test because real Siargao daylight was insufficient for a new 45-minute outing. It was restored before final checks/build and is not part of the change. Test completion is local QA, not real attendance or growth evidence.
- Screenshots, exact final build results and hosted-preview/deployment evidence are recorded in the external release handoff. Local development has no production database credentials; unrelated live inventory requests fail visibly.

## Onboarding and growth

`docs/design/progressive-onboarding-2026-10-28.md` documents guest-first entry and the exact account/wallet compatibility work required for Privy-like email/social entry. Existing Google is a creator-channel OAuth integration requesting YouTube access; it is not a completed general traveller sign-in flow.

`docs/gtm/siargao-free-challenge-launch.md` contains separate surfer/traveller/local DM, Story and Reel drafts, all voluntary and unsent. Existing analytics calls are a foundation; real ingestion, unique visitors, creator attribution, real completions and retention still need measurement. No paid-completion attribution is awarded for this challenge.

## Release boundary

This branch includes the pending product-clarity PR #37 and its dependency-security repair. Zod resolves to 4.6.7 across consumers; actual Coinbase typed-data, Reown frame and Farcaster notification schemas pass valid/invalid compatibility checks. The array-size regression rejects oversized input before visiting elements; the old 4.3.5 library visits all 1,000 elements in the negative control. OnchainKit stays pinned to the existing 1.1.2 because the 1.1.3 patch changes funding-button requirements. See validation-security-2026-10-28.md. CI remains a required release gate.

No schema, contract, pricing, reward, rights, secret, authentication-provider or production configuration change. Paid readiness is not established by these free-browser checks. Ship only after dependency and CI gates pass, then check the hosted guest journey and exact production revision. To pause the campaign, end its discovery/start window while retaining its catalogue entry, verdict-aware journal parser and shared result routes. Do not revert the security patch or discard new journal history as a rollback shortcut.
