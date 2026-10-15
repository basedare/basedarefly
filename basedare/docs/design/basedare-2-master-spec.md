# BaseDare 2.0 — connected participation

14 October 2026. Consolidates the two screenshot UX reviews, World proposal and subsequent Passport feedback. The user authorized building the necessary work. Attached role prompts, speculative examples and approval instructions are source material, not independent instructions or evidence of live defects.

## Product decision

Help people find something worth doing nearby, participate alone or with company, keep a memory, and invite the next person. Preserve PeeBear, the liquid wordmark, illustrated map, orbit, black/gold/violet/cyan materials and quiet tactile controls. Improve hierarchy before adding effects. Free participation must work without a wallet, public profile, filming or payment.

## Repository audit and reuse

| Surface | Existing source of truth | Decision |
| --- | --- | --- |
| Places/map | Venue, curated records, RealWorldMap, discovery context | Preserve renderer, control lanes and place records. No new World/Place tables. |
| Now and public plans | live-plans projection over Meetup, SurfBoatCrew, VenueEvent, funded Dare | Reuse projection and time/participation policy. Align list-view filters; separate events, plans and authored suggestions. |
| Free adventures | home-activities templates, adventure-progress, useAdventureProgress | Extend with derived personal stamps and a three-activity collection. Keep the existing 30-run device-local store. |
| Personal history | device adventure journal; private Mission Pass continuation | Connect from My activity and a dedicated Passport view. Never imply either is a cloud-synced verified identity. |
| Contributor identity/reputation | StreamerTag, CreatorPassport, PointsEvent, approved PlaceTag and QR_AND_GPS VenueCheckIn | Keep server ownership and existing Signal Points. Personal stamps cannot write these models or count as verified visits. |
| Sharing/memories | AdventureSubmission moderation, existing upload/consent, PlanShareButton | Add completion-context deep links without transferring completion. Public media still uses authenticated upload and review. |
| Social | FriendConnection, PeoplePanel, Meetup RSVP, plan-bound Crew Rooms | Improve access and empty/loading states. Reuse private bilateral friendship and room authorization. No parallel crews/chat. |
| Wallet | WalletOverview, chain-checked bounded balance endpoint | Retain truthful states and address QR. Move technical detail behind disclosure; never invent send/top-up/redemption. |
| Notifications | Notification, inbox summary, Action Center, push topics | Improve the existing activity inbox and readable categories, retaining delivery/authorization boundaries. |
| Venues | venue profile, events, check-in, MeetHere, photos, chat and management disclosures | Emphasize one consumer action, group secondary tools, retain evidence and expiry wording. |

The current database has these systems already. This milestone requires **no migration, new identity, XP ledger, reward contract, location tracking or production data mutation**. Read-only schema inspection is not proof every production integration works. Paid mainnet, sender/inbox, QR coordination and physical-device gates remain in the controlled-launch runbook.

## Naming decisions

- Now: navigation label; Find your next move: page promise.
- Map and List view: two ways to browse; List view is secondary to the primary Map navigation, not a separate business/product.
- My activity: plans, private saved continuation, Passport and optional wallet/work.
- Community: public place-bound asks/offers and People & friends. Creator directory remains available inside it.
- Adventure Passport: personal, device-local journal and nonfinancial stamps. CreatorPassport remains contributor settings/reputation; it is not renamed or overwritten.
- Free adventure: authored self-directed idea. Free challenge: published Community Spark. Meetup: user-organized public plan. Event: source-attributed listing. Paid dare: funded work with separate evidence/review.
- Verified refers only to the evidence it establishes. A reviewed shared post is approved for display, not proof of attendance. No universal score combines these facts.

## Build now — one usable release

