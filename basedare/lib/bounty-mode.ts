export type BountyMode = 'SIMULATION' | 'LIVE';

export type BountyModeSnapshot = {
    mode: BountyMode;
    simulated: boolean;
    network: 'mainnet' | 'sepolia';
    source: 'SIMULATE_BOUNTIES' | 'NEXT_PUBLIC_SIMULATE_BOUNTIES' | 'DEFAULT';
};

export function getBountyModeSnapshot(): BountyModeSnapshot {
    const serverValue = process.env.SIMULATE_BOUNTIES;
    const publicValue = process.env.NEXT_PUBLIC_SIMULATE_BOUNTIES;
    const rawValue = serverValue ?? publicValue ?? 'false';
    const simulated = rawValue === 'true';

    return {
        mode: simulated ? 'SIMULATION' : 'LIVE',
        simulated,
        network: process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'sepolia',
        source:
            serverValue != null
                ? 'SIMULATE_BOUNTIES'
                : publicValue != null
                  ? 'NEXT_PUBLIC_SIMULATE_BOUNTIES'
                  : 'DEFAULT',
    };
}

export function isBountySimulationMode(): boolean {
    return getBountyModeSnapshot().simulated;
}

