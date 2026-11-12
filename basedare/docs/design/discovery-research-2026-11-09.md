# Discovery research and measurement — November 9, 2026

The [Product Constitution](../../brain-vault/00-control/product-constitution.md) remains authoritative. This is a dated research note and proposed learning plan, not customer research results, a new KPI mandate, partner claim or evidence of lift. No interviews have been conducted for this sprint. PR47's existing permissioned QR and deterministic harness are reused. The [current QR audit](irl-growth-harness-2026-11-08.md) documents their limitations.

## Public-source observations and implications

Primary sources were opened on November 9, 2026. Public UI and publisher descriptions establish what is presented, not actual fulfilment, customer demand or growth.

| Source | Verified observation | Practical lesson for BaseDare (inference to test) | What is unverified |
| --- | --- | --- | --- |
| [Koobo's Siargao wellness page](https://www.koobo.ph/siargao/wellness-and-yoga) | Destination/category-specific listings show named local areas, per-person or group prices, map access and questions about eligibility, equipment and cancellation. The page links business/creator entry points. | Keep the chosen destination; make the actual activity, location, effort/eligibility and known price understandable before an action. Link to the existing exact destination rather than a generic homepage. | We did not book or test cancellation, host review, acquisition/referral mechanics or QR campaigns. Listing counts, reviews and prices are publisher content, not independently verified activity or traction. |
| [TravelGO's website](https://travelgo.ph/) | Entry actions are specific consumer tasks: food, transport and tours in Siargao; support/order links are visible. Some map/stay sections returned loading placeholders in the fetched page. | State the practical outcome and one next action. Show current operational status rather than suggesting availability from an attractive card. | No live order or ride was attempted; fetched placeholders do not establish a production defect. Website claims about service scale, support and payment security were not audited. |
| [TravelGo's developer listing on Google Play](https://play.google.com/store/apps/details?id=app.travelgo.ph) | The description covers reviewing service details, order/trip status, contextual support and web access; it explicitly makes availability, pricing, coverage and payment methods variable. | Explain what happens after an action and distinguish request/approval/availability states. Keep browsing useful before a transaction or login. | No app/device, fulfilment or payment test. Store totals are not retained customers or market share; no traction inference is made. |
| [Official OpenAI Visualizations documentation](https://learn.chatgpt.com/docs/visualizations) | ChatGPT can produce maps for geographic information and interactive results; the documentation asks for an outcome, source material and useful controls, then supports follow-up refinement. | Ask intent in ordinary language, ground answers in eligible inventory, show useful context/actions and let the destination/time constraints be refined. | This source does not establish a distinct product called “GPT Maps,” its local inventory or navigation guarantees. It is evidence about a documented ChatGPT workflow, not competitor demand or BaseDare ranking performance. |

Adopt five modest lessons: ask what the person wants to do; retrieve real eligible inventory; connect context to a working next action; make destination, effort and known price explicit; and show whether the action is currently available, paused or requires review. These are proposed design choices, not evidence that competitor interfaces caused retention or revenue. Keep free adventures, public stories, meetups and properly funded work distinct. Do not copy booking, food delivery or transport operations into BaseDare.

## Behavioral hypotheses and incentives

Clear outcomes, one visible next action, explicit effort and authentic permissioned examples may reduce uncertainty. Too few choices can also hide a suitable activity; a default can bias selection; social proof can mislead; an easy start can reduce completion quality. Test comprehension and completion alongside clicks. No claim about universal choice overload, habit formation or psychological causality is established by this audit.

Seed useful supply with real, approved local activities and truthful status before inviting demand. Creators need a specific suitable opportunity and rights/effort terms; hosts need a real visitor or deliverable outcome; travellers need something worth doing. This is a coordination hypothesis, not proof of a network effect. Preserve optional sharing, consent, reviewed publication, current funding checks and no-follower-minimum eligibility. No tokens, manufactured scarcity, inferred social presence or new reward mechanics.

## Lightweight research checklist

- Recruit only through separately authorized, consented research; seek travellers/backpackers, local creators, musicians/surfers/skaters, venue owners and tour/activity operators. Include people who did not start or who abandoned, rather than only enthusiasts. Record recruitment bias and participant role without a public identity roster.
- Explain the study, optional participation and note/media permission. Use sanitized notes; no recording or publication by default. Keep any consent record in the approved restricted system, outside Git, with a named owner and agreed retention/deletion date.
- Ask about the last real occasion before showing the prototype. Observe a neutral task in a manually chosen area and the same real inventory. Permit location refusal. Do not lead with rewards, demand sign-in or describe a hypothetical paid offer as available.
- Record misunderstandings, successful/failed tasks, help/taps, device/network, approximate task time and operating-status mistakes. Keep quotes only with permission; separate observed behavior, the person's explanation and the team's inference.
- Review problems by severity and affected journey; change one bounded thing. Use [experiments A–E](../../harness/experiments/discovery-learning.md), then repeat tasks under similar conditions. Record negative/inconclusive findings and stop on privacy, consent or safety failures.

| Audience | Neutral prompts |
| --- | --- |
| Traveller/backpacker | “Tell me about the last time you wanted something to do here. Where did you look? What made it worth the effort? What stopped you?” Then: “Find something you would actually consider in the next two hours. Tell me what it costs, where it is and what happens next.” |
| Creator | “How did you find your last real brief? What scope, payment, usage-rights or review detail did you need before applying? What happened to your last application?” |
| Musician, surfer or skater | “How did someone new discover your last session or activity? What information was safe to share publicly? What made an invitation unsuitable?” |
| Venue owner | “Describe the last promotion you could tie to a real outcome. How did you distinguish attention from visits? Who could authorize a QR placement, story or event update?” |
| Tour/activity operator | “Walk through your last fulfilled referral. How did availability, handoff, cancellation and commission reconciliation work? Which confirmation would count as success?” |

Do not fill answers from competitor copy, AI suggestions, social engagement or a founder hypothesis. Interview responses, sample sizes and findings are currently UNAVAILABLE.

## Measurement definitions and availability

The Constitution's core metric is **weekly known identities completing meaningful actions**, with guest browser records, self-reports, independently verified evidence and actual cash separated. A meaningful-action taxonomy and legitimate identity deduplication must be explicit for any report. A browser journey, wallet owner or device identifier cannot by itself establish a distinct human.

**WVRP is proposed, not a current or installed KPI:** the count of distinct legitimate real-world participation completions verified during a declared week under the relevant existing review rules. Deduplicate the canonical participation/completion, not every emitted verification event; state timezone/week bounds and count by verification time. Retain the underlying participation date separately so review backlog does not look like new activity. Define eligible activity types and treatment of revoked/rejected verification before use. Do not include guest self-reported adventures, scans, an RSVP, a story approval, a share or money settlement as interchangeable proof. Different activity types can require different existing evidence; a reviewed text story alone is not a verified visit.

Track **unique participating individuals separately** from WVRP to distinguish repeat completions from audience growth. This number remains unknown without an authorized, privacy-preserving legitimate-person definition and reliable deduplication; label a known-identity count as such. Do not join private identity records or reidentify guests to manufacture the figure. WVRP reporting has not been implemented by the six-field harness export.

The existing aggregate QR export accepts only authored free-adventure QR cohorts, grouped by **browser journey + target**, and contains exactly:

| Field | Recorded meaning | Limit |
| --- | --- | --- |
| `entries` | Distinct journey/target entries associated with selected adventure QR touches in the bounded window. | The admin per-link raw request count is different and can contain repeats/bots. Neither proves unique people or a physical scan. |
| `landings` | Eligible `ADVENTURE_LANDING_RENDERED` journey/target stage. | Client-reported render; missing events can be consent, network or instrumentation gaps. |
| `starts` | Eligible `ADVENTURE_STARTED` journey/target stage. | An attempt/start, not attendance, completion or a distinct individual. |
| `selfReportedFinishes` | Eligible `ADVENTURE_COMPLETED_SELF_REPORTED` stage. | Self-report stays separate from existing reviewed/verified proof. |
| `shareActions` | Eligible `ADVENTURE_INVITATION_ACTION` stage. | No message delivery, recipient visit or independent participant is inferred. |
| `verifiedCompletions` | Eligible `PATH_VERIFIED_COMPLETION` event stage, if actually recorded for the same target/cohort. | Not an extrapolation from finishes; this aggregate alone does not establish WVRP or population-wide verification coverage. |

Source/row limits and unavailable reads produce `counts: null`, never fabricated zeros. Non-adventure participation is N/A. A complete observed zero remains zero. Frozen attribution, separate stage writes, event follow-up and missing renders prevent a simple causal funnel interpretation. The planner's `startsPerLanding` is descriptive; a zero denominator returns null.

The broader discovery sequence is a **measurement contract**, not evidence that all events currently exist or reach an analytics provider. Reuse the existing attribution rail for canonical actions and consented `trackClientEvent`/privacy rules for permitted UI events. Existing client analytics can no-op when the provider is not initialized. Audit actual ingestion and join coverage before reporting any metric. Prefer structured intent/category and coarse destination labels; do not log raw free-text queries, precise coordinates or private record IDs.

| Proposed measure | Definition / denominator | Coverage requirement |
| --- | --- | --- |
| Search success / zero-result rate | Successful interpreted queries with at least one eligible result / successful interpreted queries; zero-result numerator is successful empty responses. | Exclude/report request failures separately. Preserve intent, content type, chosen area and time mode at an approved coarse level. No success claim from a search click. |
| Result open rate | Distinct eligible result opens / corresponding actually rendered result impressions, with one predeclared unit. | Deduplicate renders and opens; do not divide total opens by queries or mix modes. |
| First-action conversion | Qualified discovery entrants starting a defined meaningful action / comparable qualified entrants. | Define guest/known identity units separately, same inventory/source/window and follow-up. Current QR starts per landing is one narrow proxy. |
| Time to first meaningful action | Median and spread from qualified arrival to first defined action. | State observation/censoring window, include non-starters separately and do not report only fast completers. Six QR totals cannot calculate timing. |
| Verified completion conversion | Canonical, legitimately verified completions / eligible starts with sufficient equal follow-up. | Existing review evidence, deduplication and approved activity types; report review backlog and self-reports separately. |
| Return participation | Eligible participants with another distinct meaningful action in a declared later window / eligible initial participants with full follow-up. | Distinguish known identities from guest-browser return; the current aggregate cannot join weekly cohorts. |
| Referral contribution | Independent qualified recipient visits, starts and verified outcomes attributed under existing rules, each reported separately. | Existing frozen-intent/attribution limits, deduplication and independent recipient evidence; a share action is not a recipient. No implied causal incrementality. |
| Business outcomes | Accepted creator deliverables, qualified enquiries, independently confirmed fulfilled referrals and reconciled commission, each separately. | Approval/fulfilment/accounting evidence; views, estimates and paid-out rewards are not booked service revenue or verified footfall. |

## Comparison, guardrails and release decisions

Before comparing, review evidence provenance, stage definitions, deduplication, channel/QR placement, destination/inventory, eligibility, device/network mix, timezone, weekday, window length, attribution/consent rules and revision. Separate organic and paid placement. Record assignment contamination, bots, review delays, novelty and seasonality. Prefer observed usability tasks at small sample sizes. Do not treat the harness's 30-entry/20-landing/20-finish thresholds as power calculations or significance tests.

Predeclare one primary outcome, qualified denominator, follow-up, analysis and stopping rule. Report sample sizes and uncertainty; do not choose winners from repeated peeks or only favorable segments. State whether a comparison is observational or randomized; temporal movement alone is not causation. Guardrails cover completion quality, complaints/withdrawals, moderation time/queue and reliability; set reviewable thresholds before running, with zero tolerance for authorization, consent/privacy and commercial-policy violations. Current six totals contain none of these guardrail outcomes, so the harness marks them NOT MEASURED and comparability NOT ASSESSED.

No raw user data, transcripts, private media, query text, exact location, wallet/contact list or secrets enter version control or aggregate exports. No new collector, external AI call, ranking personalization, experiment assignment service, migration, app integration, production change or outreach is introduced by this note. Independent review and explicit founder release approval remain required. Physical-device, provider and paid-launch acceptance stay separate from automated checks.
