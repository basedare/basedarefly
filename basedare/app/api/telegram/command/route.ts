import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { alertVerification } from '@/lib/telegram';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz';

// Fee distribution constants
const STREAMER_FEE_PERCENT = 89;
const HOUSE_FEE_PERCENT = 10;
const REFERRER_FEE_PERCENT = 1;

async function sendMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;

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
}

/**
 * GET /api/telegram/command?cmd=pending
 * GET /api/telegram/command?cmd=approve&id=xxx
 * GET /api/telegram/command?cmd=reject&id=xxx&reason=xxx
 * GET /api/telegram/command?cmd=stats
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cmd = searchParams.get('cmd');
  const id = searchParams.get('id');
  const reason = searchParams.get('reason');

  if (!cmd) {
    return NextResponse.json({
      error: 'Missing cmd parameter',
      usage: {
        pending: '/api/telegram/command?cmd=pending',
        approve: '/api/telegram/command?cmd=approve&id=xxx',
        reject: '/api/telegram/command?cmd=reject&id=xxx&reason=xxx',
        stats: '/api/telegram/command?cmd=stats',
      }
    }, { status: 400 });
  }

  switch (cmd) {
    case 'pending': {
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
        await sendMessage('✅ <b>No pending dares</b>\n\nAll caught up!');
        return NextResponse.json({ success: true, pending: 0 });
      }

      const lines = pendingDares.map((d, i) => {
        const status = d.appealStatus === 'PENDING' ? '⏳ REVIEW' : '📨 CLAIM';
        return `${i + 1}. <code>${d.shortId || d.id.slice(0, 8)}</code> ${status}\n   ${d.title.slice(0, 30)}${d.title.length > 30 ? '...' : ''}\n   💰 $${d.bounty} → ${d.streamerHandle || 'Open'}`;
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

      const dare = await prisma.dare.findFirst({
        where: {
          OR: [
            { shortId: id },
            { id: id },
            { id: { startsWith: id } },
          ],
        },
      });

      if (!dare) {
        await sendMessage(`❌ Dare not found: <code>${id}</code>`);
        return NextResponse.json({ error: 'Dare not found' }, { status: 404 });
      }

      if (dare.status === 'VERIFIED') {
        return NextResponse.json({ error: 'Already verified' }, { status: 400 });
      }

      const totalBounty = dare.bounty;
      const streamerPayout = (totalBounty * STREAMER_FEE_PERCENT) / 100;
      const houseFee = (totalBounty * HOUSE_FEE_PERCENT) / 100;
      const referrerFee = dare.referrerTag ? (totalBounty * REFERRER_FEE_PERCENT) / 100 : 0;

      await prisma.dare.update({
        where: { id: dare.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          appealStatus: 'APPROVED',
          verifyConfidence: 1.0,
          referrerPayout: referrerFee > 0 ? referrerFee : null,
        },
      });

      const message = `✅ <b>DARE APPROVED</b>\n\n<b>${dare.title}</b>\n👤 ${dare.streamerHandle || 'Open Dare'}\n💰 $${totalBounty} USDC\n\n<b>Payout:</b>\n• Creator: $${streamerPayout.toFixed(2)}\n• Platform: $${houseFee.toFixed(2)}${referrerFee > 0 ? `\n• Referrer: $${referrerFee.toFixed(2)}` : ''}\n\n🔗 <a href="${BASE_URL}/dare/${dare.shortId || dare.id}">View</a>`;
      await sendMessage(message);

      alertVerification({
        dareId: dare.id,
        shortId: dare.shortId || dare.id,
        title: dare.title,
        streamerTag: dare.streamerHandle,
        result: 'VERIFIED',
        confidence: 100,
        payout: streamerPayout,
      }).catch(() => {});

      return NextResponse.json({ success: true, approved: dare.id });
    }

    case 'reject': {
      if (!id) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
      }

      const dare = await prisma.dare.findFirst({
        where: {
          OR: [
            { shortId: id },
            { id: id },
            { id: { startsWith: id } },
          ],
        },
      });

      if (!dare) {
        await sendMessage(`❌ Dare not found: <code>${id}</code>`);
        return NextResponse.json({ error: 'Dare not found' }, { status: 404 });
      }

      await prisma.dare.update({
        where: { id: dare.id },
        data: {
          status: 'FAILED',
          appealStatus: 'REJECTED',
          appealReason: reason || 'Rejected by admin',
        },
      });

      const message = `❌ <b>DARE REJECTED</b>\n\n<b>${dare.title}</b>\n📝 Reason: ${reason || 'Rejected by admin'}\n\n🔗 <a href="${BASE_URL}/dare/${dare.shortId || dare.id}">View</a>`;
      await sendMessage(message);

      return NextResponse.json({ success: true, rejected: dare.id });
    }

    case 'stats': {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [totalDares, todayDares, pendingReview, verified, totalVolume] = await Promise.all([
        prisma.dare.count(),
        prisma.dare.count({ where: { createdAt: { gte: today } } }),
        prisma.dare.count({ where: { appealStatus: 'PENDING' } }),
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

    default:
      return NextResponse.json({ error: 'Unknown command' }, { status: 400 });
  }
}
