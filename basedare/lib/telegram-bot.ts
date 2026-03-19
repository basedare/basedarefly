import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz';
const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || process.env.ADMIN_SECRET;
const BOT_STAKER_ADDRESS =
  process.env.TELEGRAM_BOT_WALLET_ADDRESS ||
  process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS ||
  process.env.MODERATOR_WALLETS?.split(',')[0]?.trim() ||
  '';

const REFERRER_FEE_PERCENT = 1;
const TELEGRAM_REQUEST_TIMEOUT_MS = 30_000;

const TELEGRAM_HTTPS_AGENT = new HttpsAgent({
  keepAlive: true,
});

interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
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
  remove_keyboard?: boolean;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string };
    chat: { id: number; type: string };
    text?: string;
    caption?: string;
    location?: { latitude: number; longitude: number };
    photo?: TelegramPhotoSize[];
    video?: TelegramVideo;
    document?: TelegramDocument;
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

type CreateMode = 'IRL' | 'STREAM';
type ClaimPlatform = 'twitter' | 'twitch' | 'youtube' | 'kick';

interface CreateFlowState {
  flow: 'create';
  step: number;
  data: {
    title?: string;
    amount?: number;
    missionMode?: CreateMode;
    streamerTag?: string;
    latitude?: number;
    longitude?: number;
    locationLabel?: string;
  };
}

interface DareNearbyFlowState {
  flow: 'dare';
  step: number;
  data: Record<string, never>;
}

interface ClaimFlowState {
  flow: 'claim';
  step: number;
  data: {
    tag?: string;
    platform?: ClaimPlatform;
    handle?: string;
  };
}

interface ProofFlowState {
  flow: 'proof';
  step: number;
  data: {
    shortId?: string;
    dareId?: string;
  };
}

type TelegramFlowState = CreateFlowState | DareNearbyFlowState | ClaimFlowState | ProofFlowState;

const chatState = new Map<string, TelegramFlowState>();

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

function isPrivateChat(chatType: string): boolean {
  return chatType === 'private';
}

function hasInternalApiConfig(): boolean {
  return Boolean(INTERNAL_API_SECRET && BOT_STAKER_ADDRESS && isAddress(BOT_STAKER_ADDRESS));
}

function buildCallbackData(
  action: 'approve_dare' | 'reject_dare' | 'approve_tag' | 'reject_tag',
  ref: string
): string {
  const normalizedRef = ref.slice(0, 48);
  return `${action}:${normalizedRef}`;
}

function normalizeTag(input: string): string {
  const cleaned = input.trim().replace(/^@+/, '');
  return `@${cleaned}`;
}

function normalizeHandle(input: string): string {
  const cleaned = input.trim().replace(/^@+/, '');
  return `@${cleaned}`;
}

function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function parseShortIdFromText(text: string): string | null {
  const linkMatch = text.match(/(?:https?:\/\/)?(?:www\.)?basedare\.xyz\/dare\/([A-Za-z0-9_-]+)/i);
  if (linkMatch?.[1]) {
    return linkMatch[1];
  }

  const token = text.trim().split(/\s+/)[0] || '';
  if (/^[A-Za-z0-9_-]{6,80}$/.test(token)) {
    return token;
  }

  return null;
}

async function callTelegramApi<T = unknown>(
  method: string,
  payload: Record<string, unknown>
): Promise<TelegramApiResponse<T>> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, description: 'Bot token missing' };
  }

  try {
    const body = JSON.stringify(payload);
    const result: TelegramApiResponse<T> = await new Promise((resolve, reject) => {
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
              resolve(JSON.parse(raw) as TelegramApiResponse<T>);
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
    }

    return result;
  } catch (error) {
    console.error(`[TELEGRAM] ${method} error:`, error);
    return { ok: false, description: 'Telegram request failed' };
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

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await callTelegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

async function internalJsonRequest<T = unknown>(
  path: string,
  init: RequestInit & { bodyJson?: Record<string, unknown> } = {}
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const headers = new Headers(init.headers || {});
  if (INTERNAL_API_SECRET) {
    headers.set('Authorization', `Bearer ${INTERNAL_API_SECRET}`);
  }

  let body: BodyInit | undefined = init.body as BodyInit | undefined;
  if (init.bodyJson) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.bodyJson);
  }

  const response = await fetch(new URL(path, INTERNAL_API_BASE_URL).toString(), {
    method: init.method || 'GET',
    headers,
    body,
    cache: 'no-store',
  });

  let parsed: T | null = null;
  try {
    parsed = (await response.json()) as T;
  } catch {
    parsed = null;
  }

  return { ok: response.ok, status: response.status, data: parsed };
}