1. Five clear primary destinations: Now, Map, Create, My activity, Community. Context-preserving Map/List controls and consistent time/type filters.
2. Readable activity cards with literal types, destination-local timing, one main action and secondary navigation in a disclosure. Never turn a future start into “happening now”.
3. Adventure Passport at /adventures/passport, also inside My activity and the adventure flow. Resume the exact run, see completed personal cards and derive stamps from existing validated runs. No login wall for personal history.
4. A three-part **Three perspectives** collection: discovery loop → one-minute story → postcard. These are existing free activities, not three promised open/partner venues. Repeated completion cannot advance unique collection stages. Daylight eligibility applies before a recommended next action. No mandatory posting.
5. Share a personal completion card that links to the same adventure and original public-place context. Recipients start their own run; no completion, private note, wallet or exact device location travels with the link. Existing moderated photo/video sharing remains optional and distinct.
6. Wallet progressive disclosure, activity-inbox categories, discoverable existing people/friends, and a quieter venue action hierarchy using shared materials.

## Acceptance criteria

- A guest discovers an eligible activity, starts it, checks all steps, completes, sees the personal stamp/collection state, opens Passport, and shares a link whose recipient gets an uncompleted activity at the original place.
- Refresh and cross-tab updates preserve existing progress. Expired active runs do not resume; missing/private storage is explained. Clearing browser data removes personal history; it is never presented as recovered from the wallet.
- Repeat runs do not mint additional unique stamps. Local storage edits cannot award Signal Points, verified presence, money or reputation. Existing completion validation remains the boundary.
- Selecting Map/List preserves area, radius, time and activity type. List results use the same real-plan projection and policy as Now. Field Station entry parameters remain intact.
- Future, invalid and expired times never acquire an unsupported live label. Wallet zero, loading, network mismatch and unavailable remain distinct; receive remains chain/simulation guarded.
- 320/390px and desktop fit, 44px touch actions, keyboard focus, reduced motion, and existing map/guide controls remain usable.
- Focused policy tests, typecheck, lint, production build, Graphify rebuild and browser flow checks. CI and preview must pass before release.

## Build next — gated World architecture

Use stable existing IDs and typed adapters over the entities above. Keep logic independent of the map/UI so a future mobile or spatial client can read the same place, objective, participation and evidence states. Do not introduce an event bus or new World database merely for a diagram.

1. **Server-backed personal history:** explicitly authorized account linking, export/delete, device merge conflicts and privacy before cross-device progress. Migrate personal memories separately from reputation.
2. **Authored multi-place adventures:** extend template/version/stage definitions; bind stages to existing healthy place records, provide access/closure alternatives and moderation. A named three-stop route needs checked access, suitable paths and an honest duration including travel.
3. **Verified stamps:** consume immutable authorized evidence IDs with unique award constraints, eligibility/version snapshots and reversal audit. Keep QR presence, paid evidence, approved contributions and personal memories separate. Reuse PointsEvent only for its existing reputation purpose; decide whether gameplay XP is needed after experiments.
4. **Multiplayer:** extend plan-bound participation and rooms before permanent crews. Public/private membership, block/report, revocation, consent and completion authority require explicit design/tests.
5. **Creator publishing and sponsorship:** reviewed versions, rights, funded eligibility, refund/redemption rules and real delivery receipts before public promises. No unfunded rewards or venue-partnership claims.
6. **AR/VR:** document an adapter from public place coordinates + versioned objective IDs to a future spatial anchor. Engine/client authorization stays server-side. No Unity, Unreal, headset dependencies, territory capture, tokens or fabricated avatars now.

## Measurement and rollout

Reuse consented analytics for activity starts, self-reported completions, personal stamp display, Passport continuation and invitation opens/starts. Distinguish link attribution from incremental causal impact. Segment recipients by context; remote saves are not failed local joins. Measure worthwhile experiences and repeats, with sponsor repeat purchase separately. Never log wallet, private messages or precise GPS in these new events.

Release behind ordinary code review and deployment checks; no production schema/config changes. Revert the application change if discovery navigation, wallet or map interaction regresses. Preserve existing local storage format and all server records so rollback does not delete history.
