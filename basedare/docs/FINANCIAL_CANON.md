# BaseDare Financial Canon

Status: **ACTIVE**
Effective: **2026-07-13**
Executable mirror: `lib/financial-canon.ts`

This is the single source of truth for pricing, settlement splits, revenue recognition, and commercial launch gates. If product copy, a dashboard, a helper, a contract, or another document disagrees with this file, this file wins until it is deliberately amended together with the executable mirror and contract tests.

## 1. Keep the rails separate

BaseDare has two different money rails:

1. **Settlement rail** — the V2 bounty contract escrows a reward and settles a successful dare.
2. **Managed-service rail** — BaseDare invoices a business for scoping, contributor operations, verification, support, and reporting.

The V2 bounty contract must never be used to collect the managed-service fee. Reward funding is not company revenue. The 4% settlement fee is not enough to pay for managed delivery.

## 2. Personal and community-funded dares

Successful V2 settlement:

| Recipient | Split |
| --- | ---: |
| Completer | 96% |
| BaseDare platform wallet | 4% |
| Referrer | 0% |
| Live Pot entitlement | 0% |

The 4% is a **success-only settlement and liquidity fee**. It covers the protocol rail; it does not include mission design, contributor recruitment, managed verification, support, commercial reporting, or buyer service.

Examples:

| Funded reward | Completer receives | BaseDare receives |
| ---: | ---: | ---: |
| $5 | $4.80 | $0.20 |
| $50 | $48.00 | $2.00 |
| $125 | $120.00 | $5.00 |

Personal dares are self-serve. If a user needs managed delivery, the work belongs on the commercial rail and must be priced separately.

## 3. First commercial SKU: Verified Field Sprint

One fixed offer launches first:

| Line item | Amount |
| --- | ---: |
| BaseDare managed-service fee | $2,000 |
| Gross creator reward pool | $500 |
| **Invoice total** | **$2,500** |

Delivery shape:

- one bounded real-world question in one place or compact area;
- four independently routed contributors;
- each contribution is funded at $125 gross;
- each accepted contribution settles $120 to the contributor and $5 to BaseDare;
- expected delivery window is 7–10 days;
- BaseDare scopes the brief, routes contributors, verifies evidence, handles bounded review/support, and returns a timestamped receipt;
- no promise of traffic, conversion, virality, publication, or a positive answer;
- sponsor commercial-reuse rights are not included until explicit contributor consent is captured and legally reviewed.

Unused reward funding is not revenue. It is refunded or credited according to the agreed delivery terms.

There is no automatic scout, referral, or sales commission on the Sprint service fee. Any acquisition commission must be approved explicitly, recorded as a direct acquisition cost, and fit inside the Sprint's delivery-cost ceiling; it must never be inferred from the invoice amount.

Operational launch invariant: the admin must record the managed-service line and confirm the full $500 reward liability separately. A reduced service line requires an explicit design-partner exception. Each of the four contributor missions is then registered separately against one active, non-simulated $125 V2 escrow; an intake cannot register more than four. Database-only campaign funding is not acceptable for a paid Sprint.

## 4. Unit economics at full settlement

| Metric | Amount |
| --- | ---: |
| Invoice cash collected | $2,500 |
| Creator payouts | $480 |
| Settlement revenue | $20 |
| Managed-service revenue | $2,000 |
| **BaseDare revenue** | **$2,020** |
| Direct delivery cost ceiling, excluding creator pass-through | $650 |
| **Contribution profit target** | **$1,370** |
| **Contribution margin target** | **67.82%** |
| Founder/operator delivery-time cap | 10 hours |

If the Sprint cannot stay below the cost or time ceiling, do not hide the overrun inside the creator pool. Reduce scope, improve the process, or raise the price.

## 5. Design-partner exception

Sprint #1 may waive some or all of the $2,000 service fee only when:

- the exception is explicitly recorded as design-partner acquisition cost;
- the $500 reward pool remains fully funded;
- the buyer agrees to a case-study receipt without invented results;
- delivery cost, review time, rejection rate, fraud, and disputes are measured;
- the exception is not shown as normal market pricing.

Sprint #2 is the first paid test and must charge the canonical price unless this canon is amended from measured evidence.

## 6. Parked self-serve business rail

A future automated business mission may use a **25% all-in platform charge**, consisting of:

- 4% settlement/liquidity fee; and
- 21% product, verification, and reporting fee.

This rail is **PARKED**. Do not sell, display, forecast, or collect it until mission setup, routing, review, reporting, refunds, and customer support are sufficiently automated and tested. It is not the current managed-service price.

## 7. Revenue recognition vocabulary

- **Funded GMV:** all reward value placed into escrow.
- **Realized settled GMV:** reward value successfully settled.
- **Creator payout:** the 96% sent to completers; never company revenue.
- **Settlement revenue:** the 4% sent to the BaseDare platform wallet after success.
- **Managed-service revenue:** the $2,000 Sprint service line after the applicable accounting conditions are met.
- **Reward liability/pass-through:** the $500 creator pool until settled or refunded; never service revenue.
- **Refunded or credited funds:** not revenue.
- **Treasury-funded rewards and grants:** financing or program funding, not customer PMF and not settlement revenue.

Dashboards and investor materials must use these terms consistently.

## 8. Not live and not promised

The following are hypotheses, not current products:

- venue subscriptions;
- boosted placement or priority-claim fees;
- Live Pot funding from the V2 settlement fee;
- referral or scout settlement payouts;
- recurring City Signal subscriptions;
- data licensing, API, or white-label pricing;
- token value or token-based revenue;
- guaranteed foot traffic, purchases, or commercial outcomes.

## 9. V2 release gate

Do not deploy or cut production over to V2 until all of these are true:

1. contract and app tests prove 96/4/0 and no Live Pot entitlement;
2. all public fee copy says 4%, not 10%, 19%, 25–35% rake, 89%, or 1% referral;
3. managed buyer creation is invoice-first and cannot create a partially funded campaign from the public portal;
4. internal campaign registration stores reward funding separately from service revenue and uses zero additional campaign rake for the managed Sprint;
5. the required proof-ledger and payout-lease migrations are deployed before the corresponding code;
6. cold-wallet claim, trusted media, proximity, review, payout, refund, appeal, and idempotency paths pass production-like smoke tests;
7. a human operator verifies mainnet bytecode, USDC, platform wallet, referee separation, and runtime environment;
8. sponsor commercial-reuse consent receives human legal review before any such right is sold.

This canon locks the economics. It does not authorize a mainnet deployment or a customer invoice by itself.
