import { NextResponse } from 'next/server';
import { testBotConnection } from '@/lib/telegram';

/**
 * GET /api/telegram/test
 * Test the Telegram bot connection
 */
export async function GET() {
  const result = await testBotConnection();

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Telegram bot connected! Check your admin chat.',
    });
  }

  return NextResponse.json(
    {
      success: false,
      error: result.error,
      hint: 'Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID are set in .env.local',
    },
    { status: 500 }
  );
}
