import type { MissionId } from './creator-passport-constants';

/** Match the server's distinct settings and explicit-mission authorization scopes. */
export function creatorPassportAuthorization(walletAddress: string, missionId?: MissionId) {
  const wallet = walletAddress.toLowerCase();
  return missionId
    ? { action: 'creator:passport:mission', resource: `passport:${wallet}:${missionId}` }
    : { action: 'creator:passport:update', resource: `passport:${wallet}` };
}