async function fetchNearbyDares(lat: number, lng: number): Promise<Array<{
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  streamerHandle: string | null;
}>> {
  const response = await internalJsonRequest<{
    success?: boolean;
    data?: {
      dares?: Array<{
        id: string;
        shortId: string | null;
        title: string;
        bounty: number;
        streamerHandle: string | null;
      }>;
    };
  }>(`/api/dares/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&limit=5&radius=10`);

  if (!response.ok || !response.data?.success) {
    throw new Error('Nearby lookup failed');
  }

  return response.data.data?.dares ?? [];
}

async function fetchDareByShortId(shortId: string): Promise<{ id: string; shortId: string; title: string } | null> {
  const response = await internalJsonRequest<{
    id: string;
    shortId: string;
    title: string;
  }>(`/api/dare/${encodeURIComponent(shortId)}`);

  if (!response.ok || !response.data) {
    return null;
  }

  return response.data;
}

async function fetchLeaderboard(): Promise<Array<{ streamerTag: string; amount: number }>> {
  const response = await internalJsonRequest<{
    success?: boolean;
    data?: {
      bounties?: Array<{
        streamerTag?: string | null;
        amount?: number;
      }>;
    };
  }>('/api/bounties?sort=amount');

  if (!response.ok || !response.data?.success) {
    return [];
  }

  const bounties = response.data.data?.bounties || [];
  return bounties.slice(0, 10).map((item) => ({
    streamerTag: item.streamerTag || '@open',
    amount: typeof item.amount === 'number' ? item.amount : 0,
  }));
}

function clearState(chatId: number | string): void {
  chatState.delete(chatId.toString());
}

function setState(chatId: number | string, state: TelegramFlowState): void {
  chatState.set(chatId.toString(), state);
}

function getState(chatId: number | string): TelegramFlowState | undefined {
  return chatState.get(chatId.toString());
}

function getCreateSummary(state: CreateFlowState): string {
  const title = state.data.title || 'Untitled';
  const amount = state.data.amount ?? 0;
  const mode = state.data.missionMode || 'IRL';

  if (mode === 'STREAM') {
    return [
      '🔥 <b>CREATE DARE SUMMARY</b>',
      '',
      `Title: <b>${title}</b>`,
      `Bounty: <b>$${amount} USDC</b>`,
      'Mode: <b>STREAM</b>',
      `Target: <code>${state.data.streamerTag || '@unknown'}</code>`,
      '',
      'Confirm deploy?',
    ].join('\n');
  }

  return [
    '🔥 <b>CREATE DARE SUMMARY</b>',
    '',
    `Title: <b>${title}</b>`,
    `Bounty: <b>$${amount} USDC</b>`,
    'Mode: <b>IRL</b>',
    `Location: <b>${state.data.locationLabel || 'Shared via Telegram'}</b>`,
    '',
    'Confirm deploy?',
  ].join('\n');
}

async function submitCreateFlow(chatId: number | string, state: CreateFlowState): Promise<void> {
  if (!hasInternalApiConfig()) {
    await sendMessage(chatId, 'Oops, bot create is not configured yet. Use web create for now.').catch(() => {});
    return;
  }

  const payload: Record<string, unknown> = {
    title: state.data.title,
    amount: state.data.amount,
    missionMode: state.data.missionMode,
    streamId: 'telegram-bot',
    stakerAddress: BOT_STAKER_ADDRESS,
  };

  if (state.data.missionMode === 'STREAM') {
    payload.streamerTag = state.data.streamerTag;
  } else {
    payload.isNearbyDare = true;
    payload.latitude = state.data.latitude;
    payload.longitude = state.data.longitude;
    payload.locationLabel = state.data.locationLabel || 'Telegram location';
    payload.discoveryRadiusKm = 5;
  }

  const response = await internalJsonRequest<{
    success?: boolean;
    error?: string;
    data?: {
      shortId?: string;
      dareId?: string;
      shareUrl?: string;
    };
  }>('/api/bounties', {
    method: 'POST',
    bodyJson: payload,
  });

  if (!response.ok || !response.data?.success) {
    const errorMessage = response.data?.error || 'Failed to create dare';
    await sendMessage(chatId, `Oops, something broke — ${errorMessage}. Try again!`).catch(() => {});
    return;
  }

  const shortId = response.data.data?.shortId || response.data.data?.dareId || '';
  const shareUrl = response.data.data?.shareUrl || (shortId ? `/dare/${shortId}` : '/dare');
  const fullLink = shareUrl.startsWith('http') ? shareUrl : `${BASE_URL}${shareUrl}`;

  await sendMessage(
    chatId,
    `✅ Dare deployed. Chaos is live.\n\n🔗 <a href="${fullLink}">Open Dare</a>`
  ).catch(() => {});
}

