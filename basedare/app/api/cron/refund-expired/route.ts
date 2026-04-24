import { NextRequest } from 'next/server';
import { POST as processExpiredRefunds } from '@/app/api/refund/expired/route';
import { verifyCronSecret } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  return processExpiredRefunds(req);
}

export async function POST(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  return processExpiredRefunds(req);
}
