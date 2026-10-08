# Mainnet escrow and email recovery — 9 October 2026

## Mainnet: prepared, not deployed

`mainnet-candidate-plan-2026-10-09.json` records a read-only estimate from the existing local wallet configuration. These roles require operator confirmation; the predicted address is not deployed. The creator/platform split remains 96/4. No Solidity source or production contract configuration changed.

The candidate owner has approximately 0.004891 ETH, below the deploy script's existing 0.005 ETH operational reserve. Estimated deployment L2 fee with a 20% gas margin was approximately 0.0000464 ETH; this excludes Base L1 data fees and the separate referee setup transaction. Refresh estimates before signing. The referee candidate has approximately 0.002316 ETH.

Mainnet now requires an explicit matching deployer key and public address instead of falling back to a referee key. The deploy script prints its unsigned data hash and gas estimate, and checks owner, USDC, treasury, referee and fees after deployment. The preparation command is read-only and accepts no private keys. See `docs/runbooks/mainnet-cutover.md` for the human-signed deployment and recovery instructions.

## Mission Pass recovery: fixed; delivery setup missing

Production environment metadata was inspected through the existing Vercel CLI credentials (the connector lacked env-list permission). The HMAC secret exists; RESEND_API_KEY, MISSION_PASS_FROM_EMAIL and the public enable flag are absent. No secrets were printed or changed.

Fixed:
- Recovery looks up saved email passes rather than selecting the requesting browser's activity.
- Recovery starts an isolated journey and changes identity only when its private emailed link is opened.
- Email ownership binds only explicitly emailed activities. Other browser sessions are not silently upgraded; their unrelated history is not included.
- Unknown emails create no pass and receive the same public response. Delivery failures and email throttling do not enumerate saved email identities.
- Email rate limits run under a transaction-scoped lock, preventing parallel sends from bypassing the cap.
- Disabled or unconfigured email is rejected before issuing a pass. Provider requests have a timeout; provider response bodies are not exposed to users.
- Pass redemption checks expiry/revocation again atomically before changing identity.

No migration or new package is required. Portable continuation links remain available. Provider acceptance is recorded using the existing delivery state; it is not proof that an email reached an inbox.

## Enablement steps

1. In Resend, verify a BaseDare-controlled sending domain. Create a sending API key scoped to it.
2. Add RESEND_API_KEY and MISSION_PASS_FROM_EMAIL in the BaseDare Vercel project using secure settings, not chat. Example sender: BaseDare <missions@your-verified-domain>.
3. Keep NEXT_PUBLIC_MISSION_PASS_EMAIL_ENABLED false until a preview is ready to test. Set true for that preview and redeploy; the flag is checked on the server too.
4. With an operator-approved test inbox: email a real saved activity, open it in another browser, recover by email from a third browser, check expiry/forget and confirm no wallet/payment authority is granted.
5. Enable the production flag and redeploy only after that delivery test succeeds. Rollback: set false and redeploy; existing private links remain independent of sending.

## Verification

Contract tests: 19 passed. V2 coverage: 93.18% lines, 60.87% branches; not an independent audit. Standard compile was rerun after coverage before preparing the deployment data.

Disposable PostgreSQL tests passed for lock → email save → open → recovery → list, unknown emails, unrelated-browser isolation, explicitly emailed activity scope and five simultaneous requests capped at three. Mocked email/route checks passed for disabled delivery, non-enumerating responses, HTML escaping, timeout and unchanged caller cookies. No actual email or mainnet transaction was sent.

## Staff activation

An approved venue operator starts the venue's live check-in session in its management console and displays the rotating QR on-site. A visitor scans it, signs in and supplies fresh nearby GPS. This is separate from I'm here presence. A real staff-and-phone trial is still required for each pilot venue; staff should pause the session when the QR is unattended.