async function submitClaimFlow(chatId: number | string, state: ClaimFlowState): Promise<void> {
  if (!hasInternalApiConfig()) {
    await sendMessage(chatId, 'Oops, bot claim is not configured yet. Use the web claim page for now.').catch(() => {});
    return;
  }

  const response = await internalJsonRequest<{
    success?: boolean;
    error?: string;
  }>('/api/claim-tag', {
    method: 'POST',
    bodyJson: {
      tag: state.data.tag,
      platform: state.data.platform,
      handle: state.data.handle,
      walletAddress: BOT_STAKER_ADDRESS,
    },
  });

  if (response.status === 409) {
    await sendMessage(chatId, `⚠️ ${state.data.tag} is already claimed or pending review.`).catch(() => {});
    return;
  }

  if (!response.ok || !response.data?.success) {
    await sendMessage(chatId, 'Oops, something broke — try again!').catch(() => {});
    return;
  }

  await sendMessage(chatId, `✅ Claim for ${state.data.tag} submitted — under review!`).catch(() => {});
}

async function uploadProofFromTelegramFile(fileId: string, dareId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'Telegram token missing' };
  }

  const fileMeta = await callTelegramApi<{ file_path?: string }>('getFile', { file_id: fileId });
  const filePath = fileMeta.result?.file_path;
  if (!fileMeta.ok || !filePath) {
    return { success: false, error: 'Could not read Telegram file metadata' };
  }

  const telegramFileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const fileRes = await fetch(telegramFileUrl, { cache: 'no-store' });
  if (!fileRes.ok) {
    return { success: false, error: 'Could not download Telegram media' };
  }

  const buffer = await fileRes.arrayBuffer();
  const mimeType = fileRes.headers.get('content-type') || 'video/mp4';
  const extension = mimeType.includes('quicktime') ? 'mov' : mimeType.includes('webm') ? 'webm' : 'mp4';
  const file = new File([buffer], `proof-${Date.now()}.${extension}`, { type: mimeType });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('dareId', dareId);

  const headers = new Headers();
  if (INTERNAL_API_SECRET) {
    headers.set('Authorization', `Bearer ${INTERNAL_API_SECRET}`);
  }

  const uploadRes = await fetch(new URL('/api/upload', INTERNAL_API_BASE_URL).toString(), {
    method: 'POST',
    headers,
    body: formData,
    cache: 'no-store',
  });

  const uploadBody = await uploadRes.json().catch(() => ({} as Record<string, unknown>));
  if (!uploadRes.ok) {
    return { success: false, error: String(uploadBody.error || 'Upload failed') };
  }

  return { success: true, url: typeof uploadBody.url === 'string' ? uploadBody.url : undefined };
}

