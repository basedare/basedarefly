# BaseDare Architecture

## High-Level Overview

BaseDare is a decentralized dare/bounty platform running on the Base network. The application architecture is split between a Next.js frontend, a Prisma-backed PostgreSQL database, and smart contracts deployed on Base.

### 1. Dare Creation Flow
1. **Frontend**: User fills out the dare creation form (`app/create/page.tsx`).
2. **Blockchain**: User connects their wallet via Wagmi and calls the `createBounty` function on the `BaseDareBounty` smart contract, depositing USDC.
3. **Backend API**: Upon a successful transaction, the frontend sends the transaction hash and details to the backend `/api/bounties/create` route.
4. **Database**: Prisma creates a new `Dare` record with `status="PENDING"`, linking the on-chain ID and the target streamer's handle.

### 2. Proof Upload Flow
1. **Frontend**: The targeted streamer (or anyone for an open bounty) visits the dare page (`app/dare/[shortId]/page.tsx`) and uploads a video/image proof via the UI.
2. **Backend API**: The file is sent to `/api/upload/route.ts`.
3. **Decentralized Storage (IPFS)**: The backend securely uploads the file to IPFS via Pinata.
4. **Database Sync**: The resulting IPFS CID (`proofCid`) and Gateway URL are saved to the `Dare` record. The status is updated to `PENDING_REVIEW` to trigger community voting.

### 3. Community Verification Flow (TruthOracle)
1. **Frontend**: The community views the proof on the `verify` page.
2. **Voting**: Users cast "Approve" or "Reject" votes.
3. **Backend**: Votes are tallied and stored in Prisma.
4. **Consensus**: Once a vote threshold is met, the dare status changes to `VERIFIED` or `FAILED`.

### 4. Escrow & Payout Setup (Pending)
1. **Backend**: An admin/referee wallet script or API route (`api/bounties/settle`) listens for verified dares.
2. **Blockchain**: The referee triggers the `releaseBounty()` or `refundBounty()` function on the smart contract, distributing the staked USDC to the appropriate party.
