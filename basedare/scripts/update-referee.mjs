import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Contract configuration
const BOUNTY_ADDRESS = process.env.BOUNTY_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS;
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;

if (!BOUNTY_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(BOUNTY_ADDRESS)) {
    throw new Error('Set BOUNTY_CONTRACT_ADDRESS or NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS to a valid contract address.');
}

if (!OWNER_PRIVATE_KEY || !/^0x[a-fA-F0-9]{64}$/.test(OWNER_PRIVATE_KEY)) {
    throw new Error('Set OWNER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY to the contract owner private key.');
}

// Set up the account using the private key
const account = privateKeyToAccount(OWNER_PRIVATE_KEY);
const NEW_REFEREE_ADDRESS = process.env.NEW_REFEREE_ADDRESS || account.address;

if (!/^0x[a-fA-F0-9]{40}$/.test(NEW_REFEREE_ADDRESS)) {
    throw new Error('Set NEW_REFEREE_ADDRESS to a valid address, or omit it to use the signer address.');
}

console.log('═'.repeat(60));
console.log('  UPDATING ON-CHAIN REFEREE ADDRESS (MAINNET)');
console.log('═'.repeat(60));
console.log(`Owner/Signer Wallet:  ${account.address}`);
console.log(`New Referee Address:   ${NEW_REFEREE_ADDRESS}`);
console.log(`Target Contract:       ${BOUNTY_ADDRESS}`);
console.log('═'.repeat(60));

// Setup Viem clients for Base Mainnet
const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
});

const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http('https://mainnet.base.org'),
});

// The ABI subset we need to interact with
const contractAbi = parseAbi([
    'function setAIRefereeAddress(address _newReferee) external',
    'function AI_REFEREE_ADDRESS() view returns (address)',
    'function owner() view returns (address)'
]);

async function main() {
    try {
        // 1. Pre-flight Checks
        console.log('\n[1/3] Running pre-flight checks...');
        const owner = await publicClient.readContract({
            address: BOUNTY_ADDRESS,
            abi: contractAbi,
            functionName: 'owner',
        });
        console.log(`✅ Verified Contract Owner: ${owner}`);

        if (owner.toLowerCase() !== account.address.toLowerCase()) {
            throw new Error(`CRITICAL: The provided private key (${account.address}) does not match the contract owner (${owner}).`);
        }

        const currentReferee = await publicClient.readContract({
            address: BOUNTY_ADDRESS,
            abi: contractAbi,
            functionName: 'AI_REFEREE_ADDRESS',
        });
        console.log(`✅ Current Referee: ${currentReferee}`);

        if (currentReferee.toLowerCase() === NEW_REFEREE_ADDRESS.toLowerCase()) {
            console.log('\n✅ NO ACTION NEEDED: The referee address is already set to the target wallet.');
            process.exit(0);
        }

        // 2. Execute Transaction
        console.log(`\n[2/3] Simulating transaction to set referee to ${NEW_REFEREE_ADDRESS}...`);
        const { request } = await publicClient.simulateContract({
            account,
            address: BOUNTY_ADDRESS,
            abi: contractAbi,
            functionName: 'setAIRefereeAddress',
            args: [NEW_REFEREE_ADDRESS],
        });

        console.log('✅ Simulation successful. Broadcasting transaction...');
        const hash = await walletClient.writeContract(request);
        console.log(`✅ Transaction sent! Hash: ${hash}`);
        console.log(`   View on BaseScan: https://basescan.org/tx/${hash}`);

        // 3. Wait for confirmation and verify
        console.log('\n[3/3] Waiting for confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}! Status: ${receipt.status}`);

        const verifiedReferee = await publicClient.readContract({
            address: BOUNTY_ADDRESS,
            abi: contractAbi,
            functionName: 'AI_REFEREE_ADDRESS',
        });

        if (verifiedReferee.toLowerCase() === NEW_REFEREE_ADDRESS.toLowerCase()) {
            console.log(`\n🎉 SUCCESS! The AI_REFEREE_ADDRESS is now permanently set to: ${verifiedReferee}`);
        } else {
            console.error(`\n❌ ERROR: Verification failed. The address is currently: ${verifiedReferee}`);
        }

    } catch (error) {
        console.error('\n❌ SCRIPT FAILED:');
        console.error(error.message || error);
    }
}

main();
