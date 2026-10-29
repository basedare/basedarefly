# Pay Like a Local — audit, handoff and pilot gate

29 October 2026. This is an incremental continuation of `philippines-payments-decision-2026-10-09.md`, not an embedded payment launch.

## Existing rails and changes

WalletOverview already reads configured-chain native USDC and ETH independently of reward/escrow/credit ledgers. Keep these balances separate. Its new guide entry opens `/pay-local`, accessible to guests and describing the external app, merchant QR, actual quote, receipt, failure and refund boundaries.

The existing owner-managed Yodl pilot uses Venue metadata and FounderEvent records; no schema or stored-value ledger added. A public venue listing now requires merchant permission, a recent successful merchant QR/independent PHP receipt, and the exact tested network, asset and QR Ph merchant method. Existing legacy pilot metadata without those details becomes unavailable until the owner rechecks it. This is a deliberate evidence upgrade, not a claim that any current venue failed or succeeded. Disabled/incomplete pilots can still be switched off.

The visitor sees the operator-reported test date and exact asset/network/method, the external Yodl app link, and a clear statement that this does not spend their BaseDare wallet automatically. Loading and failed reads are distinct from unavailable; reads have an 8-second deadline and stale responses cannot overwrite a new venue/session. The API returns only public test facts, not private receipt references.

Manual purchase records now include exact network/method, provider confirmation reference, independent PHP receipt and fee/FX notes. Merchant-confirmed records require the provider reference plus PHP received and receipt; failed zero-spend attempts remain recordable with participant consent. Current pilot rails and owner are rechecked under a venue lock before insertion. Record-ID idempotency remains. No row triggers cash, escrow, conversion, revenue, rewards or verified purchase attribution. Historical rows are preserved.

## Current primary-source check

- [Yodl countries](https://docs.yodl.me/supported-countries): PH lists GCash, Maya merchant and QR Ph with one live processor. General aggregation does not prove local failover. Its non-KYC claims are provider product statements, not our approved exemptions or guaranteed traveller eligibility.
- [Yodl pricing](https://docs.yodl.me/pricing): all-in quote combines processor, fixed/minimum, FX, protocol, wallet convenience and gas terms. Published 0.10% protocol fee is currently waived; a wallet convenience fee has a 30% share to Yodl. Neither is BaseDare's contracted margin. Do not hardcode FX, free gas, a fixed total fee or refund currency.
- [Yodl SDK index](https://docs.yodl.me/llms.txt), [signup](https://docs.yodl.me/sdk/react-native/signup), [backend onboarding](https://docs.yodl.me/integrations/onboarding): current documented packaged frontend is React Native/hosted UI with an EIP-1193 wallet bridge. A drop-in Next.js integration and permission to embed in our exact model were not established. Do not transplant native WebView code into this site or switch our identity provider just because Yodl uses an embedded wallet.
- [Yodl terms](https://yodl.me/terms-of-service): exact PH acquiring/conversion/settlement contracting entity, licence chain and responsibility require written confirmation. A technology provider's marketing page is not sufficient.
- [AEON tokens/networks](https://aeon-xyz.readme.io/docs/supported-token-list-1): decentralized-partner **Native API** specifically lists USDC on Base. Its DApp and hosted cashier lists differ; this does not prove that hosted USDC on Base works or that a BaseDare contract is approved. [Coverage](https://aeon-xyz.readme.io/docs/geographies-coverage) and [limits](https://aeon-xyz.readme.io/docs/transaction-limits) need confirmation for our actual integration and eligible tourists.
- [Coins business](https://www.coins.ph/en-ph/business): separately lists QR Ph/WebPay collection, bank/e-wallet disbursement and on/off ramp; enterprise KYB, product-specific endpoints and commercial agreement apply. Retail scan-to-pay is not automatically exposed to third-party apps.
- [PDAX ScholarPay](https://scholarpay.pdax.ph/): payout diligence candidate, not a confirmed QR merchant-checkout or approved Base-USDC creator-payout integration.

The earlier decision records public BSP directory evidence. This check does not independently certify every provider's present licence or confirm BaseDare's contracting eligibility. Obtain the actual entity/licence and written scope before embedded production payments or payout promises.

## Recommendation and decision gate

Continue the explicit **external Yodl handoff** for a tiny permitted merchant pilot. Compare a written Yodl quote with AEON Native API; evaluate Coins.ph and PDAX separately for approved PHP creator/business disbursement. Do not build speculative adapters or take custody now. No processor/provider is activated by this release.

Ask providers for foreign-passport/country eligibility, exact chain/token contracts, QR merchant vs personal-transfer support, quote/expiry, all-in pricing, callback signatures/retries, idempotency, merchant finality, duplicate-charge procedure, refund currency/timing, support/SLA, reconciliation export, data handling and their exact contracting/legal entity chain. Confirm web support and any integration/convenience fee in writing. No outreach sent.

## Gados or another first merchant: manual permissioned protocol

No Gados partnership or payment acceptance is claimed. Founder first obtains merchant permission and actual provider eligibility. Customer, not agent, initiates a small purchase in the external app after checking the real merchant QR, token/network, total stablecoins, fees/FX and PHP amount. Record provider outcome/reference separately from the merchant's independently confirmed PHP receipt. A pending callback does not count as paid; inspect history before retrying. Record rejection, cancellation, unsupported/personal QR, timeout and refund follow-up honestly. Do not activate the public venue option before a recent successful test and permission are recorded. This work performs no live payment or configuration update.

## Future PHP payouts

Require a separate approved enterprise disbursement contract, correct beneficiary/KYC checks, exact Base-USDC funding and conversion route, locked quote, fees/limits, signed callbacks, idempotent payment intent, beneficiary confirmation, reconciliation and refund/support ownership. Consumer merchant checkout support is not authority to send task rewards to arbitrary GCash or bank beneficiaries. The existing human-signed escrow launch and tiny payout/refund rehearsal remain separate blockers.

## Rollback

Revert UI/API/schema-validator changes together if owner management or records fail. Keep existing Venue metadata and FounderEvent rows; no migration or financial rollback. Never relax permission/evidence checks or mark a pending record successful to get a listing back.
