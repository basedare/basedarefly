import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  beginVerifiedFieldSprintCollection,
  completeVerifiedFieldSprint,
  confirmVerifiedFieldSprintFunding,
  getVerifiedFieldSprint,
  linkVerifiedFieldSprintMission,
  listVerifiedFieldSprints,
  recordVerifiedFieldSprintReviewCost,
  startVerifiedFieldSprint,
  startVerifiedFieldSprintRouting,
  syncVerifiedFieldSprint,
} from '@/lib/verified-field-sprint-server';

const StartSchema = z.object({
  buyerName: z.string().min(1).max(120),
  buyerOrganization: z.string().max(191).nullable().optional(),
  buyerEmail: z.string().email().max(254).nullable().optional(),
  buyerQuestion: z.string().min(8).max(500),
  areaLabel: z.string().min(2).max(191),
  freshnessWindowHours: z.number().int().min(1).max(168),
  campaignCode: z.string().min(3).max(64),
  stationLinkIds: z.array(z.string().min(1).max(191)).length(2),
});

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('CONFIRM_FUNDS'), sprintId: z.string(), serviceFeeConfirmedUsd: z.number().min(0).max(2000), rewardPoolConfirmedUsd: z.number(), designPartnerException: z.boolean().default(false), fundingReference: z.string().min(3).max(191) }),
  z.object({ action: z.literal('START_ROUTING'), sprintId: z.string() }),
  z.object({ action: z.literal('LINK_MISSION'), sprintId: z.string(), ordinal: z.number().int().min(1).max(4), dareId: z.string().min(1) }),
  z.object({ action: z.literal('START_COLLECTING'), sprintId: z.string() }),
  z.object({ action: z.literal('SYNC'), sprintId: z.string() }),
  z.object({ action: z.literal('RECORD_REVIEW_COST'), sprintId: z.string(), ordinal: z.number().int().min(1).max(4), reviewMinutes: z.number().int().min(0), reviewCostUsd: z.number().min(0) }),
  z.object({ action: z.literal('COMPLETE'), sprintId: z.string() }),
]);

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const sprintId = request.nextUrl.searchParams.get('sprintId');
  const data = sprintId ? await getVerifiedFieldSprint(sprintId) : await listVerifiedFieldSprints();
  return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const input = StartSchema.parse(await request.json());
    const sprint = await startVerifiedFieldSprint({ ...input, createdBy: auth.walletAddress });
    return NextResponse.json({ success: true, data: sprint }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const input = ActionSchema.parse(await request.json());
    let data;
    switch (input.action) {
      case 'CONFIRM_FUNDS':
        data = await confirmVerifiedFieldSprintFunding({ ...input, actor: auth.walletAddress });
        break;
      case 'START_ROUTING': data = await startVerifiedFieldSprintRouting(input.sprintId); break;
      case 'LINK_MISSION': data = await linkVerifiedFieldSprintMission(input); break;
      case 'START_COLLECTING': data = await beginVerifiedFieldSprintCollection(input.sprintId); break;
      case 'SYNC': data = await syncVerifiedFieldSprint(input.sprintId); break;
      case 'RECORD_REVIEW_COST': data = await recordVerifiedFieldSprintReviewCost(input); break;
      case 'COMPLETE': data = await completeVerifiedFieldSprint(input.sprintId); break;
    }
    return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to update the Sprint.';
  const conflict = /state|already|cannot be relinked|concurrent|only/i.test(message);
  return NextResponse.json({ success: false, error: message }, { status: conflict ? 409 : 400 });
}
