// ABI for BaseDareBounty contract
export const BOUNTY_ABI = [
  {
    "inputs": [
      { "name": "_dareId", "type": "uint256" },
      { "name": "_streamer", "type": "address" },
      { "name": "_referrer", "type": "address" },
      { "name": "_amount", "type": "uint256" }
    ],
    "name": "stakeBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_dareId", "type": "uint256" }
    ],
    "name": "verifyAndPayout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_dareId", "type": "uint256" },
      { "name": "_backer", "type": "address" }
    ],
    "name": "refundStaker",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "", "type": "uint256" }
    ],
    "name": "bounties",
    "outputs": [
      { "name": "amount", "type": "uint256" },
      { "name": "streamer", "type": "address" },
      { "name": "referrer", "type": "address" },
      { "name": "staker", "type": "address" },
      { "name": "isVerified", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "AI_REFEREE_ADDRESS",
    "outputs": [
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "USDC",
    "outputs": [
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "HOUSE_WALLET",
    "outputs": [
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "dareId", "type": "uint256" },
      { "indexed": true, "name": "staker", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" }
    ],
    "name": "BountyStaked",
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

// ABI for USDC
export const USDC_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "_owner", "type": "address" },
      { "name": "_spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "_owner", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "name": "balance", "type": "uint256" }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "_from", "type": "address" },
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
