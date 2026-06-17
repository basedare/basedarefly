import 'server-only';

import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import {
  BASECASH_CREDIT_VALID_HOURS,
  BASECASH_DAILY_VENUE_CAP_PHP,
  type BaseCashPaymentStatus,
  type BaseCashRedemptionStatus,
  type BaseCashSettlementStatus,
  formatPhp,
  isBaseCashDenomination,
  quoteBaseCashVenueCredit,
} from '@/lib/basecash-shared';

export type BaseCashCreditRecord = {
  id: string;
  venueId: string;
  venueSlug: string;
  venueName: string;
  buyerWallet: string;
  buyerTag: string | null;
  receiptCode: string;
  denominationPhp: number;
  serviceFeePhp: number;
  totalPhp: number;
  venueReceivablePhp: number;
  currencyPaid: string;
  chainId: number;
  txHash: string | null;
  paymentStatus: BaseCashPaymentStatus;
  redemptionStatus: BaseCashRedemptionStatus;
  settlementStatus: BaseCashSettlementStatus;
  validFrom: Date;
  expiresAt: Date;
  redeemedAt: Date | null;
  redeemedBy: string | null;
  settlementReference: string | null;
  metadataJson: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BaseCashCreditDTO = Omit<
  BaseCashCreditRecord,
  'validFrom' | 'expiresAt' | 'redeemedAt' | 'createdAt' | 'updatedAt'
> & {
  validFrom: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BaseCashVenueSummary = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  activeCount: number;
  redeemedCount: number;
  pendingCount: number;
  expiredCount: number;
  soldPhp: number;
  redeemedPhp: number;
  serviceFeesPhp: number;
  venueReceivablePhp: number;
  unsettledPhp: number;
  latestCreditAt: string | null;
  credits: BaseCashCreditDTO[];
};

export type BaseCashAdminVenueSettlement = BaseCashVenueSummary & {
  city: string | null;
  country: string | null;
  settledCount: number;
  disputedCount: number;
};

export type BaseCashVenueLite = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  claimedBy: string | null;
};

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://www.basedare.xyz').replace(/\/$/, '');
}

