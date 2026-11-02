# Get your next dare — controlled email acceptance

This is an optional post-completion opt-in, separate from Mission Pass recovery, business enquiries and creator alerts. It reuses private FounderEvent records and the fixed Resend endpoint; no contact import, extra CRM, scheduler or bulk broadcast. Production starts OFF. Code/fixtures are not sender/domain/inbox proof.

## Configuration and acceptance

Configure through the hosting/provider secret controls, never in chat or Git:

- `RESEND_API_KEY`: appropriately scoped Resend sending credential.
- `RETENTION_FROM_EMAIL`: one controlled, verified bare sender address (no display-name syntax).
- `RETENTION_SECRET`: dedicated random secret, at least 32 characters. AES-256-GCM protects stored addresses/tokens; keyed email hashes deduplicate. Back it up securely. Changing it requires a reviewed contact re-encryption/migration; do not casually rotate it and create duplicate contacts.
- `RESEND_WEBHOOK_SECRET`: Resend/Svix signing secret. Configure `/api/updates/webhook` for delivered, bounced, complained and suppressed events. Verify against raw bytes; timestamps and event IDs prevent ordinary replay. No recipients are copied into the receipt ledger.
- `RETENTION_SITE_URL`: optional canonical `https://www.basedare.xyz`; no arbitrary origins or redirect destinations.
- `RETENTION_EMAIL_ENABLED`: default false. Enable only in a controlled acceptance window after sender/domain/DNS verification and with a founder-owned test inbox ready.
- `RETENTION_SEND_ENABLED`: separate default false. Keep off through opt-in acceptance; enabling opt-in never starts a marketing campaign.

First inspect the Resend domain verification, SPF/DKIM and sender ownership in the real account. Use one founder-owned inbox, with permission, for a completed free challenge → explicit topics/permission → confirmation email → deliberate confirmation → reviewed update → signed receipt → unsubscribe → no later send. Test scanner GETs, expiry, retries, failures and bounce/complaint suppression with fixtures; do not cause genuine complaints against a real sender just to test. Record actual inbox arrival separately from API acceptance and delivery events. No such genuine inbox test was performed by this build; production lacks the Resend settings.

After the controlled test, leave both switches off unless the founder explicitly elects to open the small pilot and has a moderation/support owner. Mission Pass uses its existing separate flag/from settings; no marketing permission is implied by recovery.

## Bounded operator tool

The existing founder growth view shows consent/provider status via authenticated `GET /api/admin/retention`. It returns aggregate records and up to 50 opaque confirmed contact IDs/topics, never raw email or tokens. `moreCandidates` explicitly reports a truncated operator selection list; aggregate counts are database counts.

A manually reviewed `POST /api/admin/retention` accepts this shape (example only; do not run against real contacts without reviewing the specific audience/message):

```json
{"campaign":"your-reviewed-unique-code","topic":"challenges","contactIds":["actual-confirmed-contact-record-id"],"subject":"Your next free afternoon?","text":"One small, free adventure to try when you feel like it. No posting required.","href":"/adventures/wave-or-ex","reviewed":true}
```

Use existing operator authentication and same-origin controls. The topic must match current confirmed consent. The endpoint accepts at most ten selected IDs; durable limits additionally allow ten update attempts per day globally and one per contact per rolling seven days. There is no automatic recipient selection, cron, external DM or Telegram broadcast. Retry with the same campaign code: it cannot resend the same record. A timeout/FAILED/PREPARED record is not permission to create a new campaign code to force a retry; inspect the provider’s idempotency receipt first. Unknown outcomes stay unknown. Provider idempotency is an additional protection, not a database transaction guarantee across the network.

Confirmation requests have durable global 30/hour, IP 3/hour and contact 1/hour caps, plus a process-local outer limiter. Unused confirmations expire in 48 hours. Existing confirmed topics remain unchanged until a fresh choice is confirmed. A complaint/bounce suppresses the contact and clears pending consent; a fresh form cannot auto-unsuppress them. Unsubscribe uses a stable opaque bearer link, clears pending confirmations/topics, works with sending/config off and never deletes adventure progress. GET requests never change consent. Keep contact rows for suppression; deletion/rekeying needs a reviewed data request process.

`ACCEPTED` means provider acceptance, `DELIVERED` requires a signed delivery event and does not prove reading. Repeated receipts deduplicate; an early receipt is reconciled after the provider ID is saved. Suppression dominates later delivery. A legacy Mission Pass `DELIVERED` field records transport acceptance only; this build does not retroactively establish recovery inbox delivery.

## Verification / rollback

Actual disposable PostgreSQL + route tests cover completed guest gating, permission/topics, encrypted storage, passive GET, confirm replay, separate sending flag, topic mismatch, destination refusal, duplicate campaign, rolling cap, signed Svix official vector, timestamp/tamper refusal, receipt dedupe, early webhook, suppression, unsubscribe with secrets/flags removed, private provider failures and no contact-secret admin response. Provider calls are stubbed and restricted to fixture addresses; no real email was sent.

Pause either sending switch if consent, unsubscribe, unexpected sends or delivery status fails. Unsubscribe and signed suppression remain operational while paused. Keep the existing schema/ledger; do not roll back to a version lacking unsubscribe while retention emails are in circulation. No migration or dependency is added.
