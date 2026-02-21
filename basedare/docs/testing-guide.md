# Testing Guide

## Local Development Setup

To test the full end-to-end functionality locally without deploying to mainnet, follow these steps:

### 1. Database & Environment
Ensure you have a local PostgreSQL instance or Supabase connection string.
- Run `npx prisma db push` or `npx prisma migrate dev` to sync your schema.
- Create a `.env.local` file using `.env.example` as a template.

### 2. Wallet & Contract Testing
- **Testnet**: Use the Base Sepolia testnet.
- **Wagmi Config**: Ensure `wagmi.ts` is configured to include `baseSepolia`.
- **Faucet**: Get test USDC and test ETH from a Base Sepolia faucet to fund your test wallets.
- **Mocking**: If you want to test the UI without submitting actual transactions, temporarily mock the `writeContract` calls in your frontend components and directly call your local API routes (`/api/bounties/create`).

### 3. IPFS / Proof Upload Testing
- The `/api/upload` route uses Pinata SDK.
- To test uploads locally, ensure `PINATA_JWT` is set in your `.env.local`.
- Create a mock `Dare` in the database via Prisma Studio (`npx prisma studio`).
- Navigate to the dare's detail page `http://localhost:3000/dare/[shortId]` with a connected wallet.
- Use the file upload component, and verify the file appears on your Pinata dashboard and the `proofCid` updates in Prisma Studio.

### 4. Headless Automated Testing
- Use the provided `utils/hyperbrowser.ts` script.
- Ensure `HYPERBROWSER_API_KEY` is set.
- Run node scripts (e.g., wallet connection simulations) headless to test specific application flows programmatically.
