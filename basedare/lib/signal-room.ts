export const SIGNAL_ROOM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_SIGNAL_URL ||
  process.env.NEXT_PUBLIC_TELEGRAM_COMMUNITY_URL ||
  '';

export function hasSignalRoomUrl() {
  return Boolean(SIGNAL_ROOM_URL.trim());
}
