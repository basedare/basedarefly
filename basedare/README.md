# BaseDare 🍯⚡️

A decentralized dare and bounty platform on the Base network. Users can create, fund, and claim real-world and digital dares using USDC, verified by community consensus.

## Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, Framer Motion, GSAP
- **Backend & Database**: Next.js App Router API, Prisma, PostgreSQL (Supabase)
- **Web3**: Wagmi, ethers.js, Coinbase OnchainKit, Base Network
- **Storage/Infrastructure**: Pinata (IPFS), Hyperbrowser (Automated Testing)

## Local Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```

3. **Database Sync**
   Ensure your database URL is set, then sync the Prisma schema:
   ```bash
   npx prisma db push
   # or
   npx prisma migrate dev
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Testnet vs Mainnet Notes
- The application is currently configured for local development and testnet (Base Sepolia) usage. 
- Ensure your Wagmi providers in `components/Providers.tsx` are correctly pointing to the desired chain before deploying. 
- Mainnet deployments require updating the `NEXT_PUBLIC_CONTRACT_ADDRESS` to the audited production smart contract.
