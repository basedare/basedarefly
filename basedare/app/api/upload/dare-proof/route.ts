import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { PinataSDK } from 'pinata';
import { prisma } from '@/lib/prisma';
import { getAuthorizedProofSubmitterWallet } from '@/lib/proof-submit-auth-server';
import { hasContentRightsAcceptance } from '@/lib/content-rights-server';
import { readContentDelivery } from '@/lib/content-delivery';
import { hasRecordedRewardFunding } from '@/lib/reward-funding';
import { checkRateLimit } from '@/lib/rate-limit';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { DARE_MEDIA_CONSENT_VERSION, DARE_PROOF_TICKET, DARE_PROOF_TICKET_SECONDS, DareProofCompleteSchema, DareProofPrepareSchema, DareProofTicketSchema, dareProofTicketKey, matchingDareProofFile } from '@/lib/dare-proof-media';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
const success = (data: Record<string, unknown>) => NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
const gateway = () => process.env.PINATA_GATEWAY || 'purple-void-gateway.pinata.cloud';

export async function POST(request: NextRequest) {
  try {
    // Only metadata passes through this function; the video is sent directly to storage.
    let raw: unknown;
    try { raw = JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 8192))); }
    catch { return fail('Invalid proof upload request.', 400); }
    const receivedAt = new Date();
    const prepared = DareProofPrepareSchema.safeParse(raw);
    const completed = DareProofCompleteSchema.safeParse(raw);
    if (!prepared.success && !completed.success) return fail('Invalid proof upload request.', 400);
    const input = prepared.success ? prepared.data : completed.success ? completed.data : null;
    if (!input) return fail('Invalid proof upload request.', 400);
    const dare = await prisma.dare.findUnique({ where: { id: input.dareId }, select: { id: true, title: true, streamerHandle: true, status: true, bounty: true, isSimulated: true, txHash: true, onChainDareId: true, expiresAt: true, videoUrl: true, proofCid: true, claimedBy: true, targetWalletAddress: true, stakerAddress: true, outcomeContractSnapshot: true } });
    if (!dare) return fail('Dare not found.', 404);
    const assignee = (dare.claimedBy || dare.targetWalletAddress)?.toLowerCase();
    // Paid public dares are submitted by the assigned participant, not a visitor or funder.
    const wallets = dare.bounty > 0 ? [assignee] : [assignee, dare.stakerAddress];
    const wallet = await getAuthorizedProofSubmitterWallet(request, { dareId: dare.id, authorizedWallets: wallets });
    if (!wallet) return fail('Sign in as the assigned participant to submit proof.', 401);
    if (dare.bounty > 0 && !dare.isSimulated && !hasRecordedRewardFunding(dare)) return fail('This dare does not have recorded reward funding.', 409);
    if (dare.status !== 'PENDING') return fail('This dare is no longer accepting proof.', 409);
    if (!(await hasContentRightsAcceptance(dare))) return fail('Accept the existing content delivery terms first.', 409);
    const content = readContentDelivery(dare.outcomeContractSnapshot);
    if (content?.assetType === 'PHOTO') return fail('This brief requires a photo.', 400);
    if (content && wallet !== assignee) return fail('Only the assigned contributor can deliver this content.', 403);
    if (dare.videoUrl && dare.proofCid) return success({ success: true, existingProof: true, cid: dare.proofCid, url: dare.videoUrl, status: dare.status });
    if (dare.proofCid || dare.videoUrl) return fail('Proof is being recovered. Reload the dare.', 409);
    if ((dare.expiresAt && dare.expiresAt <= receivedAt) || (content && receivedAt.getTime() > Date.parse(content.deadline))) return fail('The dare delivery window has closed.', 409);
    if (!process.env.PINATA_JWT) return fail('Video storage is unavailable. Please try again later.', 503);
    const pinata = new PinataSDK({ pinataJwt: process.env.PINATA_JWT, pinataGateway: gateway() });

    if (input.action === 'prepare') {
      if (!checkRateLimit(`dare-proof-ticket:${dare.id}:${wallet}`, { limit: 8, windowMs: DARE_PROOF_TICKET_SECONDS * 1000 }).allowed) return fail('Too many upload attempts. Please wait before retrying.', 429);
      const ticket = randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + DARE_PROOF_TICKET_SECONDS * 1000).toISOString();
      const credit = dare.streamerHandle && !['@open','@everyone'].includes(dare.streamerHandle.toLowerCase()) ? dare.streamerHandle.slice(0, 200) : 'BaseDare contributor';
      const metadata = DareProofTicketSchema.parse({ ticket, name: `BaseDare_Proof_${dare.id}`, mime: input.mime, size: input.size, sha256: input.sha256, consent: input.consent, version: DARE_MEDIA_CONSENT_VERSION, expiresAt, clipTitle: dare.title.slice(0, 200), requiredCredit: credit });
      const signedUrl = await pinata.upload.public.createSignedURL({ expires: DARE_PROOF_TICKET_SECONDS, name: metadata.name, maxFileSize: input.size, mimeTypes: [input.mime], keyvalues: { basedareDare: dare.id, basedareTicket: ticket, app: 'basedare' } });
      const signedOrigin = new URL(signedUrl);
      if (signedOrigin.protocol !== 'https:' || signedOrigin.hostname !== 'uploads.pinata.cloud') return fail('Could not prepare secure video upload.', 502);
      // The existing private operations ledger holds the immutable, expiring grant.
      await prisma.founderEvent.create({ data: { eventType: DARE_PROOF_TICKET, source: 'dare-proof-upload', subjectType: 'Dare', subjectId: dare.id, dedupeKey: dareProofTicketKey(ticket), actor: wallet, status: 'ISSUED', metadataJson: metadata as Prisma.InputJsonValue } });
      return success({ success: true, ticket, uploadUrl: signedUrl, expiresAt });
    }

    const record = await prisma.founderEvent.findUnique({ where: { dedupeKey: dareProofTicketKey(input.ticket) } });
    const parsed = DareProofTicketSchema.safeParse(record?.metadataJson);
    if (!record || record.eventType !== DARE_PROOF_TICKET || record.subjectId !== dare.id || record.actor !== wallet || record.status !== 'ISSUED' || !parsed.success) return fail('Upload authorization is not available. Reload your dare.', 409);
    if (Date.parse(parsed.data.expiresAt) <= Date.now()) return NextResponse.json({ error: 'Upload authorization expired. Tap submit to prepare a new video upload.', code: 'UPLOAD_TICKET_EXPIRED' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    const ticket = parsed.data;
    const listed = await pinata.files.public.list().cid(input.cid).keyvalues({ basedareDare: dare.id, basedareTicket: input.ticket }).limit(10);
    const file = listed.files.find(file => matchingDareProofFile(file, ticket, dare.id, input.cid));
    if (!file) return fail('The video has not been confirmed by storage yet. Retry completion.', 409);
    const url = `https://${gateway()}/ipfs/${input.cid}`;
    const attachedAt = new Date();
    const attached = await prisma.$transaction(async tx => {
      const duplicate = await tx.dare.findFirst({ where: { id: { not: dare.id }, OR: [{ proofCid: input.cid }, { videoUrl: url }] }, select: { id: true } });
      if (duplicate) return 'duplicate';
      const result = await tx.dare.updateMany({ where: { id: dare.id, status: 'PENDING', proofCid: null, videoUrl: null, claimedBy: dare.claimedBy, targetWalletAddress: dare.targetWalletAddress, stakerAddress: dare.stakerAddress, expiresAt: dare.expiresAt }, data: { proofCid: input.cid, videoUrl: url, ...(content ? { contentSubmittedAt: receivedAt } : {}) } });
      if (result.count !== 1) return 'changed';
      const saved = await tx.founderEvent.updateMany({ where: { id: record.id, status: 'ISSUED' }, data: { status: 'ATTACHED', metadataJson: { ...ticket, cid: input.cid, fileId: file.id, attachedAt: attachedAt.toISOString() } as Prisma.InputJsonValue } });
      if (saved.count !== 1) throw new Error('Upload ticket was already used.');
      return 'attached';
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (attached === 'duplicate') return fail('This proof belongs to another dare. Submit unique evidence.', 409);
    if (attached !== 'attached') return fail('The dare changed while uploading. Reload to recover its proof.', 409);
    return success({ success: true, cid: input.cid, url, status: 'PENDING' });
  } catch (error) {
    console.error('Dare direct video upload failed:', error instanceof Error ? error.name : 'Unknown');
    return fail('Video upload could not be completed. Retry the same submission.', 503);
  }
}
