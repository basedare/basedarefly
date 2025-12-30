# Backend Setup Guide

## Overview

The backend API is built using Next.js API Routes and integrates with:
- **Base44 SDK** for entity management and file uploads
- **Viem** for blockchain interactions
- **Base Protocol** smart contracts for on-chain dare management

## Project Structure

```
basedare/
├── app/api/              # API routes
│   ├── dares/           # Dare CRUD operations
│   │   ├── route.ts              # GET (list), POST (create)
│   │   ├── [id]/route.ts         # GET, PUT, DELETE (single dare)
│   │   └── create-onchain/route.ts # Create dare on blockchain
│   ├── verify-proof/    # Verify dare proof & payout
│   ├── upload/          # File upload endpoint
│   ├── auth/            # Authentication endpoints
│   └── contracts/       # Contract information endpoints
│       ├── config/route.ts       # Protocol configuration
│       └── dares/[id]/route.ts   # On-chain dare data
├── lib/
│   ├── base44Client.ts  # Base44 SDK client configuration
│   ├── contracts.ts     # Smart contract setup (clients, addresses, ABIs)
│   ├── contracts/utils.ts # Contract utility functions
│   └── api/types.ts     # TypeScript types for API
└── abis/                # Smart contract ABIs
```

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Base44 Configuration
NEXT_PUBLIC_BASE44_APP_ID=68fdae09d2124933d726e89a
BASE44_API_KEY=your_base44_api_key_here

# Blockchain Configuration
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
# For development: http://localhost:8545

# Smart Contract Addresses (Base Mainnet)
NEXT_PUBLIC_PROTOCOL_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Referee/Oracle Private Key (NEVER commit to git!)
# This wallet calls verifyAndPayout on the contract
REFEREE_PRIVATE_KEY=0x...
```

## API Routes

### Dares API

- **GET `/api/dares`** - List dares (with filtering and pagination)
- **POST `/api/dares`** - Create a new dare (Base44 only)
- **GET `/api/dares/[id]`** - Get a single dare
- **PUT `/api/dares/[id]`** - Update a dare
- **DELETE `/api/dares/[id]`** - Delete a dare
- **POST `/api/dares/create-onchain`** - Create dare on blockchain + sync to Base44

### Verification

- **POST `/api/verify-proof`** - Verify proof and trigger on-chain payout

### File Upload

- **POST `/api/upload`** - Upload files (images, videos) via Base44

### Authentication

- **GET `/api/auth/me`** - Get current user (server-side)

### Contract Information

- **GET `/api/contracts/config`** - Get protocol configuration
- **GET `/api/contracts/dares/[id]`** - Get on-chain dare data

See `API.md` for detailed API documentation.

## Usage Examples

### Create a Dare (Base44 only)

```typescript
const response = await fetch('/api/dares', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Complete this challenge',
    description: 'Do 100 pushups',
    stake_amount: 50,
    category: 'fitness',
    difficulty: 'hard',
  }),
});
```

### Create Dare On-Chain

```typescript
const response = await fetch('/api/dares/create-onchain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    streamerAddress: '0x...',
    amount: 100, // USDC amount
    referrerAddress: '0x...', // optional
    base44Data: {
      title: 'On-chain dare',
      description: 'This will be synced to Base44',
    },
  }),
});
```

### Verify Proof

```typescript
const response = await fetch('/api/verify-proof', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dareId: '1',
  }),
});
```

### Upload File

```typescript
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
```

## Key Libraries

- **@base44/sdk**: Entity management and file uploads
- **viem**: Ethereum library for contract interactions
- **Next.js**: API routes framework

## Next Steps

1. Configure environment variables in `.env.local`
2. Deploy smart contracts and update contract addresses
3. Set up Base44 API key if needed
4. Test API endpoints
5. Integrate frontend to use these APIs

## Notes

- The Base44 SDK is used for entity storage and file uploads
- Smart contract interactions are handled via Viem
- The `REFEREE_PRIVATE_KEY` must be kept secure and never committed to git
- All on-chain transactions use the Base network (L2)



