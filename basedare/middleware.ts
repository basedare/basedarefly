import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIp,
  RateLimiters,
  createRateLimitHeaders,
  type RateLimitConfig,
} from '@/lib/rate-limit';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getEndpointLimiter(pathname: string): RateLimitConfig {
  // Keep sensitive write endpoints on stricter limits.
  if (
    pathname.startsWith('/api/verify-proof') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/telegram') ||
    pathname.startsWith('/api/live-pot') ||
    pathname.startsWith('/api/admin')
  ) {
    return { ...RateLimiters.strict };
  }

  return { ...RateLimiters.standard };
}

export function middleware(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const endpointKey = request.nextUrl.pathname
    .replace(/^\/api\//, '')
    .replace(/\//g, ':') || 'root';

  const limiter = getEndpointLimiter(request.nextUrl.pathname);
  const result = checkRateLimit(ip, {
    ...limiter,
    keyPrefix: `api:${request.method.toUpperCase()}:${endpointKey}`,
  });

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please wait before trying again.',
        code: 'RATE_LIMITED',
      },
      {
        status: 429,
        headers: createRateLimitHeaders(result),
      }
    );
  }

  const response = NextResponse.next();
  const headers = createRateLimitHeaders(result);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
