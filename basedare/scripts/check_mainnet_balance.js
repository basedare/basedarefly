const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Deployer wallet:", signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("ETH Balance:", ethers.formatEther(balance), "ETH");
  
  const minRequired = ethers.parseEther("0.003");
  if (balance >= minRequired) {
    console.log("✅ Sufficient for deployment");
  } else {
    console.log("❌ Need at least 0.003 ETH for deployment");
    console.log("Fund wallet:", signer.address);
  }
}

main().catch(console.error);