async function submitProofVerification(dareId: string): Promise<boolean> {
  const response = await internalJsonRequest<{ success?: boolean }>('/api/verify-proof', {
    method: 'POST',
    bodyJson: { dareId },
  });

  return response.ok && Boolean(response.data?.success);
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

async function handleTagClaimModerationCallback(
  action: 'approve_tag' | 'reject_tag',
  tagClaimRef: string
): Promise<{ success: boolean; tag?: string; status?: string; handle?: string; platform?: string }> {
  const tagClaim = await prisma.streamerTag.findFirst({
    where: {
      OR: [
        { id: tagClaimRef },
        { id: { startsWith: tagClaimRef } },
      ],
    },
    select: {
      id: true,
      tag: true,
      status: true,
      verificationMethod: true,
      twitterHandle: true,
      twitchHandle: true,
      youtubeHandle: true,
      kickHandle: true,
    },
  });

  if (!tagClaim) {
    return { success: false };
  }

  if (tagClaim.status !== 'PENDING') {
    return {
      success: false,
      tag: tagClaim.tag,
      status: tagClaim.status,
      handle:
        tagClaim.twitterHandle ||
        tagClaim.twitchHandle ||
        tagClaim.youtubeHandle ||
        tagClaim.kickHandle ||
        '',
      platform: tagClaim.verificationMethod,
    };
  }

  const approved = action === 'approve_tag';

  const updated = await prisma.streamerTag.update({
    where: { id: tagClaim.id },
    data: approved
      ? {
          status: 'ACTIVE',
          verifiedAt: new Date(),
          revokedAt: null,
          revokedBy: null,
          revokeReason: null,
        }
      : {
          status: 'REJECTED',
          verifiedAt: null,
          revokeReason: 'Rejected via Telegram inline moderation',
        },
    select: {
      tag: true,
      status: true,
      verificationMethod: true,
      twitterHandle: true,
      twitchHandle: true,
      youtubeHandle: true,
      kickHandle: true,
    },
  });

  return {
    success: true,
    tag: updated.tag,
    status: updated.status,
    handle:
      updated.twitterHandle ||
      updated.twitchHandle ||
      updated.youtubeHandle ||
      updated.kickHandle ||
      '',
    platform: updated.verificationMethod,
  };
}

async function handleCreateFlowMessage(chatId: number, message: NonNullable<TelegramUpdate['message']>, state: CreateFlowState): Promise<boolean> {
  const text = (message.text || '').trim();

  if (state.step === 1) {
    if (!text || text.length < 3) {
      await sendMessage(chatId, 'Need a stronger title. Give me at least 3 characters.').catch(() => {});
      return true;
    }

    setState(chatId, {
      flow: 'create',
      step: 2,
      data: {
        ...state.data,
        title: text,
      },
    });

    await sendMessage(chatId, '💰 Bounty amount (min $5 USDC)?').catch(() => {});
    return true;
  }

  if (state.step === 2) {
    const amount = parseAmount(text);
    if (amount === null || amount < 5) {
      await sendMessage(chatId, 'Bounty must be at least $5 USDC. Try again.').catch(() => {});
      return true;
    }

    setState(chatId, {
      flow: 'create',
      step: 3,
      data: {
        ...state.data,
        amount,
      },
    });

    await sendMessage(chatId, 'Choose mode:', {
      replyMarkup: {
        inline_keyboard: [[
          { text: '🎯 IRL', callback_data: 'create_mode:IRL' },
          { text: '🎥 STREAM', callback_data: 'create_mode:STREAM' },
        ]],
      },
    }).catch(() => {});
    return true;
  }

  if (state.step === 4 && state.data.missionMode === 'STREAM') {
    const normalizedHandle = normalizeHandle(text);
    if (!/^@[a-zA-Z0-9_]{1,20}$/.test(normalizedHandle)) {
      await sendMessage(chatId, 'Handle format should look like @kai_cenat').catch(() => {});
      return true;
    }

    const nextState: CreateFlowState = {
      flow: 'create',
      step: 5,
      data: {
        ...state.data,
        streamerTag: normalizedHandle,
      },
    };
    setState(chatId, nextState);

    await sendMessage(chatId, getCreateSummary(nextState), {
      replyMarkup: {
        inline_keyboard: [[
          { text: '✅ Yes', callback_data: 'create_confirm:yes' },
          { text: '❌ No', callback_data: 'create_confirm:no' },
        ]],
      },
    }).catch(() => {});
    return true;
  }

  if (state.step === 4 && state.data.missionMode === 'IRL') {
    await sendMessage(chatId, 'Drop your location pin first so we can geotag this dare.').catch(() => {});
    return true;
  }

  return false;
}

async function handleClaimFlowMessage(chatId: number, message: NonNullable<TelegramUpdate['message']>, state: ClaimFlowState): Promise<boolean> {
  const text = (message.text || '').trim();

  if (state.step === 1) {
    const normalizedTag = normalizeTag(text);
    if (!/^@[a-zA-Z0-9_]{2,20}$/.test(normalizedTag)) {
      await sendMessage(chatId, 'Tag format invalid. Example: @mytag').catch(() => {});
      return true;
    }

    setState(chatId, {
      flow: 'claim',
      step: 2,
      data: {
        ...state.data,
        tag: normalizedTag,
      },
    });

    await sendMessage(chatId, 'Choose your platform:', {
      replyMarkup: {
        inline_keyboard: [[
          { text: '𝕏 Twitter', callback_data: 'claim_platform:twitter' },
          { text: '📺 Twitch', callback_data: 'claim_platform:twitch' },
        ], [
          { text: '▶️ YouTube', callback_data: 'claim_platform:youtube' },
          { text: '🟢 Kick', callback_data: 'claim_platform:kick' },
        ]],
      },
    }).catch(() => {});
    return true;
  }

  if (state.step === 3) {
    const normalizedHandle = normalizeHandle(text);
    if (!/^@[a-zA-Z0-9_.-]{1,50}$/.test(normalizedHandle)) {
      await sendMessage(chatId, 'Handle format looks off. Try again (example: @yourhandle).').catch(() => {});
      return true;
    }

    const submitState: ClaimFlowState = {
      flow: 'claim',
      step: 4,
      data: {
        ...state.data,
        handle: normalizedHandle,
      },
    };

    await submitClaimFlow(chatId, submitState);
    clearState(chatId);
    return true;
  }

  return false;
}

async function handleProofFlowMessage(chatId: number, message: NonNullable<TelegramUpdate['message']>, state: ProofFlowState): Promise<boolean> {
  const text = (message.text || message.caption || '').trim();

  if (state.step === 1) {
    const parsedShortId = parseShortIdFromText(text);
    if (!parsedShortId) {
      await sendMessage(chatId, 'Send a valid shortId or a full dare link first.').catch(() => {});
      return true;
    }

    const dare = await fetchDareByShortId(parsedShortId);
    if (!dare) {
      await sendMessage(chatId, 'Could not find that dare. Double-check the link or shortId.').catch(() => {});
      return true;
    }

    setState(chatId, {
      flow: 'proof',
      step: 2,
      data: {
        shortId: dare.shortId,
        dareId: dare.id,
      },
    });

    await sendMessage(chatId, '🎬 Now send video/photo proof.').catch(() => {});
    return true;
  }

  if (state.step === 2) {
    if (!hasInternalApiConfig()) {
      await sendMessage(chatId, 'Oops, bot proof upload is not configured yet. Use web proof submit for now.').catch(() => {});
      clearState(chatId);
      return true;
    }

    if (message.photo && message.photo.length > 0) {
      await sendMessage(chatId, 'Photo received, but proof flow currently accepts video only. Send a short video clip.').catch(() => {});
      return true;
    }

    const video = message.video;
    const document = message.document;
    const fileId = video?.file_id || (document?.mime_type?.startsWith('video/') ? document.file_id : null);

    if (!fileId || !state.data.dareId) {
      await sendMessage(chatId, 'Please send a video proof file to continue.').catch(() => {});
      return true;
    }

    const uploadResult = await uploadProofFromTelegramFile(fileId, state.data.dareId);
    if (!uploadResult.success) {
      await sendMessage(chatId, `Oops, upload failed — ${uploadResult.error || 'try again!'}`).catch(() => {});
      return true;
    }

    const verifySuccess = await submitProofVerification(state.data.dareId);
    if (!verifySuccess) {
      await sendMessage(chatId, 'Proof uploaded, but verification request failed. Please retry in a minute.').catch(() => {});
      clearState(chatId);
      return true;
    }

    await sendMessage(chatId, '✅ Proof submitted — waiting review!').catch(() => {});
    clearState(chatId);
    return true;
  }

  return false;
}

async function handleDareNearbyFlow(chatId: number, message: NonNullable<TelegramUpdate['message']>): Promise<boolean> {
  if (!message.location) {
    await sendMessage(chatId, 'Please share location first!', {
      replyMarkup: {
        keyboard: [[{ text: '📍 Share Location', request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }).catch(() => {});
    return true;
  }

  const { latitude, longitude } = message.location;

  try {
    const nearbyDares = await fetchNearbyDares(latitude, longitude);

    if (nearbyDares.length === 0) {
      await sendMessage(chatId, 'No nearby dares right now. Keep the chaos detector on.').catch(() => {});
      clearState(chatId);
      return true;
    }

    const lines = nearbyDares.map((dare, index) => {
      const tag = dare.streamerHandle || '@open';
      const link = `${BASE_URL}/dare/${dare.shortId || dare.id}`;
      return `${index + 1}. ${dare.title} — $${dare.bounty} USDC • ${tag} <a href="${link}">[open]</a>`;
    });

    await sendMessage(chatId, `<b>Nearby Dares</b>\n\n${lines.join('\n')}`, {
      replyMarkup: { remove_keyboard: true },
    }).catch(() => {});
  } catch (error) {
    console.error('[TELEGRAM] Nearby dare lookup failed:', error);
    await sendMessage(chatId, 'Oops, nearby feed glitched. Try again!').catch(() => {});
  }

  clearState(chatId);
  return true;
}

async function handleCallback(update: TelegramUpdate): Promise<boolean> {
  const callback = update.callback_query;
  if (!callback?.data) {
    return false;
  }

  await answerCallbackQuery(callback.id, 'Working...').catch(() => {});

  const chatId = callback.message?.chat.id;
  if (!chatId) {
    return true;
  }

  const state = getState(chatId);

  if (callback.data.startsWith('approve_dare:') || callback.data.startsWith('reject_dare:')) {
    if (!isAdminChat(chatId)) {
      await sendMessage(chatId, 'Not authorized for moderation actions.').catch(() => {});
      return true;
    }

    const [actionRaw, dareRef] = callback.data.split(':');
    const action = actionRaw as 'approve_dare' | 'reject_dare';

    if (!dareRef || (action !== 'approve_dare' && action !== 'reject_dare')) {
      await sendMessage(chatId, 'Could not parse moderation action.').catch(() => {});
      return true;
    }

    try {
      const result = await handleModerationCallback(action, dareRef);
      if (!result.success) {
        await sendMessage(chatId, `Dare ${dareRef} not found.`).catch(() => {});
        return true;
      }

      const decision = action === 'approve_dare' ? 'approved ✅' : 'rejected ❌';
      await sendMessage(chatId, `🛡️ Dare <b>${result.title || dareRef}</b> ${decision}`).catch(() => {});
      console.log(`[TELEGRAM] Inline moderation ${action} for ${dareRef}`);
    } catch (error) {
      console.error('[TELEGRAM] Callback moderation error:', error);
      await sendMessage(chatId, 'Oops, something broke — try again!').catch(() => {});
    }

    return true;
  }

  if (callback.data.startsWith('approve_tag:') || callback.data.startsWith('reject_tag:')) {
    if (!isAdminChat(chatId)) {
      await sendMessage(chatId, 'Not authorized for moderation actions.').catch(() => {});
      return true;
    }

    const [actionRaw, tagClaimRef] = callback.data.split(':');
    const action = actionRaw as 'approve_tag' | 'reject_tag';

    if (!tagClaimRef || (action !== 'approve_tag' && action !== 'reject_tag')) {
      await sendMessage(chatId, 'Could not parse tag moderation action.').catch(() => {});
      return true;
    }

    try {
      const result = await handleTagClaimModerationCallback(action, tagClaimRef);
      if (!result.success) {
        if (result.tag && result.status) {
          await sendMessage(
            chatId,
            `⚠️ Tag <b>${result.tag}</b> is already <b>${result.status}</b>.`
          ).catch(() => {});
        } else {
          await sendMessage(chatId, `Tag claim ${tagClaimRef} not found.`).catch(() => {});
        }
        return true;
      }

      const decision = action === 'approve_tag' ? 'approved ✅' : 'rejected ❌';
      const details = [
        `🛡️ Tag <b>${result.tag || tagClaimRef}</b> ${decision}`,
        result.platform ? `📺 ${result.platform}` : '',
        result.handle ? `👤 <code>${result.handle}</code>` : '',
      ].filter(Boolean).join('\n');

      await sendMessage(chatId, details).catch(() => {});
      console.log(`[TELEGRAM] Inline tag moderation ${action} for ${tagClaimRef}`);
    } catch (error) {
      console.error('[TELEGRAM] Callback tag moderation error:', error);
      await sendMessage(chatId, 'Oops, something broke — try again!').catch(() => {});
    }

    return true;
  }

  if (callback.data.startsWith('create_mode:')) {
    if (!state || state.flow !== 'create' || state.step !== 3) {
      await sendMessage(chatId, 'Create flow expired. Run /create again.').catch(() => {});
      return true;
    }

    const mode = callback.data.split(':')[1] as CreateMode;
    if (mode !== 'IRL' && mode !== 'STREAM') {
      await sendMessage(chatId, 'Invalid mode selection.').catch(() => {});
      return true;
    }

    const nextState: CreateFlowState = {
      flow: 'create',
      step: 4,
      data: {
        ...state.data,
        missionMode: mode,
      },
    };
    setState(chatId, nextState);

    if (mode === 'IRL') {
      await sendMessage(chatId, '📍 Share location for this IRL dare:', {
        replyMarkup: {
          keyboard: [[{ text: '📍 Share Location', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }).catch(() => {});
      return true;
    }

    await sendMessage(chatId, '🎥 Streamer handle (e.g. @kai_cenat)?').catch(() => {});
    return true;
  }

  if (callback.data.startsWith('create_confirm:')) {
    if (!state || state.flow !== 'create' || state.step !== 5) {
      await sendMessage(chatId, 'Create flow expired. Run /create again.').catch(() => {});
      return true;
    }

    const decision = callback.data.split(':')[1];
    if (decision === 'no') {
      clearState(chatId);
      await sendMessage(chatId, 'Create canceled. No chaos released.').catch(() => {});
      return true;
    }

    await submitCreateFlow(chatId, state);
    clearState(chatId);
    return true;
  }

  if (callback.data.startsWith('claim_platform:')) {
    if (!state || state.flow !== 'claim' || state.step !== 2) {
      await sendMessage(chatId, 'Claim flow expired. Run /claim again.').catch(() => {});
      return true;
    }

    const platform = callback.data.split(':')[1] as ClaimPlatform;
    if (!['twitter', 'twitch', 'youtube', 'kick'].includes(platform)) {
      await sendMessage(chatId, 'Invalid platform choice.').catch(() => {});
      return true;
    }

    setState(chatId, {
      flow: 'claim',
      step: 3,
      data: {
        ...state.data,
        platform,
      },
    });

    await sendMessage(chatId, 'Your handle on that platform?').catch(() => {});
    return true;
  }

  return true;
}

async function handleCommand(chatId: number, chatType: string, text: string): Promise<boolean> {
  const [rawCommand, ...argParts] = text.trim().split(/\s+/);
  const command = rawCommand.toLowerCase();
  const args = argParts.join(' ').trim();

  if (command === '/cancel') {
    clearState(chatId);
    await sendMessage(chatId, 'Canceled.').catch(() => {});
    return true;
  }

  if (command === '/help' || command === '/start') {
    await sendMessage(
      chatId,
      [
        '🤖 <b>BASEDARE BOT COMMANDS</b>',
        '',
        '/dare - browse nearby chaos',
        '/create - guided dare creation',
        '/claim @tag - claim your tag',
        '/proof - submit proof flow',
        '/leaderboard - top bounties',
        '/cancel - stop current flow',
      ].join('\n')
    ).catch(() => {});
    return true;
  }

  if (command === '/leaderboard') {
    const leaders = await fetchLeaderboard();
    if (leaders.length === 0) {
      await sendMessage(chatId, 'No leaderboard data yet. Be first to stir chaos.').catch(() => {});
      return true;
    }

    const lines = leaders.map((entry, index) => `${index + 1}. ${entry.streamerTag} — $${entry.amount}`);
    await sendMessage(chatId, `🏆 <b>Leaderboard</b>\n${lines.join('\n')}`).catch(() => {});
    return true;
  }

  if (command === '/dare') {
    if (!isPrivateChat(chatType)) {
      await sendMessage(chatId, 'Drop me a DM for nearby dares so location stays private.').catch(() => {});
      return true;
    }

    setState(chatId, { flow: 'dare', step: 1, data: {} });
    await sendMessage(chatId, 'Drop your location and I will pull the nearest live dares.', {
      replyMarkup: {
        keyboard: [[{ text: '📍 Share Location', request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }).catch(() => {});
    return true;
  }

  if (command === '/create') {
    if (!isPrivateChat(chatType)) {
      await sendMessage(chatId, 'Use /create in private chat with me.').catch(() => {});
      return true;
    }

    setState(chatId, { flow: 'create', step: 1, data: {} });
    await sendMessage(chatId, '🎯 What is the dare title?').catch(() => {});
    return true;
  }

  if (command === '/claim') {
    if (args) {
      const normalizedTag = normalizeTag(args);
      if (!/^@[a-zA-Z0-9_]{2,20}$/.test(normalizedTag)) {
        await sendMessage(chatId, 'Tag format invalid. Example: /claim @mytag').catch(() => {});
        return true;
      }

      setState(chatId, {
        flow: 'claim',
        step: 2,
        data: { tag: normalizedTag },
      });

      await sendMessage(chatId, 'Choose your platform:', {
        replyMarkup: {
          inline_keyboard: [[
            { text: '𝕏 Twitter', callback_data: 'claim_platform:twitter' },
            { text: '📺 Twitch', callback_data: 'claim_platform:twitch' },
          ], [
            { text: '▶️ YouTube', callback_data: 'claim_platform:youtube' },
            { text: '🟢 Kick', callback_data: 'claim_platform:kick' },
          ]],
        },
      }).catch(() => {});

      return true;
    }

    setState(chatId, {
      flow: 'claim',
      step: 1,
      data: {},
    });

    await sendMessage(chatId, 'Send your tag (example: @mytag)').catch(() => {});
    return true;
  }

  if (command === '/proof') {
    setState(chatId, {
      flow: 'proof',
      step: 1,
      data: {},
    });

    await sendMessage(chatId, 'Send shortId or full dare link first.').catch(() => {});
    return true;
  }

  return false;
}

async function maybeExpandDareLink(chatId: number, text: string): Promise<boolean> {
  const shortId = parseShortIdFromText(text);
  if (!shortId || !text.includes('basedare.xyz/dare/')) {
    return false;
  }

  const dare = await fetchDareByShortId(shortId);
  if (!dare) {
    return false;
  }

  const detailsResponse = await internalJsonRequest<{
    id: string;
    shortId: string;
    title: string;
    bounty: number;
    streamerHandle: string | null;
    status: string;
  }>(`/api/dare/${encodeURIComponent(shortId)}`);

  if (!detailsResponse.ok || !detailsResponse.data) {
    return false;
  }

  const tag = detailsResponse.data.streamerHandle || '@open';
  const link = `${BASE_URL}/dare/${detailsResponse.data.shortId || shortId}`;
  await sendMessage(
    chatId,
    `🎯 <b>${detailsResponse.data.title}</b>\n💰 $${detailsResponse.data.bounty} USDC • ${tag}\n📊 Status: <b>${detailsResponse.data.status}</b>\n🔗 <a href="${link}">Open Dare</a>`
  ).catch(() => {});

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

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<boolean> {
  try {
    const callbackHandled = await handleCallback(update);
    if (callbackHandled) {
      return true;
    }

    const message = update.message;
    if (!message) {
      return false;
    }

    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const text = (message.text || '').trim();

    if (text.startsWith('/')) {
      const commandHandled = await handleCommand(chatId, chatType, text);
      if (commandHandled) {
        return true;
      }
    }

    const state = getState(chatId);
    if (state) {
      if (state.flow === 'create') {
        if (state.step === 4 && state.data.missionMode === 'IRL' && message.location) {
          const nextState: CreateFlowState = {
            flow: 'create',
            step: 5,
            data: {
              ...state.data,
              latitude: message.location.latitude,
              longitude: message.location.longitude,
              locationLabel: 'Telegram location',
            },
          };
          setState(chatId, nextState);

          await sendMessage(chatId, getCreateSummary(nextState), {
            replyMarkup: {
              inline_keyboard: [[
                { text: '✅ Yes', callback_data: 'create_confirm:yes' },
                { text: '❌ No', callback_data: 'create_confirm:no' },
              ]],
            },
          }).catch(() => {});
          return true;
        }

        return await handleCreateFlowMessage(chatId, message, state);
      }

      if (state.flow === 'claim') {
        return await handleClaimFlowMessage(chatId, message, state);
      }

      if (state.flow === 'proof') {
        return await handleProofFlowMessage(chatId, message, state);
      }

      if (state.flow === 'dare') {
        return await handleDareNearbyFlow(chatId, message);
      }
    }

    if (text) {
      const expanded = await maybeExpandDareLink(chatId, text);
      if (expanded) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[TELEGRAM] Bot handler error:', error);
    const chatId = update.message?.chat.id || update.callback_query?.message?.chat.id;
    if (chatId) {
      await sendMessage(chatId, 'Oops, something broke — try again!').catch(() => {});
    }
    return true;
  }
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

export async function sendTagClaimSubmissionAlert(data: {
  tagClaimId: string;
  tag: string;
  platform: 'twitter' | 'twitch' | 'youtube' | 'kick';
  handle: string;
  walletAddress: string;
}): Promise<void> {
  if (!TELEGRAM_ADMIN_CHAT_ID) {
    return;
  }

  const wallet = `${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}`;
  const message = [
    '🆕 <b>TAG CLAIM SUBMITTED</b>',
    '',
    `🏷️ Tag: <code>${data.tag}</code>`,
    `📺 Platform: <b>${data.platform.toUpperCase()}</b>`,
    `👤 Handle: <code>${data.handle}</code>`,
    `👛 Wallet: <code>${wallet}</code>`,
    `🆔 Claim ID: <code>${data.tagClaimId}</code>`,
  ].join('\n');

  await sendMessage(TELEGRAM_ADMIN_CHAT_ID, message, {
    parseMode: 'HTML',
    replyMarkup: {
      inline_keyboard: [[
        { text: '✅ Approve Tag', callback_data: buildCallbackData('approve_tag', data.tagClaimId) },
        { text: '❌ Reject Tag', callback_data: buildCallbackData('reject_tag', data.tagClaimId) },
      ]],
    },
  });
}

export function getTelegramChatState(chatId: number | string): TelegramFlowState | undefined {
  return getState(chatId);
}

export function setTelegramChatState(chatId: number | string, state: TelegramFlowState): void {
  setState(chatId, state);
}
