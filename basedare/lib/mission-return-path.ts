export function missionReturnPath(dare: { id: string; shortId?: string | null; bounty: number; isSimulated?: boolean }) {
  return `${dare.bounty > 0 && !dare.isSimulated ? '/earn/' : '/dare/'}${encodeURIComponent(dare.shortId || dare.id)}`;
}
