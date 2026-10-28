# Validation dependency security — 28 October 2026

The product-clarity release was held by the high-severity [Zod size-check advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Lockfile resolution is now 4.6.7, above the patched minimum 4.6.6. The dependency override removes transitive affected versions instead of suppressing the advisory or changing the audit threshold.

Because several wallet packages declare older Zod interfaces, compatibility is checked against their actual installed schemas, including valid and malformed data:

- Farcaster notification request limits and server callback union.
- Reown network-switch payloads and theme dictionaries.
- Coinbase CDP typed-data record fields, including its legacy single-argument record constructor.
- An oversized array is rejected before visiting any of 1,000 elements. The old 4.3.5 negative control visits all 1,000, demonstrating that the test detects the reported behavior.

These four checks run in CI after the unchanged high/critical production audit. They do not establish real-device wallet recovery or production payment settlement.

Keep OnchainKit pinned at the existing 1.1.2. The attempted 1.1.3 update changed FundButton requirements and failed application type checking; no replacement funding URL/session or auth bypass was introduced. The package is deprecated upstream, so the separate account/onboarding migration should assess removing it. That longer migration is not required to test the free guest campaign.

The final production dependency scan reports 0 high, 0 critical, 33 moderate and 2 low findings. All four direct compatibility/security checks pass. Eleven existing regression suites pass, full lint has no errors, and the production build/type check passes with the existing funding-button API. Hosted CI/deployment evidence is recorded in the release handoff. Lower-severity findings remain; do not describe this as an audit with no advisories.
