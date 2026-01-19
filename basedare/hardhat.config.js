require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: '.env.local' });

// Use REFEREE_PRIVATE_KEY as fallback if DEPLOYER_PRIVATE_KEY not set
const getPrivateKey = () => {
  const key = process.env.DEPLOYER_PRIVATE_KEY || process.env.REFEREE_PRIVATE_KEY;
  if (!key) return [];
  return [key.trim().replace(/[\[\]]/g, '')];
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    "base-sepolia": {
      url: "https://sepolia.base.org",
      accounts: getPrivateKey(),
      chainId: 84532,
    },
  },
};





