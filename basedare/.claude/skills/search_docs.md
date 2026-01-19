name: search_docs
description: Search official documentation for help with errors or questions. Use this skill when you see contract reverts, Viem/Wagmi errors, Livepeer API issues, gas problems on Base Sepolia, OpenZeppelin usage questions, or USDC allowance/approve logic. Always prefer official sources like docs.livepeer.org, viem.sh, wagmi.sh, docs.base.org, openzeppelin.com.
parameters:
- query: string (required) - The exact error or question (e.g., "viem writeContract revert reason", "Livepeer SDK check if stream is active", "OpenZeppelin nonReentrant best practice")
- focus: string (optional) - Narrow it down (e.g., "error handling", "gas optimization", "security")