import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findDareForModeration, moderateDareDecision } from '@/lib/dare-moderation';
import {
  getPendingTelegramPlaceTags,
  getTelegramPlaceStats,
  reviewTelegramPlaceTag,
  searchTelegramPlaces,
} from '@/lib/telegram-place-memory';
import { forbiddenTelegramAdminResponse, hasValidTelegramAdminSecret } from '@/lib/telegram-admin-auth';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz';

async function sendMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch (error) {
    console.error('[TELEGRAM] admin command sendMessage failed:', error);
  }
}

function forbiddenResponse() {
  return forbiddenTelegramAdminResponse();
}

function methodNotAllowedResponse() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

export async function POST(req: NextRequest) {
  if (!hasValidTelegramAdminSecret(req)) return forbiddenResponse();
  return methodNotAllowedResponse();
}

export async function PUT(req: NextRequest) {
  if (!hasValidTelegramAdminSecret(req)) return forbiddenResponse();
  return methodNotAllowedResponse();
}

/**
 * GET /api/telegram/command?cmd=pending
 * GET /api/telegram/command?cmd=approve&id=xxx
 * GET /api/telegram/command?cmd=reject&id=xxx&reason=xxx
 * GET /api/telegram/command?cmd=sentinelpending
 * GET /api/telegram/command?cmd=stats
 * GET /api/telegram/command?cmd=place&q=hideaway
 * GET /api/telegram/command?cmd=placepending
 * GET /api/telegram/command?cmd=placeapprove&id=xxx
 * GET /api/telegram/command?cmd=placereject&id=xxx&reason=xxx
 * GET /api/telegram/command?cmd=placeflag&id=xxx&reason=xxx
 * GET /api/telegram/command?cmd=placestats
 */
