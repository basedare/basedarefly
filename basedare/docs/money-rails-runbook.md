# BaseDare Money Rails Runbook

Updated: 2026-04-25

## Purpose

This runbook covers the operational minimum for BaseDare's real-money settlement layer:
- proof verification payout retries
- expired claim refunds
- cron auth
- hot wallet safety
- smoke checks after deploy

Related routes:
- [`/api/cron/retry-payouts`](/Users/mrrobot13/Desktop/basedarestar/basedare/app/api/cron/retry-payouts/route.ts)
- [`/api/cron/refund-expired`](/Users/mrrobot13/Desktop/basedarestar/basedare/app/api/cron/refund-expired/route.ts)
- [`/api/refund/expired`](/Users/mrrobot13/Desktop/basedarestar/basedare/app/api/refund/expired/route.ts)

## Required Environment Variables

Minimum production env:
- `NEXT_PUBLIC_NETWORK`
- `NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_USDC_ADDRESS`
- `NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS`
- `REFEREE_HOT_WALLET_PRIVATE_KEY`
- `CRON_SECRET`
- `INTERNAL_API_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`
- `NEXT_PUBLIC_APP_URL`

Recommended fallback-only env:
- `REFEREE_PRIVATE_KEY`

## Scheduler

BaseDare uses two scheduler layers:

Primary scheduler:
- GitHub Actions workflow [`ops-crons.yml`](/Users/mrrobot13/Desktop/basedarestar/basedare/.github/workflows/ops-crons.yml)
- payout retry every 15 minutes
- expired refund processing hourly
- venue report lead nudges hourly

Backup scheduler:
- Vercel Hobby cron declarations in [`vercel.json`](/Users/mrrobot13/Desktop/basedarestar/basedare/vercel.json)
- payout retry once per day
- expired refund processing once per day
- venue report lead nudges once per day

Vercel Hobby only supports daily cron cadence. Treat Vercel cron as the safety net, not the primary money-loop runner.

Required GitHub Actions secrets:
- `BASEDARE_CRON_SECRET`: must match production `CRON_SECRET`
- `BASEDARE_APP_URL`: optional, defaults to `https://basedare.xyz`

The workflow can also be run manually with `workflow_dispatch` for `all`, `retry-payouts`, `refund-expired`, or `venue-report-leads`.

## Fail-Closed Expectations

- If `CRON_SECRET` is missing, cron routes reject requests.
- If the referee hot wallet is missing, on-chain settlement routes fail closed.
- If Telegram env vars are missing, alerts degrade to server logs only.

## Pre-Deploy Checks

1. Confirm `SIMULATE_BOUNTIES` is intentional for the target environment.
2. Confirm `NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS` points at the intended network.
3. Confirm the referee wallet is distinct from the platform wallet.
4. Confirm the referee wallet has enough ETH for gas but stays under the configured balance cap.
5. Confirm `CRON_SECRET` is set in the deployment environment before cron goes live.
6. Confirm Telegram admin alerts are working.

## Post-Deploy Smoke Checks

1. Run `npm run safety:endpoints` and confirm all unauthenticated protected routes return 401/403/503.
2. Run `BASEDARE_ADMIN_SECRET=<secret> npm run safety:production` and confirm there are no blockers.
3. Run `BASEDARE_CRON_SECRET=<secret> npm run safety:endpoints` and confirm the authenticated cron smoke passes.
4. Trigger the GitHub Actions `Ops Cron Dispatcher` workflow manually for `all`.
5. Check Telegram for any `PAYOUT_FAILED`, `REFUND_FAILED`, or `CONTRACT_ERROR` alerts.
6. Verify the Vercel cron jobs remain visible as daily backup jobs in the project dashboard.

## Rollback Triggers

Rollback or pause cron if:
- retry jobs begin failing repeatedly across multiple dares
- refund jobs mark unexpected dares as refunded
- the referee wallet balance cap alert fires repeatedly
- contract address or network config is wrong
- Telegram fills with settlement failures immediately after deploy

## Manual Recovery

If payout retries are failing:
- inspect the dare's `onChainDareId`, `status`, and `txHash`
- inspect BaseScan for payout or refund settlement events
- confirm the contract address and network env
- confirm the referee hot wallet has gas

If expired refunds are failing:
- inspect `claimDeadline`, `status`, and `onChainDareId`
- confirm whether the dare is simulated or live
- inspect on-chain settlement events before retrying

## Notes

- `/api/refund/expired` is cron-secret protected because it exposes ops queue metadata.
- `/api/cron/refund-expired` is the scheduled processing route.
- Do not turn on new monetization switches until this runbook can be executed cleanly in the target environment.
