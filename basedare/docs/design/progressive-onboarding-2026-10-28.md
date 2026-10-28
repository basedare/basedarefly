# Guest first, account when useful

The launch brief explicitly includes the Yodl/Privy onboarding pattern. This means an ordinary visitor can get value before learning about wallets, and can later use a familiar sign-in method. It does not mean replacing the existing account system during the free campaign release.

## Implemented foundation

- Guests browse and start free adventures; progress resumes from the same browser. The Siargao challenge also completes, keeps a private device note, downloads a result card and invites another visitor without an account.
- Paid mission pages show the specific opportunity before authentication. Their existing signed-wallet claim and recovery paths keep the exact mission destination.
- Mission alerts and buyer enquiries already accept interest without a wallet. Neither is an account, funded assignment or payment.

## Current account audit

- `components/Providers.tsx`: wagmi, NextAuth SessionProvider, Coinbase passkey smart wallet, existing external wallets. Wallet-authorized writes and ownership are keyed to established addresses.
- `components/IdentityButton.tsx`: main sign-in is a passkey, with other wallets disclosed. This is not Google/Apple/email sign-in and should not be described as such.
- `lib/auth-options.ts`: conditional Google/Twitter/Twitch providers. Google requests YouTube read access and the callback resolves creator platform metadata. That is an account-linking integration, not yet a least-permission general traveller login.
- `hooks/useSocialAction.ts`: actions require the existing verified wallet/session. Adding an email button alone cannot authorize these actions or recover old wallet-owned records.
- `hooks/useAdventureProgress.ts`: local guest journal and optional wallet-linked account copy. Guest progress must be explicitly merged when saving, without claiming another device's journal or losing an existing account.
- `components/mission-pass/`: social-webview handoff and saved continuation already exist. A new provider must retain exact mission/adventure context and avoid OAuth inside unsupported Instagram webviews.

## Recommended next account release

1. Add a stable account identity mapped to verified login methods and separately verified wallet addresses. Do not infer ownership from a matching name or unverified email, and never replace the address attached to an existing payment.
2. Offer passwordless email and appropriate configured social providers. Request YouTube/creator permissions only from an explicit Connect channel action.
3. Evaluate Privy alongside existing authentication: its email OTP, account linking and external/embedded wallet support fit the desired experience. Create a wallet only when a user chooses a wallet-dependent action. Keep existing passkey/external wallet users working.
4. Prove login, logout, account switching, expired sessions, recovery, link/unlink conflicts, signed API authorization, existing Baretags, guest-journal merge and exact mission continuation in preview and on iOS/Android.
5. Roll out alongside the existing path with a tested rollback. Provider project configuration, domains, recovery and actual cost/limits must be confirmed before activation. No provider registration, paid service, credentials or migration is included here.

## Sources checked 28 October 2026

- [Privy email OTP](https://docs.privy.io/authentication/user-authentication/login-methods/email)
- [Privy features: custom auth, linking and multiple wallets](https://www.privy.io/features)
- [Privy user wallets](https://www.privy.io/user-wallets)

These establish provider capabilities, not a tested BaseDare integration. Yodl's current implementation could not be directly verified; use it as the founder's interaction reference rather than claiming its architecture.
