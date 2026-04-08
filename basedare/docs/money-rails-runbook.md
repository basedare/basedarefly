# BaseDare Money Rails Runbook

Updated: 2026-04-09

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

This repo now declares Vercel cron schedules in [`vercel.json`](/Users/mrrobot13/Desktop/basedarestar/basedare/vercel.json):
- payout retry every 10 minutes
- expired refund processing every 30 minutes

If deployment is not on Vercel, mirror the same cadence in Railway, GitHub Actions, or any external scheduler.

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

1. Hit `GET /api/refund/expired` manually and confirm the read-only summary loads.
2. Trigger `POST /api/cron/retry-payouts` with `Authorization: Bearer <CRON_SECRET>` and confirm a success response.
3. Trigger `POST /api/cron/refund-expired` with `Authorization: Bearer <CRON_SECRET>` and confirm a success response.
4. Check Telegram for any `PAYOUT_FAILED`, `REFUND_FAILED`, or `CONTRACT_ERROR` alerts.
5. Verify the Vercel cron jobs appear in the project dashboard after deploy.

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

- `/api/refund/expired` remains the read-only dashboard endpoint for upcoming expiries.
- `/api/cron/refund-expired` is the scheduled processing route.
- Do not turn on new monetization switches until this runbook can be executed cleanly in the target environment.
