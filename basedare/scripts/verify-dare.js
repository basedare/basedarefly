const hre = require("hardhat");

async function main() {
  // 1. CONFIGURATION
  // REPLACE THIS with your deployed contract address after you run deploy.js
  const PROTOCOL_ADDRESS = process.env.NEXT_PUBLIC_PROTOCOL_ADDRESS || "0x_YOUR_CONTRACT_ADDRESS_HERE"; 
  
  // The ID of the dare to verify. 0 is the first one created.
  const DARE_ID = 0; 

  // This mimics the "zkML Proof" bytes. 
  // In a real app, this comes from the AI model (e.g., EZKL or RISC Zero).
  // We use valid bytes format.
  const FAKE_PROOF = hre.ethers.toUtf8Bytes("RED_BULL_CAN_DETECTED_CONFIDENCE_99%");

  // 2. SETUP
  const [oracle] = await hre.ethers.getSigners();
  console.log("🔮 Oracle verifying Dare #", DARE_ID);
  console.log("   Acting as:", oracle.address);

  // 3. ATTACH TO CONTRACT
  const BaseDareProtocol = await hre.ethers.getContractFactory("BaseDareProtocol");
  const protocol = BaseDareProtocol.attach(PROTOCOL_ADDRESS);

  // 4. VERIFY
  try {
    console.log("   Sending verification transaction...");
    
    // Call the function ONLY the Oracle can call
    const tx = await protocol.connect(oracle).verifyAndPayout(DARE_ID, FAKE_PROOF);
    
    console.log("   Waiting for confirmation...");
    await tx.wait();

    console.log("✅ VERIFIED. Payout released to Streamer.");
    console.log("   Transaction Hash:", tx.hash);
  } catch (error) {
    console.error("❌ Verification Failed. Reason:", error.message);
    
    // Common error debugging
    if (error.message.includes("Ownable: caller is not the owner")) {
       console.log("👉 HINT: The wallet running this script is NOT the Oracle address set in the contract.");
    }
    if (error.message.includes("Dare not active")) {
       console.log("👉 HINT: This dare might already be completed or failed.");
    }
    if (error.message.includes("Only Truth Machine can verify")) {
       console.log("👉 HINT: The wallet running this script is NOT the Oracle address set in the contract.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


