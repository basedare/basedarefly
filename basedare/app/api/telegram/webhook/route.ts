import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findDareForModeration, moderateDareDecision } from '@/lib/dare-moderation';
import {
  getPendingTelegramPlaceTags,
  getTelegramPlaceStats,
  reviewTelegramPlaceTag,
  searchTelegramPlaces,
} from '@/lib/telegram-place-memory';
import { handleTelegramUpdate, validateTelegramWebhookSecret, type TelegramUpdate } from '@/lib/telegram-bot';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz';

/**
 * Send message to Telegram
 */
async function sendMessage(chatId: number | string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  if (!TELEGRAM_BOT_TOKEN) return;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
  } catch (error) {
    console.error('[TELEGRAM] sendMessage failed:', error);
  }
}

/**
 * Check if user is admin (in admin chat)
 */
function isAdmin(chatId: number): boolean {
  return chatId.toString() === TELEGRAM_ADMIN_CHAT_ID;
}

/**
 * Handle /pending command - List dares awaiting review
 */
async function handlePending(chatId: number) {
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
    await sendMessage(chatId, '✅ <b>No pending dares</b>\n\nAll caught up!');
    return;
  }

  const lines = pendingDares.map((d, i) => {
    const status =
      d.status === 'PENDING_REVIEW'
        ? '🛡 REVIEW'
        : d.appealStatus === 'PENDING'
          ? '⏳ APPEAL'
          : '📨 CLAIM';
    const amount = `$${d.bounty}`;
    const target = d.streamerHandle || 'Open';
    const proofLink = d.videoUrl
      ? d.videoUrl.startsWith('http')
        ? d.videoUrl
        : `${BASE_URL}${d.videoUrl}`
      : null;
    return `${i + 1}. <code>${d.shortId || d.id.slice(0, 8)}</code> ${status}\n   ${d.title.slice(0, 30)}${d.title.length > 30 ? '...' : ''}\n   💰 ${amount} → ${target}\n   🔗 <a href="${BASE_URL}/dare/${d.shortId || d.id}">Open dare</a>${proofLink ? `\n   🎥 <a href="${proofLink}">Open proof</a>` : ''}`;
  });

  const message = `
📋 <b>PENDING DARES</b> (${pendingDares.length})

${lines.join('\n\n')}

Use <code>/approve [id]</code> to approve
Use <code>/reject [id] [reason]</code> to reject
`.trim();

  await sendMessage(chatId, message);
}

/**
 * Handle /approve command - Approve a pending dare
 */
async function handleApprove(chatId: number, args: string) {
  const dareId = args.trim();

  if (!dareId) {
    await sendMessage(chatId, '❌ Usage: <code>/approve [dare_id]</code>\n\nGet IDs from /pending');
    return;
  }

  // Find dare by shortId or id
  const dare = await findDareForModeration(dareId);

  if (!dare) {
    await sendMessage(chatId, `❌ Dare not found: <code>${dareId}</code>`);
    return;
  }

  const result = await moderateDareDecision({
    dareId: dare.id,
    decision: 'APPROVE',
    sourceContext: 'TELEGRAM_WEBHOOK',
    moderatorAddress: 'telegram-webhook',
    note: 'Approved via Telegram command.',
    notificationMessage: `Your proof for "${dare.title}" was approved by Telegram moderation.`,
  });

  // Send success message
  const message = `
✅ <b>DARE APPROVED</b>

<b>${dare.title}</b>
👤 ${dare.streamerHandle || 'Open Dare'}
💰 Bounty: $${dare.bounty} USDC

<b>Status:</b> ${result.newStatus}
${result.payout ? `\n<b>Payout Split:</b>\n• Creator: $${result.payout.streamer.toFixed(2)}\n• Platform: $${result.payout.house.toFixed(2)}` : ''}
${result.newStatus === 'PENDING_PAYOUT' ? `\n⏳ ${result.pendingReason || 'Payout queued for retry.'}` : ''}

🔗 <a href="${BASE_URL}/dare/${dare.shortId || dare.id}">View Dare</a>
🛡 <a href="${BASE_URL}/admin">Open Admin</a>
`.trim();

  await sendMessage(chatId, message);

  console.log(`[AUDIT] Dare ${dare.id} manually approved via Telegram`);
}

/**
 * Handle /reject command - Reject a pending dare
 */
