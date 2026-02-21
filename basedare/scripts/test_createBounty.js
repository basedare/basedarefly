const hre = require("hardhat");

async function main() {
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
        throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local");
    }

    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

    const [deployer] = await hre.ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // 1. Get USDC Contract to check balance and approve
    const usdcAbi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)",
        "function decimals() external view returns (uint8)"
    ];
    const usdc = await hre.ethers.getContractAt(usdcAbi, USDC_ADDRESS, deployer);

    const decimals = await usdc.decimals();
    const amountToStake = hre.ethers.parseUnits("5", decimals); // 5 USDC

    const balance = await usdc.balanceOf(deployer.address);
    console.log(`USDC Balance: ${hre.ethers.formatUnits(balance, decimals)} USDC`);

    if (balance < amountToStake) {
        console.error("Not enough USDC to test staking. Please get testnet USDC.");
        return;
    }

    // 2. Approve USDC for the Bounty Contract
    console.log(`Approving 5 USDC for contract ${contractAddress}...`);
    const approveTx = await usdc.approve(contractAddress, amountToStake);
    await approveTx.wait();
    console.log("Approval successful");

    // 3. Call createBounty
    console.log("Creating bounty...");
    // Assuming ABI defines this function taking (address, string, uint256)
    const BaseDareBounty = await hre.ethers.getContractAt("BaseDareBounty", contractAddress, deployer);

    // Create a dummy target address
    const targetWallet = "0x1111111111111111111111111111111111111111";
    const tx = await BaseDareBounty.createBounty(targetWallet, "Test automated dare", amountToStake);
    console.log("Transaction submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log(`Bounty created successfully in block ${receipt.blockNumber}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
