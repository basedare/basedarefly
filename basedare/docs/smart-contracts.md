# Smart Contracts Integration

## Overview
BaseDare relies on smart contracts deployed to the Base network (Testnet/Mainnet) to handle trustless escrow of USDC for dares. 

## Key Contracts (located in `contracts/` or external ABIs)

### `BaseDareBounty.sol` (Conceptual)
Handles the creation, staking, and resolution of user dares.

**Key Functions:**
- `createBounty(address target, string title, uint256 amount)`: Stakes USDC into the contract for a specific dare. Emits `BountyCreated` event.
- `releaseBounty(uint256 dareId)`: Called by the protocol referee (TruthOracle consensus) to release funds to the target who successfully completed the dare. Emits `BountyReleased`.
- `refundBounty(uint256 dareId)`: Called by the protocol referee if the dare fails or expires, refunding the creator.

## Deployment & Setup
- Local development utilizes Wagmi and viem to interact with the contracts.
- Ensure the `NEXT_PUBLIC_CONTRACT_ADDRESS` is defined in your `.env.local` to point to the correct deployment on Base Sepolia (Testnet) or Base Mainnet.
