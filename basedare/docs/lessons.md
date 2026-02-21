# Lessons Learned

This document tracks recurring issues, edge cases, and architectural decisions to prevent repeating mistakes.

## 2026-02-21
- **Smart Contract Interactions**: Always ensure `.env.local` contains the correct network variables (`NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_NETWORK`) before attempting Wagmi contract calls. Never hardcode contract addresses in components.
- **UI Preservation**: Do not alter existing UI styling, animations, or layouts unless explicitly requested. Focus strictly on backend functionality and data binding.
- **Error Handling**: Do not patch symptoms. Ensure root causes are identified and handled gracefully across both frontend and backend boundaries.
