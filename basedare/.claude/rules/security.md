# .claude/rules/security.md

## Fortress Security Rules - Mandatory for All Code Generation

- **Contract Standards**: Use **OpenZeppelin 5.0** exclusively (latest as of 2026). Import explicitly for security features.
- **Math & Reentrancy**: Solidity 0.8+ checked math (no `unchecked` unless audited). **Mandatory nonReentrant** guards on all functions with USDC/$BARE transfers or external calls.
- **Zero-Trust Basics**: Never use `eval()`. Never print .env contents, private keys, or secrets to terminal/console/logs.
- **Validation**: **Mandatory Zod** schema validation for EVERY request in `app/api/`. Sanitize user input (XSS prevention) in dare titles/descriptions.

## Private Keys & Env Vars

- **REFEREE_PRIVATE_KEY**, **BASE44_API_KEY**, **DEPLOYER_PRIVATE_KEY**: Server-side only. Never expose to client. Never import from `lib/contracts.ts` (contains `getWalletClient`) in client components.
- Public vars: Prefix with `NEXT_PUBLIC_*`. Private: No prefix.
- Use `"use client"` awareness — client imports run on client.

## Contract-Specific Security

- Always validate `msg.sender` in modifiers.
- Use `onlyReferee` for payout/refund/verify functions.
- USDC transfers: Require prior `approve()` — never assume allowance.
- Check `bounty.isVerified` before processing to prevent double-spend.
- Always `try/catch` around contract writes, set reasonable gas limits, handle revert reasons gracefully in UI.
- Verify contract addresses with checksums before deployment.

## API & Frontend Security

- Validate all input params before contract calls.
- Never trust client-provided addresses without `viem.isAddress()` verification.
- Rate limit sensitive endpoints (`/api/verify-proof`, `/api/dares/create-onchain`).
- Log payout transactions for audit trail.
- No sensitive data in localStorage.
- HTTPS-only for external API calls.

## General Best Practices

- Use `nonReentrant` on any state-changing function.
- Conduct gas optimization + Slither checks before finalizing Solidity.
- Pair with external tools (e.g., Semgrep pre-commit) for SAST.

Follow these rules strictly — alert immediately if any violation detected.