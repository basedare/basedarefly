import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { summarizeDeliveryEconomics, type DeliveryEntry } from '@/lib/delivery-economics';

export async function getSprintEconomics(sprintId: string) {
  const [sprint, records, repeatRequests] = await Promise.all([
    prisma.verifiedFieldSprint.findUniqueOrThrow({ where: { id: sprintId }, include: { missions: true } }),
    prisma.founderEvent.findMany({ where: { eventType: 'DELIVERY_ECONOMICS_ENTRY', subjectType: 'verified_field_sprint', subjectId: sprintId }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] }),
    prisma.verifiedFieldSprintBuyerDecision.count({ where: { sprintId, decision: { in: ['REPEAT', 'ADJUST'] } } }),
  ]);
  const entries = records.map((record) => record.metadataJson as unknown as DeliveryEntry);
  const summary = summarizeDeliveryEconomics({
    complete: sprint.status === 'COMPLETE', serviceCollectedUsd: sprint.serviceFeeConfirmedUsd, rewardCollectedUsd: sprint.rewardPoolConfirmedUsd,
    contributorPayoutUsd: sprint.missions.reduce((sum, m) => sum + (m.contributorPayoutUsd ?? 0), 0),
    settlementRevenueUsd: sprint.missions.reduce((sum, m) => sum + (m.platformFeeUsd ?? 0), 0),
    reviewCostUsd: sprint.missions.reduce((sum, m) => sum + m.reviewCostUsd, 0),
    reviewMinutes: sprint.missions.reduce((sum, m) => sum + m.reviewMinutes, 0),
    entries, repeatRequests,
  });
  const laterOrders = sprint.buyerWalletAddress && sprint.completedAt ? await prisma.verifiedFieldSprint.findMany({ where: {
    buyerWalletAddress: { equals: sprint.buyerWalletAddress, mode: 'insensitive' }, status: 'COMPLETE',
    fundedAt: { gt: sprint.completedAt }, serviceFeeConfirmedUsd: { gt: 0 },
  }, select: { id: true, serviceFeeConfirmedUsd: true } }) : null;
  const laterRefunds = laterOrders?.length ? await prisma.founderEvent.findMany({ where: { eventType: 'DELIVERY_ECONOMICS_ENTRY', subjectId: { in: laterOrders.map((order) => order.id) } }, select: { subjectId: true, metadataJson: true } }) : [];
  const paidRepeatPurchases = laterOrders ? laterOrders.filter((order) => {
    const refunds = laterRefunds.filter((r) => r.subjectId === order.id).map((r) => r.metadataJson as unknown as DeliveryEntry).filter((e) => e.kind === 'SERVICE_REFUND').reduce((sum, e) => sum + e.amountUsd, 0);
    return (order.serviceFeeConfirmedUsd ?? 0) > refunds;
  }).length : null;
  return { ...summary, paidRepeatPurchases, entries: records.map((r) => ({ id: r.id, recordedAt: r.occurredAt, ...(r.metadataJson as unknown as DeliveryEntry) })) };
}

export async function recordSprintEconomics(input: DeliveryEntry & { sprintId: string; requestId: string; actor: string }) {
  await prisma.$transaction(async (tx) => {
    const sprint = await tx.verifiedFieldSprint.findUniqueOrThrow({ where: { id: input.sprintId } });
    const data: DeliveryEntry = { kind: input.kind, amountUsd: input.amountUsd, minutes: input.minutes, note: input.note.trim() };
    const dedupeKey = `delivery-economics:${input.requestId}`;
    const existing = await tx.founderEvent.findUnique({ where: { dedupeKey } });
    if (existing) {
      if (existing.subjectId !== sprint.id || JSON.stringify(existing.metadataJson) !== JSON.stringify(data)) {
        // JSONB key order is not stable; compare values below before rejecting.
        const saved = existing.metadataJson as unknown as DeliveryEntry;
        if (existing.subjectId !== sprint.id || saved.kind !== data.kind || saved.amountUsd !== data.amountUsd || saved.minutes !== data.minutes || saved.note !== data.note) throw new Error('This request was already used for a different entry.');
      }
      return;
    }
    if (input.kind === 'RECONCILED' && sprint.status !== 'COMPLETE') throw new Error('Close the delivered Sprint before reconciling final costs.');
    if (input.kind === 'SERVICE_REFUND' || input.kind === 'REWARD_REFUND') {
      const records = await tx.founderEvent.findMany({ where: { eventType: 'DELIVERY_ECONOMICS_ENTRY', subjectId: sprint.id } });
      const prior = records.map((r) => r.metadataJson as unknown as DeliveryEntry);
      const refunded = prior.filter((e) => e.kind === input.kind).reduce((sum, e) => sum + e.amountUsd, 0);
      const missions = await tx.verifiedFieldSprintMission.findMany({ where: { sprintId: sprint.id } });
      const settled = missions.reduce((sum, m) => sum + (m.contributorPayoutUsd ?? 0) + (m.platformFeeUsd ?? 0), 0);
      const available = input.kind === 'SERVICE_REFUND' ? (sprint.serviceFeeConfirmedUsd ?? 0)
        : (sprint.rewardPoolConfirmedUsd ?? 0) + prior.filter((e) => e.kind === 'SUPPLEMENTAL_REWARD_FUNDS').reduce((sum, e) => sum + e.amountUsd, 0) - settled;
      if (Math.round((refunded + input.amountUsd) * 100) > Math.round(available * 100)) throw new Error('Refund exceeds the recorded available funds.');
    }
    await tx.founderEvent.create({ data: {
      eventType: 'DELIVERY_ECONOMICS_ENTRY', source: 'sprint-operator', subjectType: 'verified_field_sprint', subjectId: sprint.id,
      dedupeKey, actor: input.actor, title: input.kind, amount: input.amountUsd, status: 'RECORDED', metadataJson: data as unknown as Prisma.InputJsonValue,
    } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return getSprintEconomics(input.sprintId);
}