async function handleReject(chatId: number, args: string) {
  const parts = args.trim().split(' ');
  const dareId = parts[0];
  const reason = parts.slice(1).join(' ') || 'Rejected by admin';

  if (!dareId) {
    await sendMessage(chatId, '❌ Usage: <code>/reject [dare_id] [reason]</code>');
    return;
  }

  const dare = await findDareForModeration(dareId);

  if (!dare) {
    await sendMessage(chatId, `❌ Dare not found: <code>${dareId}</code>`);
    return;
  }

  await moderateDareDecision({
    dareId: dare.id,
    decision: 'REJECT',
    sourceContext: 'TELEGRAM_WEBHOOK',
    moderatorAddress: 'telegram-webhook',
    note: reason || 'Rejected by Telegram moderation.',
    rejectReason: reason || 'Rejected by Telegram moderation.',
  });

  const message = `
❌ <b>DARE REJECTED</b>

<b>${dare.title}</b>
📝 Reason: ${reason}

🔗 <a href="${BASE_URL}/dare/${dare.shortId || dare.id}">View Dare</a>
`.trim();

  await sendMessage(chatId, message);

  console.log(`[AUDIT] Dare ${dare.id} rejected via Telegram: ${reason}`);
}

/**
 * Handle /stats command - Quick stats
 */
async function handleStats(chatId: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalDares, todayDares, pendingReview, totalVolume] = await Promise.all([
    prisma.dare.count(),
    prisma.dare.count({ where: { createdAt: { gte: today } } }),
    prisma.dare.count({ where: { OR: [{ appealStatus: 'PENDING' }, { status: 'PENDING_REVIEW' }] } }),
    prisma.dare.aggregate({ _sum: { bounty: true } }),
  ]);

  const message = `
📊 <b>QUICK STATS</b>

📈 Total Dares: ${totalDares}
🆕 Today: ${todayDares}
⏳ Pending Review: ${pendingReview}
💰 Total Volume: $${(totalVolume._sum.bounty || 0).toLocaleString()}
`.trim();

  await sendMessage(chatId, message);
}

async function handlePlaceSearch(chatId: number, args: string) {
  const query = args.trim();

  if (!query) {
    await sendMessage(chatId, '❌ Usage: <code>/place [name or area]</code>');
    return;
  }

  const places = await searchTelegramPlaces(query, 6);

  if (places.length === 0) {
    await sendMessage(chatId, `❌ No known BaseDare places found for <b>${query}</b>.`);
    return;
  }

  const lines = places.map((place, index) => {
    const location = [place.city, place.country].filter(Boolean).join(', ') || 'Unknown location';
    const mapLink = `${BASE_URL}/map?place=${encodeURIComponent(place.slug)}`;
    const placeLink = `${BASE_URL}/venues/${place.slug}`;
    return [
      `${index + 1}. <b>${place.name}</b>`,
      `   📍 ${location}`,
      `   ⚡ ${place._count.placeTags} sparks`,
      `   🗺 <a href="${mapLink}">Open on map</a> · <a href="${placeLink}">Place page</a>`,
    ].join('\n');
  });

  await sendMessage(
    chatId,
    `🗺 <b>PLACE SEARCH</b>\n\n${lines.join('\n\n')}`
  );
}

async function handlePendingPlaceTags(chatId: number) {
  const pendingTags = await getPendingTelegramPlaceTags(10);

  if (pendingTags.length === 0) {
    await sendMessage(chatId, '✅ <b>No pending place tags</b>\n\nThe grid is caught up.');
    return;
  }

  const lines = pendingTags.map((tag, index) => {
    const creator = tag.creatorTag || `${tag.walletAddress.slice(0, 6)}...${tag.walletAddress.slice(-4)}`;
    const mapLink = `${BASE_URL}/map?place=${encodeURIComponent(tag.venue.slug)}`;
    return [
      `${index + 1}. <code>${tag.id.slice(0, 8)}</code> → <b>${tag.venue.name}</b>`,
      `   👤 ${creator}`,
      `   📝 ${tag.caption || 'No caption'}`,
      `   🗺 <a href="${mapLink}">Open on map</a>`,
    ].join('\n');
  });

  await sendMessage(
    chatId,
    `📍 <b>PENDING PLACE TAGS</b> (${pendingTags.length})\n\n${lines.join('\n\n')}\n\nUse <code>/placeapprove [id]</code>, <code>/placereject [id] [reason]</code>, or <code>/placeflag [id] [reason]</code>.`
  );
}

