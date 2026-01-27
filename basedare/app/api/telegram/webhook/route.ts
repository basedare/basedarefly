import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { alertVerification, alertPayout } from '@/lib/telegram';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz';

// Fee distribution constants
const STREAMER_FEE_PERCENT = 89;
const HOUSE_FEE_PERCENT = 10;
const REFERRER_FEE_PERCENT = 1;

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
}

/**
 * Send message to Telegram
 */
async function sendMessage(chatId: number | string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  if (!TELEGRAM_BOT_TOKEN) return;

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
    const status = d.appealStatus === 'PENDING' ? '⏳ REVIEW' : '📨 CLAIM';
    const amount = `$${d.bounty}`;
    const target = d.streamerHandle || 'Open';
    return `${i + 1}. <code>${d.shortId || d.id.slice(0, 8)}</code> ${status}\n   ${d.title.slice(0, 30)}${d.title.length > 30 ? '...' : ''}\n   💰 ${amount} → ${target}`;
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
  const dare = await prisma.dare.findFirst({
    where: {
      OR: [
        { shortId: dareId },
        { id: dareId },
        { id: { startsWith: dareId } },
      ],
    },
  });

  if (!dare) {
    await sendMessage(chatId, `❌ Dare not found: <code>${dareId}</code>`);
    return;
  }

  if (dare.status === 'VERIFIED') {
    await sendMessage(chatId, `⚠️ Dare already verified: <code>${dareId}</code>`);
    return;
  }

  // Calculate payouts
  const totalBounty = dare.bounty;
  const streamerPayout = (totalBounty * STREAMER_FEE_PERCENT) / 100;
  const houseFee = (totalBounty * HOUSE_FEE_PERCENT) / 100;
  const referrerFee = dare.referrerTag ? (totalBounty * REFERRER_FEE_PERCENT) / 100 : 0;

  // Update dare to VERIFIED
  await prisma.dare.update({
    where: { id: dare.id },
    data: {
      status: 'VERIFIED',
      verifiedAt: new Date(),
      appealStatus: 'APPROVED',
      verifyConfidence: 1.0, // Manual approval = 100% confidence
      referrerPayout: referrerFee > 0 ? referrerFee : null,
    },
  });

  // Send success message
  const message = `
✅ <b>DARE APPROVED</b>

<b>${dare.title}</b>
👤 ${dare.streamerHandle || 'Open Dare'}
💰 Bounty: $${totalBounty} USDC

<b>Payout Split:</b>
• Creator: $${streamerPayout.toFixed(2)}
• Platform: $${houseFee.toFixed(2)}
${referrerFee > 0 ? `• Referrer: $${referrerFee.toFixed(2)}` : ''}

🔗 <a href="${BASE_URL}/dare/${dare.shortId || dare.id}">View Dare</a>
`.trim();

  await sendMessage(chatId, message);

  // Send alerts
  alertVerification({
    dareId: dare.id,
    shortId: dare.shortId || dare.id,
    title: dare.title,
    streamerTag: dare.streamerHandle,
    result: 'VERIFIED',
    confidence: 100,
    payout: streamerPayout,
  }).catch(() => {});

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

  const dare = await prisma.dare.findFirst({
    where: {
      OR: [
        { shortId: dareId },
        { id: dareId },
        { id: { startsWith: dareId } },
      ],
    },
  });

  if (!dare) {
    await sendMessage(chatId, `❌ Dare not found: <code>${dareId}</code>`);
    return;
  }

  await prisma.dare.update({
    where: { id: dare.id },
    data: {
      status: 'FAILED',
      appealStatus: 'REJECTED',
      appealReason: reason,
    },
  });

  const message = `
❌ <b>DARE REJECTED</b>

<b>${dare.title}</b>
📝 Reason: ${reason}

🔗 <a href="${BASE_URL}/dare/${dare.shortId || dare.id}">View Dare</a>
`.trim();

  await sendMessage(chatId, message);

  alertVerification({
    dareId: dare.id,
    shortId: dare.shortId || dare.id,
    title: dare.title,
    streamerTag: dare.streamerHandle,
    result: 'FAILED',
  }).catch(() => {});

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
    prisma.dare.count({ where: { appealStatus: 'PENDING' } }),
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
    const update: TelegramUpdate = await req.json();

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
