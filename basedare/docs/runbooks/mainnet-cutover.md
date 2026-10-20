# BaseDare Base Mainnet Cutover

Updated: 2026-10-20

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

1. Confirm `docs/FINANCIAL_CANON.md`, `lib/financial-canon.ts`, contract tests,
   creator copy, and dashboard definitions all agree on `96 / 4 / 0` with no
   Live Pot entitlement.
2. Confirm managed invoice work remains separate from reward escrow and cannot launch a partially funded paid campaign.
3. Confirm the required proof-attempt and payout-lease migrations have a reviewed
   deploy order. Migrations deploy before code.
4. Confirm a dedicated referee wallet separate from both deployer/owner and platform treasury; keep only its public address in the plan.
5. Review the deployer balance against the script’s 0.005 ETH operational reserve. This is a reserve requirement, not the deployment fee estimate.
6. Run the public preflight:

```bash
MAINNET_DEPLOYER_ADDRESS=0xOWNER_ADDRESS \
MAINNET_PLATFORM_WALLET=0x60952546f6C6F092CA4866fC7cf6bf12269D002f \
SIMULATE_BOUNTIES=false NEXT_PUBLIC_SIMULATE_BOUNTIES=false \
MAINNET_REFEREE_ADDRESS=0xFRESH_REFEREE_ADDRESS npm run mainnet:preflight
```

This command checks public config, role separation, Base mainnet USDC, the known
Sepolia V2 address, and whether any supplied `MAINNET_BOUNTY_ADDRESS` has
mainnet bytecode. All three intended public roles must be explicit; the referee
must differ from owner and treasury. Missing/invalid simulation flags and failed
mainnet RPC checks block the report. Inline flags describe this command's local
inputs only; they do not establish that production runtime flags are correct.
Signing credentials are deliberately not tested or inspected here.

The read-only transport has a ten-second request deadline, rejects redirects and
non-read RPC methods, redacts provider errors and closes its connections on exit.
If this machine's automatic/IPv6 RPC connection stalls, prefix the **read-only**
commands with `MAINNET_RPC_IP_FAMILY=4`. Leave it unset for automatic selection.
This does not change the human deployment transport, runtime networking or TLS
verification. A failed request is a blocker, not a clean readiness result.

On the audited Mac, Hardhat's automatic connection also stalled. A keyless
`eth_chainId` read through the actual Hardhat mainnet provider succeeded with
`NODE_OPTIONS='--dns-result-order=ipv4first --no-network-family-autoselection'`.
If that problem occurs on the signing machine, add those Node flags for that
local invocation (preserving any existing required Node options). Recheck the
chain through Hardhat before the human deploy; do not disable TLS or assume
`MAINNET_RPC_IP_FAMILY` also configures Hardhat. Neither connection check signs
or broadcasts a transaction.

## Read-only deployment plan

Compile standard artifacts after running coverage, then inspect the unsigned plan:

```bash
MAINNET_DEPLOYER_ADDRESS=0xOWNER_ADDRESS \
MAINNET_PLATFORM_WALLET=0x60952546f6C6F092CA4866fC7cf6bf12269D002f \
MAINNET_REFEREE_ADDRESS=0xREFEREE_ADDRESS \
npm run mainnet:prepare
```

This needs only public addresses and an RPC. It checks Base mainnet and canonical USDC, estimates deployment gas, and prints deployment-data hashes and a nonce-dependent predicted address. The plan records its timestamp, observed block and the deployer's shortfall against the unchanged 0.005 ETH reserve. A successfully generated plan is not deploy permission or a launch-ready result. The L2 fee estimate excludes Base L1 data fees and referee setup. A predicted address is **not a deployed contract**. Confirm roles before signing; keep ownership recoverable and referee privileges separate.

For local regression checks, compile standard artifacts first, then run
`npm run test:mainnet-readiness`. Contracts CI runs these checks after compilation
and before coverage instrumentation.

## Human-Signed Deploy

Only the human operator runs this command because it signs a real Base mainnet
transaction and deploys a contract that can custody real USDC. Set `MAINNET_DEPLOYER_ADDRESS` and securely supply a matching `DEPLOYER_PRIVATE_KEY`; mainnet no longer falls back to a referee key. Never paste private keys into chat or commit them.

If deployment succeeds but referee setup fails, keep the printed contract address and transaction hash. Do not blindly rerun deployment: the owner must finish referee setup on that existing contract, then rerun all post-deploy checks.

```bash
MAINNET_DEPLOYER_ADDRESS=0xOWNER_ADDRESS \
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
MAINNET_DEPLOYER_ADDRESS=0xOWNER_ADDRESS \
MAINNET_PLATFORM_WALLET=0x60952546f6C6F092CA4866fC7cf6bf12269D002f \
MAINNET_BOUNTY_ADDRESS=0xDEPLOYED_BOUNTY_ADDRESS \
SIMULATE_BOUNTIES=false NEXT_PUBLIC_SIMULATE_BOUNTIES=false \
MAINNET_REFEREE_ADDRESS=0xFRESH_REFEREE_ADDRESS \
npm run mainnet:preflight -- --post-deploy
```

Expected checks:

- bounty bytecode exists on Base mainnet
- `owner()` matches the explicitly intended owner (`MAINNET_DEPLOYER_ADDRESS`)
- bounty `USDC()` is `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- `PLATFORM_WALLET()` is the selected platform wallet
- `AI_REFEREE_ADDRESS()` is the fresh referee address
- fee metadata is `platform=4`, `referral=0`, `total=4`

`--post-deploy` blocks if no deployed bounty address was supplied. A preparation
report without a deployed address is never evidence of working escrow. These
public reads do not prove runtime secrets, wallet recovery or actual settlement.

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

Do not use the mainnet smoke to collect a managed-service fee. It tests only the
V2 reward escrow and its 4% successful-settlement fee.
