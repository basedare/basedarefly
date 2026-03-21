# BaseDare Financial Model

## Purpose

Translate BaseDare's revenue architecture into a practical set of assumptions, formulas, breakeven thresholds, and scenario models.

This is not accounting advice.
It is an operating model for decision-making.

## Important Rule

Do not confuse these:

- funded GMV
- realized settled GMV
- creator payout
- company revenue
- community treasury or live pot
- refunded volume

The company only survives on company revenue.

## Current Economics Reality

### Implemented consumer contract model

Current live contract logic:
- creator payout: 89%
- platform fee: 10%
- referral fee: 1%

This means consumer company revenue is currently modeled as:

`consumer revenue = funded consumer GMV × success rate × 10%`

### Strategic helper model

Separate helper logic in the codebase also models:
- P2P: 5% company, 5% live pot
- B2B: 19% company, 10% live pot, 1% scout

This means the company still needs to unify:
- actual contract economics
- future strategic economics
- dashboard reporting definitions

## Core Assumptions

These are working assumptions, not truths.

### Consumer assumptions

- average funded dare: $50
- completion rate: 25% to 60%
- company take on successful payouts: 10% in current contract model

### B2B assumptions

- average campaign size: $10,000 to $50,000
- company take: 19% in the modeled B2B split
- campaign setup fees can add $500 to $5,000

### Venue assumptions

- venue subscription: $99 to $299 per month
- activation package: $500 to $3,000+
- venue revenue starts only after BaseDare proves real check-in and traffic utility

### Burn assumptions

Use two planning bands:

1. lean team burn: $25,000 per month
2. growth team burn: $50,000 per month

## Consumer Breakeven Math

Formula:

`required funded GMV = target monthly revenue / (completion rate × company take)`

### At $25,000 monthly revenue target

| Completion rate | 10% company take | 5% company take |
| --- | ---: | ---: |
| 25% | $1,000,000 | $2,000,000 |
| 40% | $625,000 | $1,250,000 |
| 60% | $416,667 | $833,333 |

### What this means

Consumer-only can work only if BaseDare gets:
- very large funded volume
- strong completion rates
- low manual ops cost

That makes consumer a weak standalone business and a strong acquisition engine.

## B2B Breakeven Math

Formula:

`required B2B GMV = target monthly revenue / company take`

### At 19% company take

| Monthly revenue target | Required settled B2B GMV |
| --- | ---: |
| $25,000 | $131,579 |
| $50,000 | $263,158 |
| $83,333 (~$1M ARR pace) | $438,595 |

### Campaign count equivalents

For a $25,000 monthly revenue target:

| Average campaign size | Required campaigns / month |
| --- | ---: |
| $10,000 | 14 |
| $25,000 | 6 |
| $50,000 | 3 |

This is much more realistic than consumer-only.

## Venue Revenue Math

### Subscription-only

| Price per venue / month | Venues needed for $25k MRR |
| --- | ---: |
| $99 | 253 |
| $149 | 168 |
| $299 | 84 |

### Activation add-on logic

If BaseDare also sells venue activations:
- 10 venues at $1,000 per activation = $10,000 one-off revenue
- 20 venues at $1,500 per activation = $30,000 one-off revenue

This means venues become more attractive when subscriptions and activations are sold together.

## Hybrid Model Scenarios

## Scenario A: Lean but real

- consumer funded GMV: $150,000
- consumer completion rate: 35%
- consumer company take: 10%
- B2B GMV: $100,000
- B2B company take: 19%
- venue subscriptions: 40 venues at $149

Revenue:
- consumer: $5,250
- B2B: $19,000
- venues: $5,960

Total monthly revenue:
- $30,210

Interpretation:
- supports a lean team if ops remain controlled

## Scenario B: Strong hybrid

- consumer funded GMV: $400,000
- consumer completion rate: 40%
- consumer company take: 10%
- B2B GMV: $200,000
- B2B company take: 19%
- venue subscriptions: 100 venues at $149
- venue activations: 10 at $2,000

Revenue:
- consumer: $16,000
- B2B: $38,000
- subscriptions: $14,900
- activations: $20,000

Total monthly revenue:
- $88,900

Interpretation:
- this is the shape of a serious venture-scale business

## Scenario C: Consumer-only trap

- consumer funded GMV: $200,000
- completion rate: 30%
- company take: 10%

Revenue:
- $6,000 per month

Interpretation:
- culturally active
- financially weak
- not enough by itself

## Cost Risks

### 1. Manual moderation

The more high-value or disputed dares require manual review:
- the worse consumer margins get
- the harder it is to scale small bounties

### 2. Creator and venue acquisition

If BaseDare needs paid acquisition early:
- consumer economics get ugly quickly
- venue sales becomes human-heavy

### 3. Refund-heavy demand

If lots of dares are created but few resolve successfully:
- GMV can look healthy while revenue stays thin

### 4. Economic inconsistency

If contract fees, helper fees, and dashboard logic disagree:
- pricing becomes hard to explain
- forecasting becomes unreliable

## KPIs That Actually Matter

Track these weekly:

### Consumer
- funded GMV
- realized settled GMV
- completion rate
- average successful bounty
- company revenue per successful dare

### Campaigns
- average campaign size
- setup fee revenue
- company rake revenue
- gross margin per campaign
- repeat campaign rate

### Venues
- active paid venues
- check-ins per venue
- activation revenue per venue
- venue retention
- repeat venue usage

## Recommended Financial Strategy

1. Keep consumer as the growth engine.
2. Make B2B the primary cash engine.
3. Make venues the recurring local revenue engine.
4. Treat protocol and API revenue as the long-term scale engine.
5. Unify the fee model before building advanced dashboards or investor reporting.

## Bottom Line

BaseDare is financially feasible if:
- B2B campaigns become real
- venue monetization follows proof of utility
- consumer demand feeds the system without being expected to carry the whole business

BaseDare is not attractive if:
- it relies mainly on low-value consumer dares
- it counts treasury flows as revenue
- it lets manual review cost eat the margin
