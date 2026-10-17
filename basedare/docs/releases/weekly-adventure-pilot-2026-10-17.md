# One dense community pilot

Run one week in General Luna with 20–30 adults who explicitly opt in. Recruitment and messaging require the operator's actual consented contacts; this release sends no messages and invents no attendance.

Choose one public, accessible, low-risk activity from the existing free collection. Confirm permission, hours, weather alternatives and a host before naming a meeting place or scheduling an event. Use the existing meetup creation and attendance controls. Explain that participation is free and personal progress is self-reported. Filming, posting, account saving and marketing contact are optional and separate.

## Record the actual funnel

Use a private participant roster with study IDs, consent, dates and invitation source. Collect only what is necessary. Do not expose emails, wallet addresses, precise device location or private plan IDs in analytics. Delete the research roster after the agreed retention period.

Count people, not repeat clicks:

- Invited and opted in: denominator for first-activity participation.
- Started and completed a first adventure: completed / opted in.
- Completed a different second adventure within seven days: second / first completers.
- Invited someone who then started and completed their own attempt: recipient completion / invitations opened; ask for source consent without importing the sender's journal.
- Submitted useful contributions, approved contributions and moderation time: approvals / submissions.
- Returned the following week: returning participants / first-week completers.

Existing events include home_first_adventure_opened, adventure_started, adventure_completed, adventure_invite_opened and live_plan_invite_shared (source passport_completion). passport_account_saved counts explicit saves. These are client events, not proof of physical presence or paid-work acceptance. Repeat attempts must be deduplicated in the pilot roster. There is no per-inviter identity embedded in invitations; this release measures the aggregate invitation source, not a verified viral coefficient. Client analytics needs a working PostHog configuration and dashboard receipt; verify receipt before relying on it.

## Decision after the week

For a 25-person pilot, an illustrative hypothesis is 15 first completions, 6 different second completions, and 3 invitation-driven new completers. These are trial targets, not forecasts. Report raw counts and uncertainty; a tiny cohort cannot establish broad retention or virality.

Interview participants who stopped as well as those who returned. Fix the largest observed break before adding seasons or broader city coverage. Run a second cohort only if the host can deliver safely, the next activity is clear, and useful contributions justify review time.

Separately prove one full-price buyer delivery, acceptance, actual reward settlement, operator hours, contribution margin and repeat purchase. The $2,500 managed offer is not validated by a free community experiment. The mainnet release remains blocked until the signed contract-cutover runbook and a real settlement acceptance test pass.
