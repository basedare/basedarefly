import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz';

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

interface QueryIntent {
  type: 'list' | 'count' | 'sum' | 'unknown';
  filters: {
    minAmount?: number;
    maxAmount?: number;
    status?: string;
    streamerTag?: string;
    timeframe?: 'today' | 'week' | 'month' | 'all';
  };
  limit: number;
}

/**
 * Parse natural language query into structured intent
 */
function parseQuery(query: string): QueryIntent {
  const q = query.toLowerCase();
  const intent: QueryIntent = {
    type: 'list',
    filters: {},
    limit: 5,
  };

  // Detect query type
  if (/how many|count|total number/i.test(q)) {
    intent.type = 'count';
  } else if (/total.*\$|sum|volume/i.test(q)) {
    intent.type = 'sum';
  }

  // Amount filters
  const overMatch = q.match(/(?:over|above|more than|greater than|\>)\s*\$?(\d+)/i);
  if (overMatch) {
    intent.filters.minAmount = parseInt(overMatch[1]);
  }

  const underMatch = q.match(/(?:under|below|less than|\<)\s*\$?(\d+)/i);
  if (underMatch) {
    intent.filters.maxAmount = parseInt(underMatch[1]);
  }

  const exactMatch = q.match(/(?:exactly|\=)\s*\$?(\d+)/i);
  if (exactMatch) {
    intent.filters.minAmount = parseInt(exactMatch[1]);
    intent.filters.maxAmount = parseInt(exactMatch[1]);
  }

  // Status filters
  if (/pending|awaiting|waiting/i.test(q)) {
    intent.filters.status = 'PENDING';
  } else if (/verified|completed|done|approved/i.test(q)) {
    intent.filters.status = 'VERIFIED';
  } else if (/failed|rejected/i.test(q)) {
    intent.filters.status = 'FAILED';
  } else if (/flagged|review/i.test(q)) {
    intent.filters.status = 'AWAITING_CLAIM';
  }

  // Streamer filter
  const streamerMatch = q.match(/@(\w+)/);
  if (streamerMatch) {
    intent.filters.streamerTag = `@${streamerMatch[1]}`;
  }

  // Timeframe
  if (/today/i.test(q)) {
    intent.filters.timeframe = 'today';
  } else if (/this week|past week|last 7/i.test(q)) {
    intent.filters.timeframe = 'week';
  } else if (/this month|past month|last 30/i.test(q)) {
    intent.filters.timeframe = 'month';
  }

  // Limit
  const limitMatch = q.match(/(?:top|first|show me|list)\s*(\d+)/i);
  if (limitMatch) {
    intent.limit = Math.min(parseInt(limitMatch[1]), 10);
  }

  return intent;
}

/**
 * Build Prisma where clause from intent
 */
function buildWhereClause(intent: QueryIntent) {
  const where: Record<string, unknown> = {};

  if (intent.filters.minAmount || intent.filters.maxAmount) {
    where.bounty = {};
    if (intent.filters.minAmount) {
      (where.bounty as Record<string, number>).gte = intent.filters.minAmount;
    }
    if (intent.filters.maxAmount) {
      (where.bounty as Record<string, number>).lte = intent.filters.maxAmount;
    }
  }

  if (intent.filters.status) {
    where.status = intent.filters.status;
  }

  if (intent.filters.streamerTag) {
    where.streamerHandle = intent.filters.streamerTag;
  }

  if (intent.filters.timeframe) {
    const now = new Date();
    let startDate: Date;

    switch (intent.filters.timeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    where.createdAt = { gte: startDate };
  }

  return where;
}

/**
 * Execute query and format response
 */
async function executeQuery(intent: QueryIntent): Promise<string> {
  const where = buildWhereClause(intent);

  switch (intent.type) {
    case 'count': {
      const count = await prisma.dare.count({ where });
      return `📊 <b>Count:</b> ${count} dare(s) found`;
    }

    case 'sum': {
      const result = await prisma.dare.aggregate({
        where,
        _sum: { bounty: true },
      });
      const total = result._sum.bounty || 0;
      return `💰 <b>Total Volume:</b> $${total.toLocaleString()} USDC`;
    }

    case 'list':
    default: {
      const dares = await prisma.dare.findMany({
        where,
        orderBy: { bounty: 'desc' },
        take: intent.limit,
      });

      if (dares.length === 0) {
        return '🔍 No dares found matching your query';
      }

      const lines = dares.map((d, i) => {
        const status = d.status === 'VERIFIED' ? '✅' : d.status === 'FAILED' ? '❌' : '⏳';
        return `${i + 1}. ${status} <b>$${d.bounty}</b> - ${d.title.slice(0, 25)}${d.title.length > 25 ? '...' : ''}\n   <code>${d.shortId || d.id.slice(0, 8)}</code> → ${d.streamerHandle || 'Open'}`;
      });

      return `🔍 <b>Found ${dares.length} dare(s):</b>\n\n${lines.join('\n\n')}`;
    }
  }
}

/**
 * GET /api/telegram/query?q=show me dares over $100
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({
      error: 'Missing q parameter',
      examples: [
        'show me dares over $100',
        'how many pending dares',
        'total volume this week',
        'dares for @KaiCenat',
        'top 5 biggest dares',
      ]
    }, { status: 400 });
  }

  try {
    const intent = parseQuery(query);
    const result = await executeQuery(intent);

    // Send to Telegram
    await sendMessage(result);

    return NextResponse.json({
      success: true,
      query,
      intent,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
