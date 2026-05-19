export const BASECASH_DENOMINATIONS_PHP = [500, 1000, 2500, 5000] as const;

export type BaseCashDenominationPhp = (typeof BASECASH_DENOMINATIONS_PHP)[number];

export type BaseCashPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';
export type BaseCashRedemptionStatus = 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
export type BaseCashSettlementStatus = 'UNSETTLED' | 'SETTLED' | 'DISPUTED';

export const BASECASH_SERVICE_FEES_PHP: Record<BaseCashDenominationPhp, number> = {
  500: 40,
  1000: 75,
  2500: 175,
  5000: 300,
};

export const BASECASH_DEFAULT_PHP_PER_USDC = 56;
export const BASECASH_CREDIT_VALID_HOURS = 24;
export const BASECASH_DAILY_VENUE_CAP_PHP = 20_000;

export function isBaseCashDenomination(value: number): value is BaseCashDenominationPhp {
  return BASECASH_DENOMINATIONS_PHP.includes(value as BaseCashDenominationPhp);
}

export function getBaseCashPhpPerUsdc() {
  const configured = Number(
    process.env.NEXT_PUBLIC_BASECASH_PHP_PER_USDC ||
      process.env.BASECASH_PHP_PER_USDC ||
      BASECASH_DEFAULT_PHP_PER_USDC
  );
  return Number.isFinite(configured) && configured > 0 ? configured : BASECASH_DEFAULT_PHP_PER_USDC;
}

export function quoteBaseCashVenueCredit(denominationPhp: BaseCashDenominationPhp) {
  const serviceFeePhp = BASECASH_SERVICE_FEES_PHP[denominationPhp];
  const totalPhp = denominationPhp + serviceFeePhp;
  const phpPerUsdc = getBaseCashPhpPerUsdc();
  const estimatedUsdc = Number((totalPhp / phpPerUsdc).toFixed(2));

  return {
    denominationPhp,
    serviceFeePhp,
    totalPhp,
    venueReceivablePhp: denominationPhp,
    phpPerUsdc,
    estimatedUsdc,
    validHours: BASECASH_CREDIT_VALID_HOURS,
    dailyVenueCapPhp: BASECASH_DAILY_VENUE_CAP_PHP,
    currencyPaid: 'USDC' as const,
    chainId: 8453,
  };
}

export function formatPhp(value: number) {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

export function formatUsdc(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} USDC`;
}

