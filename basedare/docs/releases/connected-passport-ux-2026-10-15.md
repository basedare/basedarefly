# Connected Passport and UX foundation — 15 October 2026

## Behavior

Guests can open **Adventure Passport** at `/adventures/passport`, continue an existing free adventure, see personal completion cards and collect two nonfinancial stamps. The Three perspectives collection reuses the discovery loop, one-minute story and postcard templates. Distinct activities advance its three stages; repeating one does not substitute for the others. PeeBear recommends an eligible unfinished stage first, respecting daylight before personal progress. Public plans and optional invitations remain available alongside solo participation.

The Passport projects the existing validated 30-run local journal. It has no server award authority, account sync, new XP, paid reward, verified attendance or contribution reputation. Its storage/retention limits remain visible under About your record; unavailable writes propagate to the other journal views. My activity and adventure screens link to the same record. The legacy `/passport` alias now points to the canonical adventure route; already cached historical redirects still reach My activity, which also exposes the new direct link.

Completion invitations contain an authored activity and original public place, or rounded map-area coordinates. They do not transfer sender identity, a run ID or completion. Recipients see an invitation explanation and start their own attempt. Activity-specific Open Graph cards use the existing share-card renderer with explicit free/optional-sharing copy, replacing its default verification wording for these activities. Signed media upload, consent, moderation and withdrawal are unchanged.

Now and List view share `browsePlanInventory`, time/participation/needs-people policy and destination-local schedule labels. A scheduled start inside the Now horizon is no longer labelled “happening now”. Canonical `next2h`, legacy `NEXT_2H` and map `pulse` links retain the same filter. Discovery radius follows the existing 25 km plan limit. Historical place updates sit in a separate disclosure rather than filling an empty matching-plan view.

Five primary destinations remain: Now, Map, Create, My activity and Community. Context-preserving Map/List controls provide the secondary view. Cards use literal activity types, larger labels, one primary action and secondary map/directions. Authored free ideas appear before the empty-plan message when appropriate. Existing map renderer, markers, camera, control lanes, logo and homepage orbit remain intact.

Venue tools prioritize an adventure, or the existing check-in when a listed perk supplies that context. Meet/check-in/photo/chat tools share a disclosure. Wallet details disclose technical/network-fee information while preserving truthful zero/loading/unavailable/network/simulation states and receive QR guards. No send, fiat checkout or reward redemption was invented.

The Activity inbox groups actual events into Social, Adventures, Paid work, Places and Other. Private reads are bounded, uncached and guarded against stale responses/account changes. Failed or unsigned reads expose recovery rather than an “all caught up” claim. Mark-read invalidates an outstanding notification read. Existing signed writes, Action Center, messenger and push preferences remain separate. People & friends gains clear loading/error states, neutral display fallbacks and wallet-bound connection snapshots without changing server request/block rules.

## Verification

- App TypeScript check; full lint passes with repository warnings and no errors.
- 36 discovery/presentation/Passport checks: valid completion, unique collection stages, repeat behavior, night eligibility, invitation privacy, future/invalid/expired schedules, combined type/time/forming filters and Next 2h round-trip.
- Existing offline wallet/venue usability, Community identity and creator-onboarding signature checks pass. Static production safety passes with its two documented admin-route exceptions.
- Production Next build includes the canonical static Passport and adventure image routes. No schema or dependency changes.
- Browser: guest step completion advances 1/3 → 2/3 → 3/3; both personal stamps appear immediately and remain after reload. A separate localhost origin receives an uncompleted invitation with zero pressed steps and an enabled start action. No real-world visit was asserted as verified and no server submission was published.
- 320px recipient, 390px Passport/List and 1440px desktop Passport fit without horizontal overflow. Hydrated Now → List keeps Meet people, Next 2h, selected area and 12 km radius. The 1200×630 adventure share PNG renders with no verified/payment claim.
- Graphify rebuilt after the final code changes; the generated report is included in the release.

## Limits and release checks

Local public-data reads encountered intermittent database pool timeouts; the List page subsequently rendered real recorded history and an honest empty matching-plan window. Verify the candidate deployment's public read paths before promotion. Browser testing did not sign a real account, publish a post, request a friendship, deliver physical-device push, or exercise a real funded payout/refund. These checks do not clear the separate controlled-launch gates.

Use the PR's exact-head CI/preview status and the production deployment SHA as shipping evidence; a local build is not proof of production deployment. No migration, production environment change, QR rotation, mainnet signing, escrow transfer, outreach or paid-work state mutation belongs to this release.

## Rollback

Revert the application commit if navigation, map access, private inbox isolation or wallet behavior regresses. Existing local-storage keys, server records and reputation/payment rails remain compatible. The personal stamps can be recomputed from the saved journal; do not delete or rewrite that history during rollback.