async function handlePlaceReview(
  chatId: number,
  args: string,
  action: 'APPROVE' | 'REJECT' | 'FLAG'
) {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  const tagRef = parts[0];
  const reason = parts.slice(1).join(' ').trim();

  if (!tagRef) {
    const usage =
      action === 'APPROVE'
        ? '/placeapprove [tag_id]'
        : action === 'REJECT'
          ? '/placereject [tag_id] [reason]'
          : '/placeflag [tag_id] [reason]';
    await sendMessage(chatId, `❌ Usage: <code>${usage}</code>`);
    return;
  }

  const result = await reviewTelegramPlaceTag({
    tagRef,
    action,
    reason: reason || undefined,
    reviewerWallet: 'telegram-admin',
  });

  if (!result.ok) {
    await sendMessage(chatId, `❌ ${result.error}`);
    return;
  }

  const mapLink = `${BASE_URL}/map?place=${encodeURIComponent(result.tag.venue.slug)}`;
  const placeLink = `${BASE_URL}/venues/${result.tag.venue.slug}`;

  const actionWord =
    action === 'APPROVE' ? 'approved' : action === 'REJECT' ? 'rejected' : 'flagged';
  const badge =
    action === 'APPROVE' ? '✅' : action === 'REJECT' ? '❌' : '🚩';

  await sendMessage(
    chatId,
    [
      `${badge} <b>PLACE TAG ${actionWord.toUpperCase()}</b>`,
      '',
      `<b>${result.tag.venue.name}</b>`,
      result.tag.creatorTag
        ? `👤 ${result.tag.creatorTag}`
        : `👤 ${result.tag.walletAddress.slice(0, 6)}...${result.tag.walletAddress.slice(-4)}`,
      action === 'APPROVE' && result.firstMark ? '⚡ First spark unlocked' : null,
      reason ? `📝 ${reason}` : null,
      `🗺 <a href="${mapLink}">Open on map</a> · <a href="${placeLink}">Place page</a>`,
    ]
      .filter(Boolean)
      .join('\n')
  );
}

async function handlePlaceStats(chatId: number) {
  const stats = await getTelegramPlaceStats();

  await sendMessage(
    chatId,
    [
      '🧠 <b>PLACE MEMORY STATS</b>',
      '',
      `📍 Total places: ${stats.totalPlaces}`,
      `✅ Active places: ${stats.activePlaces}`,
      `⏳ Pending place tags: ${stats.pendingPlaceTags}`,
      `⚡ Approved sparks: ${stats.approvedPlaceTags}`,
      `🔥 Hot places (3+ sparks): ${stats.hotPlaces}`,
    ].join('\n')
  );
}

/**
 * Handle /help command
 */
async function handleHelp(chatId: number) {
  const message = `
🤖 <b>CLAWDBOT COMMANDS</b>

<b>Review Dares:</b>
/pending - List dares awaiting review
/approve [id] - Approve a dare
/reject [id] [reason] - Reject a dare

<b>Place Memory:</b>
/place [query] - Find a known place
/placepending - List pending place tags
/placeapprove [id] - Approve a place tag
/placereject [id] [reason] - Reject a place tag
/placeflag [id] [reason] - Flag a place tag
/placestats - Place-memory overview

<b>Stats:</b>
/stats - Quick stats overview

<b>Examples:</b>
<code>/approve ftEXgfxL</code>
<code>/reject abc123 Invalid proof</code>
`.trim();

  await sendMessage(chatId, message);
}

/**
 * POST /api/telegram/webhook
 * Telegram bot webhook handler
 */
export async function POST(req: NextRequest) {
  try {
    if (!validateTelegramWebhookSecret(req.headers)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const update: TelegramUpdate = await req.json();
    const handledByBot = await handleTelegramUpdate(update);
    if (handledByBot) {
      return NextResponse.json({ ok: true });
    }

    // Only process messages
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const { chat, text } = update.message;
    const chatId = chat.id;

    // Only allow commands from admin chat
    if (!isAdmin(chatId)) {
      console.log(`[TELEGRAM] Unauthorized command from chat ${chatId}`);
      return NextResponse.json({ ok: true });
    }

    // Parse command
    const [command, ...argParts] = text.split(' ');
    const args = argParts.join(' ');

    switch (command.toLowerCase()) {
      case '/pending':
        await handlePending(chatId);
        break;
      case '/approve':
        await handleApprove(chatId, args);
        break;
      case '/reject':
        await handleReject(chatId, args);
        break;
      case '/stats':
        await handleStats(chatId);
        break;
      case '/place':
        await handlePlaceSearch(chatId, args);
        break;
      case '/placepending':
        await handlePendingPlaceTags(chatId);
        break;
      case '/placeapprove':
        await handlePlaceReview(chatId, args, 'APPROVE');
        break;
      case '/placereject':
        await handlePlaceReview(chatId, args, 'REJECT');
        break;
      case '/placeflag':
        await handlePlaceReview(chatId, args, 'FLAG');
        break;
      case '/placestats':
        await handlePlaceStats(chatId);
        break;
      case '/help':
      case '/start':
        await handleHelp(chatId);
        break;
      default:
        // Ignore unknown commands
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[TELEGRAM] Webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

/**
 * GET /api/telegram/webhook
 * Health check
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', bot: 'clawdbot' });
}
