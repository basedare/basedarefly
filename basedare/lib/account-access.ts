export const ACCOUNT_CONNECTOR_PREFIX = "basedare-recoverable-";
export function accountAccessEnabled() {
  return (
    process.env.NEXT_PUBLIC_ACCOUNT_ACCESS_ENABLED === "true" &&
    Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim())
  );
}
export function accountWalletAllowed(
  authenticated: boolean,
  linked: boolean,
  requested: string,
  accounts: readonly string[]
) {
  return (
    authenticated &&
    linked &&
    /^0x[a-f0-9]{40}$/i.test(requested) &&
    accounts.length === 1 &&
    typeof accounts[0] === "string" &&
    accounts[0].toLowerCase() === requested.toLowerCase()
  );
}
