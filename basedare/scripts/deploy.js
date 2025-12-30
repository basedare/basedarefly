const hre = require("hardhat");

async function main() {
  console.log("Deploying BaseDareProtocol (Platinum Edition)...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // BASE SEPOLIA CONFIG
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; 
  
  const BaseDareProtocol = await hre.ethers.getContractFactory("BaseDareProtocol");
  const protocol = await BaseDareProtocol.deploy(deployer.address, USDC_ADDRESS); 

  await protocol.waitForDeployment();

  console.log("✅ Truth Protocol Deployed at:", await protocol.getAddress());
  console.log("💳 Linked to USDC at:", USDC_ADDRESS);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
