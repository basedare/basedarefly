import { NextResponse } from 'next/server';
import { getBountyModeSnapshot } from '@/lib/bounty-mode';

export async function GET() {
    return NextResponse.json({
        success: true,
        data: getBountyModeSnapshot(),
    });
}

