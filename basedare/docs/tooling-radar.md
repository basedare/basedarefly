# Tooling Radar

Updated: 2026-03-20

This file is the filter for new skills, Actions, and Web3 repos we discover on X, GitHub, or Marketplace pages.

The goal is simple:
- stop repo-chasing
- classify tools by fit
- only adopt tools that improve BaseDare's real stack

## How We Score New Tools

We sort everything into one of three buckets:
- `ADOPT`: useful now, fits the stack, low operational drag
- `WATCH`: promising, but not worth integrating yet
- `IGNORE`: weak fit, too much overhead, or not trustworthy enough

Questions to ask before adopting anything:
1. Does it fit BaseDare's current stack?
2. Does it reduce risk or speed up shipping?
3. Does it add an external dependency we do not want to own?
4. Can we validate it locally or in CI without a lot of ceremony?
5. Would we still want it in 60 days?

## BaseDare Context

Current smart-contract stack:
- Hardhat-first
- Solidity 0.8.20
- contract tests in `test/`
- coverage via `solidity-coverage`

Current gap before this radar:
- app CI existed
- dedicated contract CI did not

## Radar

| Tool | Type | Status | Fit | Why It Matters | Decision |
| --- | --- | --- | --- | --- | --- |
| `ui-ux-pro-max` | Codex skill | `ADOPT` | High | Strong fit for BaseDare page polish, interaction systems, and non-generic UI thinking | Installed locally and useful now |
| `solidity-workflows` | GitHub Action pattern | `ADOPT` | High | Matches BaseDare's Hardhat stack and helped shape a real contract CI workflow | Borrow patterns, keep our own workflow in-repo |
| `BountyHub App` | GitHub App / product pattern | `WATCH` | Medium | Good source of bounty lifecycle ideas, claim flows, and reward UX patterns | Learn from it, do not integrate directly |
| `Awesome-Web3` | Reference list | `WATCH` | Medium | Good research index for security, test tooling, and EVM ecosystem discovery | Mine selectively, do not treat as an install source |
| `the-auditor-pr-reviewer` | PR review Action | `WATCH` | Medium | Interesting extra audit signal for Solidity PRs | Consider later as non-blocking commentary only |
| `smart-contract-pr-reviewer` | PR review Action | `IGNORE` | Low | Requires a custom backend and adds ops overhead we do not need right now | Skip unless we decide to host our own reviewer |
| `foundry-multibuild` | Compiler matrix Action | `IGNORE` | Low | Useful for Foundry-first repos, but BaseDare is Hardhat-first today | Revisit only if the contract toolchain changes |

## Adoption Rules

### Skills

Adopt a skill only if:
- it has a real skill structure
- it saves us repeated work
- it aligns with Basedare's actual workflows

Do not install a skill just because it is trending.

### Actions and CI

Adopt an Action or workflow pattern only if:
- it fits the current repo
- it is understandable enough to maintain
- it can fail in a way we can debug

Prefer borrowing workflow ideas into our own YAML over blindly depending on opaque third-party Actions.

### AI Reviewers

AI smart-contract review tools are advisory only until proven otherwise.

Default policy:
- no merge gating on third-party AI audit bots
- no external review backend unless we intentionally want to operate it
- compile, tests, and coverage come first

## Current Actions From This Radar

Already adopted:
- dedicated contract CI in [.github/workflows/contracts.yml](/Users/mrrobot13/Desktop/basedarestar/basedare/.github/workflows/contracts.yml)
- reusable contract scripts in [package.json](/Users/mrrobot13/Desktop/basedarestar/basedare/package.json)

Next likely upgrade:
1. add more contract tests for escrow, payout, and pause behavior
2. evaluate a static-analysis layer once the test surface is larger
3. create internal Basedare-specific contract security guidance instead of installing generic bots
