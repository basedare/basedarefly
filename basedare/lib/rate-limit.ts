/**
 * Simple in-memory rate limiter for API endpoints
 *
 * For production with multiple instances, consider Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

// Start cleanup on module load
if (typeof window === 'undefined') {
  startCleanup();
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional key prefix for different endpoints */
  keyPrefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the current window */
  remaining: number;
  /** Time in ms until the rate limit resets */
  resetIn: number;
  /** Total limit */
  limit: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { limit, windowMs, keyPrefix = '' } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  // No existing entry or window has expired
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetIn: windowMs,
      limit,
    };
  }

  // Window is still active
  const remaining = Math.max(0, limit - entry.count - 1);
  const resetIn = entry.resetTime - now;

  if (entry.count >= limit) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      limit,
    };
  }

  // Increment count
  entry.count += 1;

  return {
    allowed: true,
    remaining,
    resetIn,
    limit,
  };
}

/**
 * Get client IP from Next.js request
 * Handles proxies and various header formats
 */
export function getClientIp(request: Request): string {
  // Try various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback - this may not be the real IP behind proxies
  return 'unknown';
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
  /** Strict: 5 requests per minute (for sensitive endpoints) */
  strict: { limit: 5, windowMs: 60 * 1000 },

  /** Standard: 30 requests per minute */
  standard: { limit: 30, windowMs: 60 * 1000 },

  /** Relaxed: 100 requests per minute */
  relaxed: { limit: 100, windowMs: 60 * 1000 },

  /** Verification: 10 requests per 5 minutes (for AI referee) */
  verification: { limit: 10, windowMs: 5 * 60 * 1000 },

  /** Appeal: 3 requests per hour */
  appeal: { limit: 3, windowMs: 60 * 60 * 1000 },
};

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString(),
  };
}