function todayStartUtc() {
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function toJson(value: unknown) {
  return JSON.stringify(value ?? {});
}

function cleanOptional(value: string | null | undefined, maxLength = 240) {
  const clean = value?.replace(/\s+/g, ' ').trim() ?? '';
  return clean ? clean.slice(0, maxLength) : null;
}

export function normalizeBaseCashWallet(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

export function isMissingBaseCashTableError(error: unknown) {
  const record = error as { code?: string; meta?: { code?: string }; message?: string };
  const message = record?.message ?? '';
  return (
    record?.code === 'P2021' ||
    record?.meta?.code === '42P01' ||
    message.includes('BaseCashVenueCredit') ||
    (message.includes('relation') && message.toLowerCase().includes('basecash'))
  );
}

export function baseCashPilotMode() {
  return {
    simulatedPaymentEnabled:
      process.env.BASECASH_ALLOW_SIMULATED_PAYMENT === 'true' ||
      (process.env.NODE_ENV !== 'production' && process.env.BASECASH_ALLOW_SIMULATED_PAYMENT !== 'false'),
  };
}

export function createBaseCashReceiptCode() {
  const token = randomBytes(5).toString('base64url').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
  return `BC-${token.slice(0, 4)}-${token.slice(4, 8)}`;
}

export function normalizeBaseCashReceiptCode(value: string | null | undefined) {
  return value?.trim().toUpperCase().replace(/\s+/g, '') ?? '';
}

export function mapBaseCashCredit(row: BaseCashCreditRecord): BaseCashCreditDTO {
  return {
    ...row,
    validFrom: row.validFrom.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    redeemedAt: row.redeemedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function buildBaseCashReceiptUrl(credit: Pick<BaseCashCreditRecord | BaseCashCreditDTO, 'id' | 'receiptCode'>) {
  return `${appBaseUrl()}/basecash/receipt/${encodeURIComponent(credit.id)}?code=${encodeURIComponent(credit.receiptCode)}`;
}

export async function getBaseCashVenueBySlug(slug: string): Promise<BaseCashVenueLite | null> {
  return prisma.venue.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      country: true,
      claimedBy: true,
    },
  });
}

async function getTodayVenueSoldPhp(venueId: string) {
  const rows = await prisma.$queryRaw<Array<{ total: number | null }>>`
    SELECT COALESCE(SUM("denominationPhp"), 0)::int AS total
    FROM "BaseCashVenueCredit"
    WHERE "venueId" = ${venueId}
      AND "createdAt" >= ${todayStartUtc()}
      AND "paymentStatus" IN ('PENDING', 'PAID')
      AND "redemptionStatus" NOT IN ('CANCELLED')
  `;

  return rows[0]?.total ?? 0;
}

export async function createBaseCashVenueCredit(input: {
  venue: BaseCashVenueLite;
  buyerWallet: string;
  buyerTag?: string | null;
  denominationPhp: number;
  source?: string | null;
}) {
  if (!isBaseCashDenomination(input.denominationPhp)) {
    throw new Error('Unsupported BaseCash denomination');
  }

  const quote = quoteBaseCashVenueCredit(input.denominationPhp);
  const buyerWallet = normalizeBaseCashWallet(input.buyerWallet);
  if (!buyerWallet) {
    throw new Error('Buyer wallet is required');
  }

  const soldToday = await getTodayVenueSoldPhp(input.venue.id);
  if (soldToday + quote.denominationPhp > BASECASH_DAILY_VENUE_CAP_PHP) {
    throw new Error(`Daily pilot cap reached for this venue. Today is capped at ${formatPhp(BASECASH_DAILY_VENUE_CAP_PHP)}.`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + BASECASH_CREDIT_VALID_HOURS * 60 * 60 * 1000);
  const { simulatedPaymentEnabled } = baseCashPilotMode();
  const paymentStatus: BaseCashPaymentStatus = simulatedPaymentEnabled ? 'PAID' : 'PENDING';
  const redemptionStatus: BaseCashRedemptionStatus = 'ACTIVE';
  const id = randomUUID();
  const receiptCode = createBaseCashReceiptCode();
  const metadata = {
    product: 'BaseCash Venue Credit',
    pilot: true,
    source: cleanOptional(input.source, 80) ?? 'venue-basecash',
    noCashout: true,
    noChange: true,
    venueSpecific: true,
    paymentMode: simulatedPaymentEnabled ? 'simulated' : 'manual-admin-confirmation',
    quote: {
      phpPerUsdc: quote.phpPerUsdc,
      estimatedUsdc: quote.estimatedUsdc,
    },
  };

  await prisma.$executeRaw`
    INSERT INTO "BaseCashVenueCredit" (
      "id",
      "venueId",
      "buyerWallet",
      "buyerTag",
      "receiptCode",
      "denominationPhp",
      "serviceFeePhp",
      "totalPhp",
      "venueReceivablePhp",
      "currencyPaid",
      "chainId",
      "txHash",
      "paymentStatus",
      "redemptionStatus",
      "settlementStatus",
      "validFrom",
      "expiresAt",
      "metadataJson",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${id},
      ${input.venue.id},
      ${buyerWallet},
      ${cleanOptional(input.buyerTag, 80)},
      ${receiptCode},
      ${quote.denominationPhp},
      ${quote.serviceFeePhp},
      ${quote.totalPhp},
      ${quote.venueReceivablePhp},
      'USDC',
      ${quote.chainId},
      ${simulatedPaymentEnabled ? `simulated:${id}` : null},
      ${paymentStatus},
      ${redemptionStatus},
      'UNSETTLED',
      ${now},
      ${expiresAt},
      CAST(${toJson(metadata)} AS jsonb),
      ${now},
      ${now}
    )
  `;

  const credit = await getBaseCashCreditById(id);
  if (!credit) throw new Error('BaseCash credit was created but could not be loaded');
  return credit;
}

export async function getBaseCashCreditById(id: string) {
  const rows = await prisma.$queryRaw<BaseCashCreditRecord[]>`
    SELECT
      c.*,
      v."slug" AS "venueSlug",
      v."name" AS "venueName"
    FROM "BaseCashVenueCredit" c
    JOIN "Venue" v ON v."id" = c."venueId"
    WHERE c."id" = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getBaseCashCreditByIdOrCode(idOrCode: string) {
  const cleanCode = normalizeBaseCashReceiptCode(idOrCode);
  const rows = await prisma.$queryRaw<BaseCashCreditRecord[]>`
    SELECT
      c.*,
      v."slug" AS "venueSlug",
      v."name" AS "venueName"
    FROM "BaseCashVenueCredit" c
    JOIN "Venue" v ON v."id" = c."venueId"
    WHERE c."id" = ${idOrCode}
       OR REPLACE(c."receiptCode", '-', '') = ${cleanCode.replace(/-/g, '')}
       OR c."receiptCode" = ${cleanCode}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listBaseCashVenueCredits(venueId: string, options?: { query?: string | null; limit?: number }) {
  const query = cleanOptional(options?.query, 80);
  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 40);

  if (query) {
    const cleanCode = normalizeBaseCashReceiptCode(query);
    return prisma.$queryRaw<BaseCashCreditRecord[]>`
      SELECT c.*, v."slug" AS "venueSlug", v."name" AS "venueName"
      FROM "BaseCashVenueCredit" c
      JOIN "Venue" v ON v."id" = c."venueId"
      WHERE c."venueId" = ${venueId}
        AND (
          c."id" = ${query}
          OR c."buyerWallet" = ${normalizeBaseCashWallet(query)}
          OR c."receiptCode" = ${cleanCode}
          OR REPLACE(c."receiptCode", '-', '') = ${cleanCode.replace(/-/g, '')}
        )
      ORDER BY c."createdAt" DESC
      LIMIT ${limit}
    `;
  }

  return prisma.$queryRaw<BaseCashCreditRecord[]>`
    SELECT c.*, v."slug" AS "venueSlug", v."name" AS "venueName"
    FROM "BaseCashVenueCredit" c
    JOIN "Venue" v ON v."id" = c."venueId"
    WHERE c."venueId" = ${venueId}
      AND c."createdAt" >= ${todayStartUtc()}
    ORDER BY c."createdAt" DESC
    LIMIT ${limit}
  `;
}

export function summarizeBaseCashVenue(venue: BaseCashVenueLite, credits: BaseCashCreditRecord[]): BaseCashVenueSummary {
  const now = Date.now();
  const activeCredits = credits.filter((credit) => credit.paymentStatus === 'PAID' && credit.redemptionStatus === 'ACTIVE' && credit.expiresAt.getTime() >= now);
  const redeemedCredits = credits.filter((credit) => credit.redemptionStatus === 'REDEEMED');
  const pendingCredits = credits.filter((credit) => credit.paymentStatus === 'PENDING');
  const expiredCredits = credits.filter((credit) => credit.redemptionStatus === 'EXPIRED' || (credit.redemptionStatus === 'ACTIVE' && credit.expiresAt.getTime() < now));
  const paidCredits = credits.filter((credit) => credit.paymentStatus === 'PAID');
  const unsettledRedeemedCredits = redeemedCredits.filter((credit) => credit.settlementStatus !== 'SETTLED');

  return {
    venueId: venue.id,
    venueSlug: venue.slug,
    venueName: venue.name,
    activeCount: activeCredits.length,
    redeemedCount: redeemedCredits.length,
    pendingCount: pendingCredits.length,
    expiredCount: expiredCredits.length,
    soldPhp: paidCredits.reduce((sum, credit) => sum + credit.denominationPhp, 0),
    redeemedPhp: redeemedCredits.reduce((sum, credit) => sum + credit.denominationPhp, 0),
    serviceFeesPhp: paidCredits.reduce((sum, credit) => sum + credit.serviceFeePhp, 0),
    venueReceivablePhp: paidCredits.reduce((sum, credit) => sum + credit.venueReceivablePhp, 0),
    unsettledPhp: unsettledRedeemedCredits.reduce((sum, credit) => sum + credit.venueReceivablePhp, 0),
    latestCreditAt: credits[0]?.createdAt.toISOString() ?? null,
    credits: credits.map(mapBaseCashCredit),
  };
}

export async function redeemBaseCashCredit(input: {
  idOrCode: string;
  redeemer: string;
  expectedVenueId?: string | null;
}) {
  const credit = await getBaseCashCreditByIdOrCode(input.idOrCode);
  if (!credit) {
    return { ok: false as const, reason: 'Credit not found', credit: null };
  }

  if (input.expectedVenueId && credit.venueId !== input.expectedVenueId) {
    return { ok: false as const, reason: 'This credit belongs to a different venue', credit };
  }

  const now = new Date();
  if (credit.paymentStatus !== 'PAID') {
    return { ok: false as const, reason: 'Payment is not confirmed yet', credit };
  }
  if (credit.redemptionStatus === 'REDEEMED') {
    return { ok: false as const, reason: 'Credit already redeemed', credit };
  }
  if (credit.redemptionStatus !== 'ACTIVE') {
    return { ok: false as const, reason: 'Credit is not active', credit };
  }
  if (credit.expiresAt.getTime() < now.getTime()) {
    await prisma.$executeRaw`
      UPDATE "BaseCashVenueCredit"
      SET "redemptionStatus" = 'EXPIRED', "updatedAt" = ${now}
      WHERE "id" = ${credit.id}
    `;
    return { ok: false as const, reason: 'Credit has expired', credit: { ...credit, redemptionStatus: 'EXPIRED' as const } };
  }

  const rows = await prisma.$queryRaw<BaseCashCreditRecord[]>`
    UPDATE "BaseCashVenueCredit" c
    SET
      "redemptionStatus" = 'REDEEMED',
      "redeemedAt" = ${now},
      "redeemedBy" = ${input.redeemer},
      "updatedAt" = ${now}
    FROM "Venue" v
    WHERE c."venueId" = v."id"
      AND c."id" = ${credit.id}
      AND c."paymentStatus" = 'PAID'
      AND c."redemptionStatus" = 'ACTIVE'
    RETURNING c.*, v."slug" AS "venueSlug", v."name" AS "venueName"
  `;

  return rows[0]
    ? { ok: true as const, credit: rows[0] }
    : { ok: false as const, reason: 'Credit could not be redeemed', credit };
}

export async function markBaseCashCreditPaid(input: {
  id: string;
  txHash?: string | null;
  actor: string;
}) {
  const now = new Date();
  const rows = await prisma.$queryRaw<BaseCashCreditRecord[]>`
    UPDATE "BaseCashVenueCredit" c
    SET
      "paymentStatus" = 'PAID',
      "redemptionStatus" = 'ACTIVE',
      "txHash" = COALESCE(${cleanOptional(input.txHash, 180)}, c."txHash"),
      "updatedAt" = ${now}
    FROM "Venue" v
    WHERE c."venueId" = v."id"
      AND c."id" = ${input.id}
      AND c."paymentStatus" = 'PENDING'
    RETURNING c.*, v."slug" AS "venueSlug", v."name" AS "venueName"
  `;

  return rows[0] ?? null;
}

export async function listBaseCashAdminSettlements() {
  const rows = await prisma.$queryRaw<
    Array<{
      venueId: string;
      venueSlug: string;
      venueName: string;
      city: string | null;
      country: string | null;
      activeCount: number;
      redeemedCount: number;
      pendingCount: number;
      expiredCount: number;
      settledCount: number;
      disputedCount: number;
      soldPhp: number;
      redeemedPhp: number;
      serviceFeesPhp: number;
      venueReceivablePhp: number;
      unsettledPhp: number;
      latestCreditAt: Date | null;
    }>
  >`
    SELECT
      v."id" AS "venueId",
      v."slug" AS "venueSlug",
      v."name" AS "venueName",
      v."city",
      v."country",
      COUNT(*) FILTER (WHERE c."paymentStatus" = 'PAID' AND c."redemptionStatus" = 'ACTIVE' AND c."expiresAt" >= NOW())::int AS "activeCount",
      COUNT(*) FILTER (WHERE c."redemptionStatus" = 'REDEEMED')::int AS "redeemedCount",
      COUNT(*) FILTER (WHERE c."paymentStatus" = 'PENDING')::int AS "pendingCount",
      COUNT(*) FILTER (WHERE c."redemptionStatus" = 'EXPIRED' OR (c."redemptionStatus" = 'ACTIVE' AND c."expiresAt" < NOW()))::int AS "expiredCount",
      COUNT(*) FILTER (WHERE c."settlementStatus" = 'SETTLED')::int AS "settledCount",
      COUNT(*) FILTER (WHERE c."settlementStatus" = 'DISPUTED')::int AS "disputedCount",
      COALESCE(SUM(c."denominationPhp") FILTER (WHERE c."paymentStatus" = 'PAID'), 0)::int AS "soldPhp",
      COALESCE(SUM(c."denominationPhp") FILTER (WHERE c."redemptionStatus" = 'REDEEMED'), 0)::int AS "redeemedPhp",
      COALESCE(SUM(c."serviceFeePhp") FILTER (WHERE c."paymentStatus" = 'PAID'), 0)::int AS "serviceFeesPhp",
      COALESCE(SUM(c."venueReceivablePhp") FILTER (WHERE c."paymentStatus" = 'PAID'), 0)::int AS "venueReceivablePhp",
      COALESCE(SUM(c."venueReceivablePhp") FILTER (WHERE c."redemptionStatus" = 'REDEEMED' AND c."settlementStatus" <> 'SETTLED'), 0)::int AS "unsettledPhp",
      MAX(c."createdAt") AS "latestCreditAt"
    FROM "BaseCashVenueCredit" c
    JOIN "Venue" v ON v."id" = c."venueId"
    GROUP BY v."id", v."slug", v."name", v."city", v."country"
    ORDER BY "unsettledPhp" DESC, "latestCreditAt" DESC
  `;

  return rows.map((row) => ({
    venueId: row.venueId,
    venueSlug: row.venueSlug,
    venueName: row.venueName,
    city: row.city,
    country: row.country,
    activeCount: row.activeCount,
    redeemedCount: row.redeemedCount,
    pendingCount: row.pendingCount,
    expiredCount: row.expiredCount,
    settledCount: row.settledCount,
    disputedCount: row.disputedCount,
    soldPhp: row.soldPhp,
    redeemedPhp: row.redeemedPhp,
    serviceFeesPhp: row.serviceFeesPhp,
    venueReceivablePhp: row.venueReceivablePhp,
    unsettledPhp: row.unsettledPhp,
    latestCreditAt: row.latestCreditAt?.toISOString() ?? null,
    credits: [],
  })) satisfies BaseCashAdminVenueSettlement[];
}

export async function listBaseCashRecentCredits(options?: { limit?: number }) {
  const limit = Math.min(Math.max(options?.limit ?? 40, 1), 80);
  const rows = await prisma.$queryRaw<BaseCashCreditRecord[]>`
    SELECT c.*, v."slug" AS "venueSlug", v."name" AS "venueName"
    FROM "BaseCashVenueCredit" c
    JOIN "Venue" v ON v."id" = c."venueId"
    ORDER BY c."createdAt" DESC
    LIMIT ${limit}
  `;

  return rows;
}

export async function markBaseCashVenueSettled(input: {
  venueId: string;
  settlementReference?: string | null;
  actor: string;
}) {
  const now = new Date();
  return prisma.$executeRaw`
    UPDATE "BaseCashVenueCredit"
    SET
      "settlementStatus" = 'SETTLED',
      "settlementReference" = ${cleanOptional(input.settlementReference, 180)},
      "updatedAt" = ${now}
    WHERE "venueId" = ${input.venueId}
      AND "paymentStatus" = 'PAID'
      AND "redemptionStatus" = 'REDEEMED'
      AND "settlementStatus" <> 'SETTLED'
  `;
}
