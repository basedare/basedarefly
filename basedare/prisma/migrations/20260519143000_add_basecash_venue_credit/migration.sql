-- BaseCash Venue Credit pilot ledger.
-- Narrow scope: venue-specific prepaid credit, manual settlement, no public cashout.

CREATE TABLE "BaseCashVenueCredit" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "buyerWallet" TEXT NOT NULL,
    "buyerTag" TEXT,
    "receiptCode" TEXT NOT NULL,
    "denominationPhp" INTEGER NOT NULL,
    "serviceFeePhp" INTEGER NOT NULL,
    "totalPhp" INTEGER NOT NULL,
    "venueReceivablePhp" INTEGER NOT NULL,
    "currencyPaid" TEXT NOT NULL DEFAULT 'USDC',
    "chainId" INTEGER NOT NULL DEFAULT 8453,
    "txHash" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "redemptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "settlementStatus" TEXT NOT NULL DEFAULT 'UNSETTLED',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "redeemedBy" TEXT,
    "settlementReference" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaseCashVenueCredit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BaseCashVenueCredit_receiptCode_key" ON "BaseCashVenueCredit"("receiptCode");
CREATE INDEX "BaseCashVenueCredit_venueId_createdAt_idx" ON "BaseCashVenueCredit"("venueId", "createdAt");
CREATE INDEX "BaseCashVenueCredit_venueId_paymentStatus_redemptionStatus_idx" ON "BaseCashVenueCredit"("venueId", "paymentStatus", "redemptionStatus");
CREATE INDEX "BaseCashVenueCredit_receiptCode_idx" ON "BaseCashVenueCredit"("receiptCode");
CREATE INDEX "BaseCashVenueCredit_buyerWallet_createdAt_idx" ON "BaseCashVenueCredit"("buyerWallet", "createdAt");
CREATE INDEX "BaseCashVenueCredit_settlementStatus_idx" ON "BaseCashVenueCredit"("settlementStatus");

ALTER TABLE "BaseCashVenueCredit"
ADD CONSTRAINT "BaseCashVenueCredit_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
