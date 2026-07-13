# BaseDare Financial Model

The authoritative pricing and split definitions live in [`docs/FINANCIAL_CANON.md`](./FINANCIAL_CANON.md). This document contains only planning math derived from that canon.

## Consumer settlement

For successful personal/self-serve dares:

`settlement revenue = realized settled GMV × 4%`

Consumer settlement is a useful liquidity and growth rail, but it is financially thin if moderation is manual.

| Monthly settlement revenue target | Required realized settled GMV |
| ---: | ---: |
| $5,000 | $125,000 |
| $25,000 | $625,000 |
| $50,000 | $1,250,000 |

Funded GMV is not settled GMV. Refunds, failures, creator payouts, treasury rewards, and reward liabilities are not company revenue.

## Managed Sprint economics

Canonical paid Sprint:

- invoice: $2,500;
- managed-service revenue: $2,000;
- creator reward pool: $500;
- settlement revenue at four successful $125 rewards: $20;
- total BaseDare revenue at full settlement: $2,020;
- direct delivery cost ceiling: $650, excluding the creator pass-through;
- contribution profit target: $1,370;
- contribution margin target: 67.82%;
- delivery-time ceiling: 10 operator hours.

| Monthly paid Sprints | Invoiced cash | BaseDare revenue at full settlement | Target contribution profit |
| ---: | ---: | ---: | ---: |
| 1 | $2,500 | $2,020 | $1,370 |
| 5 | $12,500 | $10,100 | $6,850 |
| 10 | $25,000 | $20,200 | $13,700 |
| 20 | $50,000 | $40,400 | $27,400 |

This is planning math, not a forecast. Sales cost, taxes, payment processing, chargebacks, legal work, and general overhead remain outside the direct-delivery ceiling unless explicitly assigned there.

## Operating gates

Track per Sprint:

- invoice cash received and payment date;
- reward pool funded, settled, unused, refunded, or credited;
- accepted and rejected contributions;
- verification and support minutes;
- direct delivery cost;
- contribution profit and margin;
- time to first accepted result and final receipt;
- buyer repeat or referral action;
- place records, contributor reputation, templates, and refresh demand created.

Do not add venue subscription, campaign-rake, referral, Live Pot, or enterprise revenue to the base case until that product is both live and paid for by a real external buyer.
