const { ethers } = require("hardhat");

async function main() {
  const BOUNTY = "0x01330B3E20f5440AA869a10BA44026fcd7444EA5";
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // Encode the function call manually
  const iface = new ethers.Interface([
    "function fundBounty(uint256 _dareId, address _streamer, address _referrer, uint256 _amount)"
  ]);

  const dareId = 12345678n;
  const amount = ethers.parseUnits("5", 6);
  const data = iface.encodeFunctionData("fundBounty", [
    dareId,
    signer.address,
    signer.address, // Use signer as referrer, not zero
    amount
  ]);

  console.log("\nEncoded call data:", data.slice(0, 74) + "...");
  console.log("Function selector:", data.slice(0, 10));

  // Expected selector for fundBounty(uint256,address,address,uint256)
  const expectedSelector = ethers.id("fundBounty(uint256,address,address,uint256)").slice(0, 10);
  console.log("Expected selector:", expectedSelector);

  // Try eth_call first to get revert reason
  console.log("\n=== Simulating with eth_call ===");
  try {
    const result = await ethers.provider.call({
      to: BOUNTY,
      from: signer.address,
      data: data
    });
    console.log("Result:", result);
  } catch (e) {
    console.log("Reverted!");
    if (e.data) {
      console.log("Revert data:", e.data);
      // Try to decode revert reason
      try {
        const reason = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + e.data.slice(10));
        console.log("Revert reason:", reason[0]);
      } catch {
        console.log("Could not decode revert reason");
      }
    }
    if (e.message) {
      console.log("Error message:", e.message.slice(0, 500));
    }
  }

  // Try estimateGas
  console.log("\n=== Estimating gas ===");
  try {
    const gas = await ethers.provider.estimateGas({
      to: BOUNTY,
      from: signer.address,
      data: data
    });
    console.log("Gas estimate:", gas.toString());
  } catch (e) {
    console.log("Gas estimation failed:", e.message.slice(0, 300));
  }

  // Try with a real address as referrer
  console.log("\n=== Trying with different parameters ===");

  // First check current allowance
  const usdc = new ethers.Contract(USDC, [
    "function allowance(address,address) view returns (uint256)"
  ], signer);
  console.log("Allowance:", ethers.formatUnits(await usdc.allowance(signer.address, BOUNTY), 6));

  // Check bounty contract state
  const bounty = new ethers.Contract(BOUNTY, [
    "function bounties(uint256) view returns (uint256,address,address,address,bool)",
    "function owner() view returns (address)"
  ], signer);

  console.log("Contract owner:", await bounty.owner());

  // Check if dare 12345678 already exists
  const existing = await bounty.bounties(dareId);
  console.log("Existing bounty amount:", existing[0].toString());
  if (existing[0] > 0n) {
    console.log("!!! BOUNTY ALREADY EXISTS - using different ID");
  }
}

main().catch(e => console.error("Fatal:", e));
