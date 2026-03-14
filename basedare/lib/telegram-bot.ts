import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import { prisma } from '@/lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz';

const REFERRER_FEE_PERCENT = 1;
const TELEGRAM_REQUEST_TIMEOUT_MS = 30_000;

const TELEGRAM_HTTPS_AGENT = new HttpsAgent({
  keepAlive: true,
});

interface TelegramApiResponse {
  ok: boolean;
  description?: string;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data: string;
}

interface TelegramReplyMarkup {
  inline_keyboard?: TelegramInlineKeyboardButton[][];
  keyboard?: Array<Array<{ text: string; request_location?: boolean }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string };
    chat: { id: number; type: string };
    text?: string;
    location?: { latitude: number; longitude: number };
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number; type: string };
      text?: string;
    };
  };
}

const chatState = new Map<string, { awaitingLocation?: boolean }>();

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function isAdminChat(chatId: number | string): boolean {
  if (!TELEGRAM_ADMIN_CHAT_ID) return false;
  return chatId.toString() === TELEGRAM_ADMIN_CHAT_ID;
}

function buildCallbackData(action: 'approve_dare' | 'reject_dare', dareRef: string): string {
  const normalizedRef = dareRef.slice(0, 48);
  return `${action}:${normalizedRef}`;
}

async function callTelegramApi(
  method: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    return false;
  }

  try {
    const body = JSON.stringify(payload);
    const result: TelegramApiResponse = await new Promise((resolve, reject) => {
      const req = httpsRequest(
        {
          protocol: 'https:',
          hostname: 'api.telegram.org',
          path: `/bot${TELEGRAM_BOT_TOKEN}/${method}`,
          method: 'POST',
          family: 4,
          timeout: TELEGRAM_REQUEST_TIMEOUT_MS,
          agent: TELEGRAM_HTTPS_AGENT,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let raw = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            raw += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(raw) as TelegramApiResponse);
            } catch (error) {
              reject(error);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error(`Telegram request timeout after ${TELEGRAM_REQUEST_TIMEOUT_MS}ms`));
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (!result.ok) {
      console.error(`[TELEGRAM] ${method} failed:`, result.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[TELEGRAM] ${method} error:`, error);
    return false;
  }
}

async function sendMessage(
  chatId: number | string,
  text: string,
  options?: { parseMode?: 'HTML' | 'Markdown'; replyMarkup?: TelegramReplyMarkup }
): Promise<void> {
  await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode ?? 'HTML',
    disable_web_page_preview: true,
    ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
  });
}

async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await callTelegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

async function handleModerationCallback(action: 'approve_dare' | 'reject_dare', dareRef: string): Promise<{ success: boolean; title?: string }> {
  const dare = await prisma.dare.findFirst({
    where: {
      OR: [
        { shortId: dareRef },
        { id: dareRef },
        { id: { startsWith: dareRef } },
      ],
    },
  });

  if (!dare) {
    return { success: false };
  }

  if (action === 'approve_dare') {
    const referrerFee = dare.referrerTag ? (dare.bounty * REFERRER_FEE_PERCENT) / 100 : 0;

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

    return { success: true, title: dare.title };
  }

  await prisma.dare.update({
    where: { id: dare.id },
    data: {
      status: 'FAILED',
      appealStatus: 'REJECTED',
      appealReason: 'Rejected via Telegram inline moderation',
    },
  });

  return { success: true, title: dare.title };
}

async function handleCallback(update: TelegramUpdate): Promise<boolean> {
  const callback = update.callback_query;
  if (!callback?.data) {
    return false;
  }

  await answerCallbackQuery(callback.id, 'Processing...').catch(() => {});

  const chatId = callback.message?.chat.id;
  if (!chatId || !isAdminChat(chatId)) {
    return true;
  }

  const [actionRaw, dareRef] = callback.data.split(':');
  const action = actionRaw as 'approve_dare' | 'reject_dare';

  if (!dareRef || (action !== 'approve_dare' && action !== 'reject_dare')) {
    void sendMessage(chatId, '⚠️ Could not parse moderation action.').catch(() => {});
    return true;
  }

  try {
    const result = await handleModerationCallback(action, dareRef);
    if (!result.success) {
      void sendMessage(chatId, `⚠️ Dare <code>${dareRef}</code> not found.`).catch(() => {});
      return true;
    }

    const decision = action === 'approve_dare' ? 'approved ✅' : 'rejected ❌';
    void sendMessage(chatId, `🛡️ Dare <b>${result.title || dareRef}</b> ${decision}`).catch(() => {});
    console.log(`[TELEGRAM] Inline moderation ${action} for ${dareRef}`);
  } catch (error) {
    console.error('[TELEGRAM] Callback moderation error:', error);
    void sendMessage(chatId, '⚠️ Moderation action failed. Please retry.').catch(() => {});
  }

  return true;
}

export function validateTelegramWebhookSecret(headers: Headers): boolean {
  const token = headers.get('x-telegram-bot-api-secret-token') || '';
  const expected = TELEGRAM_WEBHOOK_SECRET || '';

  if (!expected || expected.length < 16) {
    console.error('[TELEGRAM] TELEGRAM_WEBHOOK_SECRET missing or too short');
    return false;
  }

  return timingSafeEqualStrings(token, expected);
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const chatId = update.message?.chat.id;
  if (chatId) {
    const stateKey = chatId.toString();
    if (!chatState.has(stateKey)) {
      chatState.set(stateKey, {});
    }
  }

  const callbackHandled = await handleCallback(update);
  if (callbackHandled) {
    return;
  }

  // Keep existing command flow in webhook route.
}

export async function sendDareCreatedAlert(data: {
  dareId: string;
  shortId: string;
  title: string;
  amount: number;
  streamerTag: string | null;
  isOpenBounty: boolean;
  stakerAddress?: string | null;
}): Promise<void> {
  if (!TELEGRAM_ADMIN_CHAT_ID) {
    return;
  }

  const targetTag = data.isOpenBounty ? 'OPEN' : (data.streamerTag || 'UNKNOWN');
  const staker = data.stakerAddress
    ? `${data.stakerAddress.slice(0, 6)}...${data.stakerAddress.slice(-4)}`
    : 'Anonymous';

  const message = [
    '🆕 <b>NEW DARE CREATED</b>',
    '',
    `<b>${data.title}</b>`,
    `💰 $${data.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDC`,
    `🏷️ Tag: <code>${targetTag}</code>`,
    `👛 Staker: <code>${staker}</code>`,
    `🔗 <a href="${BASE_URL}/dare/${data.shortId}">View Dare</a>`,
  ].join('\n');

  const callbackRef = data.shortId || data.dareId;

  await sendMessage(TELEGRAM_ADMIN_CHAT_ID, message, {
    parseMode: 'HTML',
    replyMarkup: {
      inline_keyboard: [[
        { text: '✅ Approve', callback_data: buildCallbackData('approve_dare', callbackRef) },
        { text: '❌ Reject', callback_data: buildCallbackData('reject_dare', callbackRef) },
      ]],
    },
  });
}

export function getTelegramChatState(chatId: number | string): { awaitingLocation?: boolean } | undefined {
  return chatState.get(chatId.toString());
}

export function setTelegramChatState(chatId: number | string, state: { awaitingLocation?: boolean }): void {
  chatState.set(chatId.toString(), state);
}
