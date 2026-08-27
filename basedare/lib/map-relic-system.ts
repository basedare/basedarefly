export type MapRelicSignalKind = 'none' | 'spark' | 'dare' | 'crew' | 'event' | 'update';
export type MapRelicRingTone = 'quiet' | 'active' | 'cyan' | 'gold' | 'selected';
export type MapRelicZoomBand = 'far' | 'mid' | 'near';
export type MapRelicClusterTone = 'purple' | 'cyan' | 'gold';

export type MapRelicSignal = {
  kind: MapRelicSignalKind;
  label: string | null;
  ring: MapRelicRingTone;
  actionable: boolean;
};

const CREW_SIGNAL_PATTERN = /^(?:HANG|MEET|MEETUP|CREW|ASK|OFFER)$/i;

export function resolveMapRelicSignal(input: {
  selected: boolean;
  challengeLiveCount: number;
  communitySparkLive: boolean;
  localSignalLabel?: string | null;
  liveTonight: boolean;
  approvedCount: number;
}): MapRelicSignal {
  if (input.selected) {
    const underlying = resolveMapRelicSignal({ ...input, selected: false });
    return { ...underlying, ring: 'selected' };
  }

  if (input.challengeLiveCount > 0) {
    if (input.communitySparkLive) {
      return {
        kind: 'spark',
        label: input.challengeLiveCount > 1 ? `SPARK ${Math.min(input.challengeLiveCount, 9)}+` : 'SPARK',
        ring: 'cyan',
        actionable: true,
      };
    }

    return {
      kind: 'dare',
      label: input.challengeLiveCount > 1 ? `DARE ${Math.min(input.challengeLiveCount, 9)}+` : 'DARE',
      ring: 'gold',
      actionable: true,
    };
  }

  const localLabel = input.localSignalLabel?.trim().toUpperCase() ?? null;
  if (localLabel && CREW_SIGNAL_PATTERN.test(localLabel)) {
    return {
      kind: 'crew',
      label: localLabel === 'MEETUP' ? 'MEET' : localLabel,
      ring: 'cyan',
      actionable: true,
    };
  }

  if (input.liveTonight) {
    return {
      kind: 'event',
      label: 'TONIGHT',
      ring: 'cyan',
      actionable: true,
    };
  }

  if (input.approvedCount > 0) {
    return {
      kind: 'update',
      label: null,
      ring: 'active',
      actionable: false,
    };
  }

  return {
    kind: 'none',
    label: null,
    ring: 'quiet',
    actionable: false,
  };
}

export function getMapRelicZoomBand(zoom: number): MapRelicZoomBand {
  if (zoom < 14.2) return 'far';
  if (zoom < 15.8) return 'mid';
  return 'near';
}

export function getMapRelicClusterTone(input: {
  challengeLiveCount: number;
  matched: boolean;
}): MapRelicClusterTone {
  if (input.challengeLiveCount > 0) return 'gold';
  if (input.matched) return 'cyan';
  return 'purple';
}
