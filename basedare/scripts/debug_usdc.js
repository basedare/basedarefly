const { ethers } = require("hardhat");

async function main() {
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const BOUNTY = "0x01330B3E20f5440AA869a10BA44026fcd7444EA5";

  const [signer] = await ethers.getSigners();
  console.log("Testing with wallet:", signer.address);

  const usdc = new ethers.Contract(USDC, [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
  ], signer);

  // Check current allowance
  console.log("\n1. Current allowance:", ethers.formatUnits(
    await usdc.allowance(signer.address, BOUNTY), 6
  ));

  // Try approval and check receipt
  console.log("\n2. Sending approve tx...");
  const tx = await usdc.approve(BOUNTY, ethers.parseUnits("50", 6));
  console.log("TX hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("TX status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
  console.log("Gas used:", receipt.gasUsed.toString());

  // Check for Approval event
  console.log("\n3. Checking events...");
  for (const log of receipt.logs) {
    try {
      const parsed = usdc.interface.parseLog(log);
      if (parsed) {
        console.log("Event:", parsed.name);
        console.log("Args:", parsed.args);
      }
    } catch (e) {
      // skip
    }
  }

  // Check allowance again
  console.log("\n4. New allowance:", ethers.formatUnits(
    await usdc.allowance(signer.address, BOUNTY), 6
  ));

  // Check if USDC is actually the right token
  console.log("\n5. USDC contract code size:");
  const code = await ethers.provider.getCode(USDC);
  console.log(code.length, "bytes");
}

main().catch(console.error);