export async function GET(req: NextRequest) {
  if (!hasValidTelegramAdminSecret(req)) {
    return forbiddenResponse();
  }

  const { searchParams } = new URL(req.url);
  const cmd = searchParams.get('cmd');
  const id = searchParams.get('id');
  const reason = searchParams.get('reason');
  const q = searchParams.get('q');

  if (!cmd) {
    return NextResponse.json({
      error: 'Missing cmd parameter',
      usage: {
        pending: '/api/telegram/command?cmd=pending',
        approve: '/api/telegram/command?cmd=approve&id=xxx',
        reject: '/api/telegram/command?cmd=reject&id=xxx&reason=xxx',
        sentinelpending: '/api/telegram/command?cmd=sentinelpending',
        stats: '/api/telegram/command?cmd=stats',
        place: '/api/telegram/command?cmd=place&q=hideaway',
        placepending: '/api/telegram/command?cmd=placepending',
        placeapprove: '/api/telegram/command?cmd=placeapprove&id=xxx',
        placereject: '/api/telegram/command?cmd=placereject&id=xxx&reason=xxx',
        placeflag: '/api/telegram/command?cmd=placeflag&id=xxx&reason=xxx',
        placestats: '/api/telegram/command?cmd=placestats',
      }
    }, { status: 400 });
  }

  switch (cmd) {
    case 'pending': {
      const pendingDares = await prisma.dare.findMany({
        where: {
          OR: [
            { status: 'PENDING_REVIEW' },
            { appealStatus: 'PENDING' },
            { status: 'AWAITING_CLAIM' },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (pendingDares.length === 0) {
        await sendMessage('✅ <b>No pending dares</b>\n\nAll caught up!');
        return NextResponse.json({ success: true, pending: 0 });
      }

      const lines = pendingDares.map((d, i) => {
        const status =
          d.status === 'PENDING_REVIEW'
            ? '🛡 REVIEW'
            : d.appealStatus === 'PENDING'
              ? '⏳ APPEAL'
              : '📨 CLAIM';
        const proofLink = d.videoUrl
          ? d.videoUrl.startsWith('http')
            ? d.videoUrl
            : `${BASE_URL}${d.videoUrl}`
          : null;
        return `${i + 1}. <code>${d.shortId || d.id.slice(0, 8)}</code> ${status}\n   ${d.title.slice(0, 30)}${d.title.length > 30 ? '...' : ''}\n   💰 $${d.bounty} → ${d.streamerHandle || 'Open'}\n   🔗 ${BASE_URL}/dare/${d.shortId || d.id}${proofLink ? `\n   🎥 ${proofLink}` : ''}`;
      });

      const message = `📋 <b>PENDING DARES</b> (${pendingDares.length})\n\n${lines.join('\n\n')}`;
      await sendMessage(message);

      return NextResponse.json({
        success: true,
        pending: pendingDares.length,
        dares: pendingDares.map(d => ({
          id: d.shortId || d.id,
          title: d.title,
          bounty: d.bounty,
          status: d.appealStatus || d.status,
        })),
      });
    }

    case 'approve': {
      if (!id) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
      }

      const dare = await findDareForModeration(id);

      if (!dare) {
        await sendMessage(`❌ Dare not found: <code>${id}</code>`);
        return NextResponse.json({ error: 'Dare not found' }, { status: 404 });
      }

      const result = await moderateDareDecision({
        dareId: dare.id,
        decision: 'APPROVE',
        sourceContext: 'TELEGRAM_COMMAND',
        moderatorAddress: 'telegram-command',
        note: 'Approved via Telegram command.',
        notificationMessage: `Your proof for "${dare.title}" was approved via Telegram command.`,
      });

      const payoutLines = result.payout
        ? `\n• Creator: $${result.payout.streamer.toFixed(2)}\n• Platform: $${result.payout.house.toFixed(2)}`
        : '';
      const pendingLine = result.newStatus === 'PENDING_PAYOUT' ? `\n⏳ ${result.pendingReason || 'Payout queued for retry.'}` : '';
      const message = `✅ <b>DARE APPROVED</b>\n\n<b>${dare.title}</b>\n👤 ${dare.streamerHandle || 'Open Dare'}\n💰 $${dare.bounty} USDC\n\n<b>Status:</b> ${result.newStatus}${payoutLines}${pendingLine}\n\n🔗 <a href="${BASE_URL}/dare/${dare.shortId || dare.id}">View</a>\n🛡 <a href="${BASE_URL}/admin">Open Admin</a>`;
      await sendMessage(message);

      return NextResponse.json({ success: true, approved: dare.id });
    }

    case 'reject': {
      if (!id) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
      }

      const dare = await findDareForModeration(id);

      if (!dare) {
        await sendMessage(`❌ Dare not found: <code>${id}</code>`);
        return NextResponse.json({ error: 'Dare not found' }, { status: 404 });
      }

      await moderateDareDecision({
        dareId: dare.id,
        decision: 'REJECT',
        sourceContext: 'TELEGRAM_COMMAND',
        moderatorAddress: 'telegram-command',
        note: reason || 'Rejected by Telegram command.',
        rejectReason: reason || 'Rejected by Telegram command.',
      });

      const message = `❌ <b>DARE REJECTED</b>\n\n<b>${dare.title}</b>\n📝 Reason: ${reason || 'Rejected by admin'}\n\n🔗 <a href="${BASE_URL}/dare/${dare.shortId || dare.id}">View</a>\n🛡 <a href="${BASE_URL}/admin">Open Admin</a>`;
      await sendMessage(message);

      return NextResponse.json({ success: true, rejected: dare.id });
    }

    case 'sentinelpending': {
      const pendingDares = await prisma.dare.findMany({
        where: {
          manualReviewNeeded: true,
          sentinelVerified: false,
        },
        orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
        take: 10,
        select: {
          id: true,
          shortId: true,
          title: true,
          bounty: true,
          streamerHandle: true,
          updatedAt: true,
        },
      });

      if (pendingDares.length === 0) {
        await sendMessage('✅ <b>No Sentinel reviews pending</b>\n\nThe trust queue is clear.');
        return NextResponse.json({ success: true, pending: 0, dares: [] });
      }

      const lines = pendingDares.map((dare, index) => (
        `${index + 1}. <code>${dare.shortId || dare.id.slice(0, 8)}</code>\n   ${dare.title.slice(0, 36)}${dare.title.length > 36 ? '...' : ''}\n   💰 $${dare.bounty} • ${dare.streamerHandle || 'Open'}\n   🕒 ${new Date(dare.updatedAt).toLocaleString('en-AU', { hour12: false, timeZone: 'Australia/Sydney' })}\n   🔗 <a href="${BASE_URL}/dare/${dare.shortId || dare.id}">Open review</a>`
      ));

      await sendMessage(`🔍 <b>SENTINEL REVIEW QUEUE</b> (${pendingDares.length})\n\n${lines.join('\n\n')}`);

      return NextResponse.json({
        success: true,
        pending: pendingDares.length,
        dares: pendingDares.map((dare) => ({
          id: dare.shortId || dare.id,
          title: dare.title,
          bounty: dare.bounty,
          streamerHandle: dare.streamerHandle,
          updatedAt: dare.updatedAt,
        })),
      });
    }

    case 'stats': {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [totalDares, todayDares, pendingReview, verified, totalVolume] = await Promise.all([
        prisma.dare.count(),
        prisma.dare.count({ where: { createdAt: { gte: today } } }),
        prisma.dare.count({ where: { OR: [{ appealStatus: 'PENDING' }, { status: 'PENDING_REVIEW' }] } }),
        prisma.dare.count({ where: { status: 'VERIFIED' } }),
        prisma.dare.aggregate({ _sum: { bounty: true } }),
      ]);

      const message = `📊 <b>STATS</b>\n\n📈 Total: ${totalDares}\n🆕 Today: ${todayDares}\n⏳ Pending: ${pendingReview}\n✅ Verified: ${verified}\n💰 Volume: $${(totalVolume._sum.bounty || 0).toLocaleString()}`;
      await sendMessage(message);

      return NextResponse.json({
        success: true,
        stats: { totalDares, todayDares, pendingReview, verified, totalVolume: totalVolume._sum.bounty || 0 }
      });
    }

    case 'place': {
      if (!q?.trim()) {
        return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 });
      }

      const places = await searchTelegramPlaces(q, 6);
      const formatted = places.map((place) => ({
        id: place.id,
        slug: place.slug,
        name: place.name,
        address: place.address,
        city: place.city,
        country: place.country,
        sparks: place._count.placeTags,
        mapUrl: `${BASE_URL}/map?place=${encodeURIComponent(place.slug)}`,
        placeUrl: `${BASE_URL}/venues/${place.slug}`,
      }));

      if (formatted.length > 0) {
        const lines = formatted.map((place, index) => (
          `${index + 1}. <b>${place.name}</b>\n   📍 ${[place.city, place.country].filter(Boolean).join(', ') || 'Unknown'}\n   ⚡ ${place.sparks} sparks\n   🗺 <a href="${place.mapUrl}">Open on map</a>`
        ));
        await sendMessage(`🗺 <b>PLACE SEARCH</b>\n\n${lines.join('\n\n')}`);
      } else {
        await sendMessage(`❌ <b>No known BaseDare places</b> for "${q}"`);
      }

      return NextResponse.json({ success: true, places: formatted });
    }

    case 'placepending': {
      const pendingTags = await getPendingTelegramPlaceTags(10);

      if (pendingTags.length === 0) {
        await sendMessage('✅ <b>No pending place tags</b>\n\nThe grid is caught up!');
        return NextResponse.json({ success: true, pending: 0, tags: [] });
      }

      const lines = pendingTags.map((tag, index) => {
        const creator = tag.creatorTag || `${tag.walletAddress.slice(0, 6)}...${tag.walletAddress.slice(-4)}`;
        return `${index + 1}. <code>${tag.id.slice(0, 8)}</code> → <b>${tag.venue.name}</b>\n   👤 ${creator}\n   📝 ${tag.caption || 'No caption'}\n   🗺 <a href="${BASE_URL}/map?place=${encodeURIComponent(tag.venue.slug)}">Open on map</a>`;
      });

      await sendMessage(`📍 <b>PENDING PLACE TAGS</b> (${pendingTags.length})\n\n${lines.join('\n\n')}`);

      return NextResponse.json({
        success: true,
        pending: pendingTags.length,
        tags: pendingTags.map((tag) => ({
          id: tag.id,
          venue: tag.venue.name,
          venueSlug: tag.venue.slug,
          creatorTag: tag.creatorTag,
          caption: tag.caption,
        })),
      });
    }

    case 'placeapprove':
    case 'placereject':
    case 'placeflag': {
      if (!id) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
      }

      const action =
        cmd === 'placeapprove' ? 'APPROVE' : cmd === 'placereject' ? 'REJECT' : 'FLAG';

      const result = await reviewTelegramPlaceTag({
        tagRef: id,
        action,
        reason: reason || undefined,
        reviewerWallet: 'telegram-admin',
      });

      if (!result.ok) {
        await sendMessage(`❌ ${result.error}`);
        return NextResponse.json({ error: result.error }, { status: 404 });
      }

      const messageLines = [
        `${action === 'APPROVE' ? '✅' : action === 'REJECT' ? '❌' : '🚩'} <b>PLACE TAG ${action}</b>`,
        '',
        `<b>${result.tag.venue.name}</b>`,
        result.tag.creatorTag || `${result.tag.walletAddress.slice(0, 6)}...${result.tag.walletAddress.slice(-4)}`,
        action === 'APPROVE' && result.firstMark ? '⚡ First spark unlocked' : null,
        reason ? `📝 ${reason}` : null,
        `🗺 <a href="${BASE_URL}/map?place=${encodeURIComponent(result.tag.venue.slug)}">Open on map</a>`,
      ].filter(Boolean);

      await sendMessage(messageLines.join('\n'));

      return NextResponse.json({
        success: true,
        reviewed: result.tag.id,
        status: result.status,
        venueSlug: result.tag.venue.slug,
      });
    }

    case 'placestats': {
      const stats = await getTelegramPlaceStats();
      await sendMessage(
        `🧠 <b>PLACE MEMORY STATS</b>\n\n📍 Total places: ${stats.totalPlaces}\n✅ Active places: ${stats.activePlaces}\n⏳ Pending place tags: ${stats.pendingPlaceTags}\n⚡ Approved sparks: ${stats.approvedPlaceTags}\n🔥 Hot places (3+ sparks): ${stats.hotPlaces}`
      );

      return NextResponse.json({ success: true, stats });
    }

    default:
      return NextResponse.json({ error: 'Unknown command' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!hasValidTelegramAdminSecret(req)) return forbiddenResponse();
  return methodNotAllowedResponse();
}

export async function DELETE(req: NextRequest) {
  if (!hasValidTelegramAdminSecret(req)) return forbiddenResponse();
  return methodNotAllowedResponse();
}
