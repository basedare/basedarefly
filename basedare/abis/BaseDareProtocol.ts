// ✅ BOUNTY CONTRACT ABI - matches BaseDareBounty.sol deployed on Sepolia
export const BOUNTY_ABI = [
  {
    "inputs": [
      { "name": "_usdc", "type": "address" },
      { "name": "_platformWallet", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "name": "_dareId", "type": "uint256" },
      { "name": "_streamer", "type": "address" },
      { "name": "_referrer", "type": "address" },
      { "name": "_amount", "type": "uint256" }
    ],
    "name": "fundBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "_dareId", "type": "uint256" }],
    "name": "verifyAndPayout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "_dareId", "type": "uint256" }],
    "name": "refundBacker",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "_newReferee", "type": "address" }],
    "name": "setAIRefereeAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_token", "type": "address" },
      { "name": "_amount", "type": "uint256" }
    ],
    "name": "rescueERC20",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "", "type": "uint256" }],
    "name": "bounties",
    "outputs": [
      { "name": "amount", "type": "uint256" },
      { "name": "streamer", "type": "address" },
      { "name": "referrer", "type": "address" },
      { "name": "backer", "type": "address" },
      { "name": "isVerified", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "USDC",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PLATFORM_WALLET",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "AI_REFEREE_ADDRESS",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "dareId", "type": "uint256" },
      { "indexed": true, "name": "backer", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" }
    ],
    "name": "BountyFunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "dareId", "type": "uint256" },
      { "indexed": false, "name": "streamerAmount", "type": "uint256" },
      { "indexed": false, "name": "platformFee", "type": "uint256" },
      { "indexed": false, "name": "referrerFee", "type": "uint256" }
    ],
    "name": "BountyPayout",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "dareId", "type": "uint256" },
      { "indexed": true, "name": "refundRecipient", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" }
    ],
    "name": "BountyRefund",
    "type": "event"
  }
] as const;

// ✅ LEGACY PROTOCOL ABI (kept for backwards compatibility)
export const PROTOCOL_ABI = [
  {
    "inputs": [
      { "name": "_streamer", "type": "address" },
      { "name": "_amount", "type": "uint256" },
      { "name": "_referrer", "type": "address" }
    ],
    "name": "createDare",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_dareId", "type": "uint256" },
      { "name": "_amount", "type": "uint256" }
    ],
    "name": "injectCapital",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_dareId", "type": "uint256" },
      { "name": "_proof", "type": "bytes" }
    ],
    "name": "verifyAndPayout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "", "type": "uint256" }],
    "name": "dares",
    "outputs": [
      { "name": "id", "type": "uint256" },
      { "name": "creator", "type": "address" },
      { "name": "streamer", "type": "address" },
      { "name": "totalPot", "type": "uint256" },
      { "name": "status", "type": "uint8" },
      { "name": "isBrandSponsored", "type": "bool" },
      { "name": "verificationProof", "type": "bytes" },
      { "name": "referrer", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextDareId",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oracleAddress",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolFee",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "referralFee",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "accumulatedFees",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "_newOracle", "type": "address" }],
    "name": "setOracle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ✅ STRICT JSON ABI (Fixes the "Cannot use 'in' operator" error)
export const USDC_ABI = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_from",
        "type": "address"
      },
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

