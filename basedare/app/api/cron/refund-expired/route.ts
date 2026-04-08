import { NextRequest } from 'next/server';
import { POST as processExpiredRefunds } from '@/app/api/refund/expired/route';

export async function GET(req: NextRequest) {
  return processExpiredRefunds(req);
}

export async function POST(req: NextRequest) {
  return processExpiredRefunds(req);
}
