export const SIGNAL_ROOM_HANDLE = 'baresignalroom';
export const SIGNAL_ROOM_CHAT_ID = `@${SIGNAL_ROOM_HANDLE}`;
export const SIGNAL_ROOM_URL_FALLBACK = `https://t.me/${SIGNAL_ROOM_HANDLE}`;

const LEGACY_SIGNAL_ROOM_HANDLES = new Set(['basedare_signal']);

function normalizeTelegramHandle(handle: string) {
  const cleanHandle = handle.trim().replace(/^@/, '').replace(/^\/+|\/+$/g, '');
  return LEGACY_SIGNAL_ROOM_HANDLES.has(cleanHandle.toLowerCase()) ? SIGNAL_ROOM_HANDLE : cleanHandle;
}

export function normalizeSignalRoomUrl(value?: string | null) {
  const rawValue = value?.trim();
  if (!rawValue) return SIGNAL_ROOM_URL_FALLBACK;

  if (rawValue.startsWith('@')) {
    return `https://t.me/${normalizeTelegramHandle(rawValue)}`;
  }

  try {
    const url = new URL(rawValue);
    if (url.hostname === 't.me' || url.hostname === 'telegram.me') {
      const handle = normalizeTelegramHandle(url.pathname);
      return `https://t.me/${handle}`;
    }
  } catch {
    // Not a URL. Treat bare handles as Telegram handles.
  }

  if (/^[a-zA-Z0-9_]{5,}$/.test(rawValue)) {
    return `https://t.me/${normalizeTelegramHandle(rawValue)}`;
  }

  return rawValue;
}

export function normalizeSignalRoomChatId(value?: string | null) {
  const rawValue = value?.trim();
  if (!rawValue) return SIGNAL_ROOM_CHAT_ID;

  if (rawValue.startsWith('https://t.me/') || rawValue.startsWith('http://t.me/')) {
    return `@${normalizeTelegramHandle(rawValue.replace(/^https?:\/\/t\.me\//, ''))}`;
  }

  if (rawValue.startsWith('@')) {
    return `@${normalizeTelegramHandle(rawValue)}`;
  }

  return LEGACY_SIGNAL_ROOM_HANDLES.has(rawValue.toLowerCase()) ? SIGNAL_ROOM_CHAT_ID : rawValue;
}

export const SIGNAL_ROOM_URL = normalizeSignalRoomUrl(
  process.env.NEXT_PUBLIC_TELEGRAM_SIGNAL_URL || process.env.NEXT_PUBLIC_TELEGRAM_COMMUNITY_URL
);

export function hasSignalRoomUrl() {
  return Boolean(SIGNAL_ROOM_URL.trim());
}
