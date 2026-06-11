---
type: playbook
status: ACTIVE
created_at: 2026-06-11
updated_at: 2026-06-11
---

# BaseDare Loop Map

Use this when deciding what to do next. BaseDare is not missing more surfaces; it is missing repeated proof that the loop works with real humans.

## Priority Order

1. **Launch smoke loop**
   - Run `npm run smoke`.
   - Result should be PASS/WARN/BLOCKED, with no secret values printed.
   - Fix BLOCKED items before recruiting new people into the app.

2. **Creator onboarding loop**
   - Goal: 10 real creators through `/creators/onboard`.
   - Evidence: real wallets, claimed tags, route-ready passports, follow-up status in the creator tracker.

3. **Venue pilot loop**
   - Goal: one venue willing to fund or seriously review a First Spark.
   - Evidence: warm reply, call booked, pilot budget discussed, objection logged.

4. **Paid proof loop**
   - Goal: one full Base Sepolia loop before mainnet: fund -> show up -> prove -> verify -> payout or refund.
   - Evidence: tx hash, proof record, payout/refund result, recorded screen path.

5. **Receipt loop**
   - Goal: every real completion becomes one proof post or share card.
   - Evidence: real video/image, real amount, real venue, real tx/proof reference.

6. **Reputation loop**
   - Goal: Signal Points reflect proof-gated behavior and rank creators into better opportunities.
   - Evidence: Passport points change only after validated mission/review events.

7. **Spot vault loop**
   - Goal: verified visitors leave useful place signal for the next explorer.
   - Evidence: confirmed check-in, review, report path, aggregate visible on the map.

8. **Safety loop**
   - Goal: no money or IRL action ships without policy, moderation, and operator escape hatches.
   - Evidence: approval rules, blocked unsafe copy, refund/payout path, report handling.

9. **Learning loop**
   - Goal: every conversation improves the GTM memory.
   - Evidence: objection, quote, follow-up, or playbook update in `brain-vault/`.

10. **Expansion loop**
    - Goal: city #2 only after General Luna has repeatable proof.
    - Evidence: repeat venue, active creators, weekly completions, receipts without founder hand-holding.

## Decision Rule

When in doubt, do the smallest action that makes one loop produce evidence. Do not build a new feature because a loop feels empty; fill it with humans first.

## This Week

- Run `npm run smoke`.
- Put 10 real people through `/creators/onboard`.
- Run one Base Sepolia paid proof loop.
- Pitch one venue with First Spark.
- Turn the first completion into a manual receipt.
