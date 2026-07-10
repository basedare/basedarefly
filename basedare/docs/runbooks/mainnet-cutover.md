# BaseDare Base Mainnet Cutover

Updated: 2026-07-10

This runbook is for moving the bounty escrow from Base Sepolia to Base mainnet.
The web app can be live while the money rails remain on testnet; do not treat a
production Vercel deploy as proof that the escrow exists on mainnet.

## Current Ground Truth

- `BaseDareBountyV2` at `0xF176ec205e5E5777F6B5964bfeD6DE5a57a911E3` has bytecode on Base Sepolia.
- The same address has no bytecode on Base mainnet.
- GitHub Actions smoke variables are intentionally pinned to Sepolia until a real mainnet V2 address exists.
- `scripts/deploy_mainnet_v2.js` is the canonical deploy path. Do not use the older `scripts/deploy_mainnet.js` for V2 cutover.

## Roles

- Platform fee wallet: receives the 4% platform fee. Current candidate:
  `0x60952546f6C6F092CA4866fC7cf6bf12269D002f`.
- Referee wallet: signs `verifyAndPayout` and `refundBacker`. Use a fresh,
  dedicated hot wallet with low ETH balance. Its private key belongs only in the
  server runtime environment, never in GitHub Actions.
- Deployer wallet: signs the one-time deployment transaction and pays Base
  mainnet ETH gas.

The platform wallet and referee address must be different.

## Pre-Deploy

1. Create the fresh referee wallet and keep only its public address handy.
2. Fund the deployer with Base mainnet ETH for gas.
3. Run the public preflight:

```bash
MAINNET_REFEREE_ADDRESS=0xFRESH_REFEREE_ADDRESS npm run mainnet:preflight
```

This command checks public config, role separation, Base mainnet USDC, the known
Sepolia V2 address, and whether any supplied `MAINNET_BOUNTY_ADDRESS` has
mainnet bytecode. It does not print or inspect private key values.

## Human-Signed Deploy

Only the human operator runs this command because it signs a real Base mainnet
transaction and deploys a contract that can custody real USDC.

```bash
MAINNET_PLATFORM_WALLET=0x60952546f6C6F092CA4866fC7cf6bf12269D002f \
MAINNET_REFEREE_ADDRESS=0xFRESH_REFEREE_ADDRESS \
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
npm run mainnet:deploy:v2
```

The inline `NEXT_PUBLIC_USDC_ADDRESS` is intentional. Local `.env.local` can
stay Sepolia-oriented until the deployed mainnet address exists; the deploy
script still hardcodes Circle's Base mainnet USDC into the constructor.

The script prints the deployed `NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS` block after
success.

## Post-Deploy Verification

After the deployment prints the new contract address:

```bash
MAINNET_BOUNTY_ADDRESS=0xDEPLOYED_BOUNTY_ADDRESS \
MAINNET_REFEREE_ADDRESS=0xFRESH_REFEREE_ADDRESS \
npm run mainnet:preflight
```

Expected checks:

- bounty bytecode exists on Base mainnet
- bounty `USDC()` is `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- `PLATFORM_WALLET()` is the selected platform wallet
- `AI_REFEREE_ADDRESS()` is the fresh referee address
- fee metadata is `platform=4`, `referral=0`, `total=4`

## Runtime Cutover

Set Vercel production env:

```bash
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS=0xDEPLOYED_BOUNTY_ADDRESS
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS=0x60952546f6C6F092CA4866fC7cf6bf12269D002f
SIMULATE_BOUNTIES=false
NEXT_PUBLIC_SIMULATE_BOUNTIES=false
```

The server must also have the fresh referee private key under
`REFEREE_HOT_WALLET_PRIVATE_KEY` or `REFEREE_PRIVATE_KEY`. Do not put this key in
GitHub Actions.

Set GitHub Actions variables after Vercel is cut over:

```bash
gh variable set NEXT_PUBLIC_NETWORK --body mainnet
gh variable set NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS --body 0xDEPLOYED_BOUNTY_ADDRESS
gh variable set NEXT_PUBLIC_USDC_ADDRESS --body 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
gh variable set NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS --body 0x60952546f6C6F092CA4866fC7cf6bf12269D002f
gh variable set REFEREE_HOT_WALLET_ADDRESS --body 0xFRESH_REFEREE_ADDRESS
gh variable set SIMULATE_BOUNTIES --body false
gh variable set NEXT_PUBLIC_SIMULATE_BOUNTIES --body false
```

## First Mainnet Smoke

1. Redeploy the app after Vercel env is changed.
2. Run the launch smoke against production.
3. Connect a wallet and approve the smallest useful amount of mainnet USDC.
4. Fund one tiny dare.
5. Confirm the DB leaves `FUNDING` and records `onChainDareId`.
6. Only then test proof, payout, or refund.

Keep the first live amount intentionally small. The goal is to prove the whole
settlement loop, not to make the first transaction impressive.
