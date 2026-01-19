---
name: run_tests
description: Executes the test suite for the Bounty backend. Use this to verify the Zod validation and the Livepeer SDK integration.
parameters:
  - suite: string (options: "api", "contracts", "integration")
  - grep: string (optional, to run specific tests)
---

# Skill: run_tests

**Commands:**
```bash
# API tests (Zod validation, route handlers)
npm run test:api

# Contract tests (Hardhat/Solidity)
npx hardhat test

# Integration tests (full flow)
npm run test:integration

# Run specific test by name
npx hardhat test --grep "stakeBounty"
npm run test:api -- --grep "validation"
```

**When to use:**
- After implementing new API routes
- Before committing contract changes
- To verify Zod schema matches expected payload
- To test Livepeer SDK integration

**Test locations:**
- API tests: `__tests__/api/` or `app/api/**/*.test.ts`
- Contract tests: `test/*.ts`
- Integration: `__tests__/integration/`
