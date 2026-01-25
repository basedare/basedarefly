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
    // Testnet
    "base-sepolia": {
      url: "https://sepolia.base.org",
      accounts: getPrivateKey(),
      chainId: 84532,
    },
    // Mainnet
    "base-mainnet": {
      url: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
      accounts: getPrivateKey(),
      chainId: 8453,
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      "base-mainnet": process.env.BASESCAN_API_KEY || "",
      "base-sepolia": process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base-mainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};





