import { NextResponse } from 'next/server';

// Debug endpoint to check environment configuration
// This doesn't reveal secrets, just confirms if they're set

export async function GET() {
  const moderatorWallets = process.env.MODERATOR_WALLETS || '';
  const walletList = moderatorWallets
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

  // Mask wallets for display (show only first 6 and last 4 chars)
  const maskedWallets = walletList.map(
    (w) => `${w.slice(0, 6)}...${w.slice(-4)}`
  );

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    moderatorConfig: {
      envVarSet: !!process.env.MODERATOR_WALLETS,
      rawLength: moderatorWallets.length,
      walletCount: walletList.length,
      // Show masked wallets so you can verify the right ones are loaded
      maskedWallets,
    },
    adminSecretSet: !!process.env.ADMIN_SECRET && process.env.ADMIN_SECRET.length >= 32,
    timestamp: new Date().toISOString(),
  });
}
