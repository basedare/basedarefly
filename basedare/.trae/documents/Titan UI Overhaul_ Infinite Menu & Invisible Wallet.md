# Titan UI Overhaul Implementation Plan (Refined)

## 1. Asset Creation

* **Create** **`components/InfiniteMenu.css`**: Implement the refined CSS provided by the user.

  * Include imports for `@fontsource/jetbrains-mono` and `@fontsource/figtree`.

  * Apply the "Titan Engine" styles for the action button, face title, description, and mobile optimizations.

* **Install Dependencies**: Run `npm install @fontsource/jetbrains-mono @fontsource/figtree` to ensure the fonts are available.

## 2. Component Implementation

* **Create** **`components/InfiniteMenu.tsx`**:

  * Implement the `InfiniteMenu` component.

  * **Enhancement**: Wrap `ConnectWallet` inside the `<Wallet>` component to ensure correct state management.

  * Define TypeScript interfaces for `items` and `onStake`.

  * Integrate `@coinbase/onchainkit` Identity components (`Identity`, `Avatar`, `Name`, `Address`).

  * Implement the `handleStake` logic using the `activeItem` state.

## 3. Page Integration

* **Update** **`app/page.tsx`**:

  * Import `InfiniteMenu`.

  * Map the `dares` data (from `useDares` or `getServerSideProps`) to the `InfiniteMenu` items format: `{ id, title, bounty, streamer }`.

  * Replace the existing feed view with `<InfiniteMenu>` (or make it the primary view).

  * Connect the `onStake` prop to the existing staking logic (likely invoking `useBountyStake` or similar).

## 4. Verification

* Verify the "Enter the Colosseum" button correctly triggers the Smart Wallet/FaceID flow.

* Ensure the Cyberpunk styling (Electric Cyan glow, fonts) renders correctly on both desktop and mobile.

