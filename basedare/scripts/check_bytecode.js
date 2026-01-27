const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const BOUNTY = "0x01330B3E20f5440AA869a10BA44026fcd7444EA5";

  // Get deployed bytecode
  const deployed = await ethers.provider.getCode(BOUNTY);
  console.log("Deployed code length:", deployed.length, "chars");
  console.log("Deployed code hash:", ethers.keccak256(deployed));

  // Get compiled bytecode
  const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/BaseDareBounty.sol/BaseDareBounty.json"));
  console.log("\nCompiled deployedBytecode length:", artifact.deployedBytecode.length, "chars");
  console.log("Compiled code hash:", ethers.keccak256(artifact.deployedBytecode));

  // Simple comparison - first 200 chars of runtime bytecode (after constructor)
  const deployedStart = deployed.slice(0, 200);
  const compiledStart = artifact.deployedBytecode.slice(0, 200);

  console.log("\n--- First 200 chars comparison ---");
  console.log("Deployed:", deployedStart);
  console.log("Compiled:", compiledStart);
  console.log("\nMatch:", deployedStart === compiledStart ? "YES" : "NO - DIFFERENT CONTRACT!");
}

main().catch(console.error);
