// ============================================================
// KHARCHA — Token Bucket Rate Limiter
// Section 6.4 of KHARCHA_MASTER_PROJECT_DOCUMENT.md
//
// Algorithm:
//   - Bucket starts with `maxTokens` tokens
//   - Each request consumes 1 token
//   - Tokens refill at `refillRate` per second
//   - If bucket empty → request rejected (429)
//
// Includes:
//   - Preset configurations for different endpoint types
//   - Automatic stale bucket cleanup (every 5 minutes)
//   - withRateLimit() middleware wrapper for Next.js route handlers
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';

// ── Types ────────────────────────────────────────────────────────────────────

interface Bucket {
  tokens: number;
  lastRefill: number; // timestamp (ms)
}

export interface RateLimitConfig {
  /** Maximum tokens in the bucket (burst capacity) */
  maxTokens: number;
  /** Tokens added per second */
  refillRate: number;
  /** Key extractor: 'user' (Clerk userId) or 'ip' (client IP) */
  keySource: 'user' | 'ip';
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

// ── Presets ──────────────────────────────────────────────────────────────────

/** General API endpoints: 60 req/min burst, 1 token/sec refill */
export const RATE_LIMIT_GENERAL: RateLimitConfig = {
  maxTokens: 60,
  refillRate: 1,
  keySource: 'user',
};

/** AI endpoints: 10 req/min burst, ~0.17 tokens/sec refill */
export const RATE_LIMIT_AI: RateLimitConfig = {
  maxTokens: 10,
  refillRate: 10 / 60, // ~0.167/sec
  keySource: 'user',
};

/** Auth/PIN endpoints: 5 req/min burst, slow refill (anti-brute-force) */
export const RATE_LIMIT_AUTH: RateLimitConfig = {
  maxTokens: 5,
  refillRate: 5 / 60, // ~0.083/sec
  keySource: 'user',
};

/** Tasker webhook: 30 req/min, IP-based (no session) */
export const RATE_LIMIT_WEBHOOK: RateLimitConfig = {
  maxTokens: 30,
  refillRate: 0.5,
  keySource: 'ip',
};

// ── Bucket Storage ──────────────────────────────────────────────────────────

const buckets = new Map<string, Bucket>();

/** Cleanup interval: remove stale buckets every 5 minutes */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
/** Bucket is stale if not accessed for 10 minutes */
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

let lastCleanup = Date.now();

function cleanupStaleBuckets(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > STALE_THRESHOLD_MS) {
      buckets.delete(key);
    }
  }
}

// ── Core Algorithm ──────────────────────────────────────────────────────────

/**
 * Attempts to consume one token from the bucket identified by `key`.
 *
 * @param key         - Unique identifier for the bucket (e.g. `userId:route` or `ip:route`)
 * @param maxTokens   - Maximum tokens the bucket can hold (burst capacity)
 * @param refillRate  - Tokens added per second
 * @returns           - Whether the request is allowed, remaining tokens, and retry-after time
 */
export function consumeToken(
  key: string,
  maxTokens: number,
  refillRate: number,
): RateLimitResult {
  // Periodic cleanup
  cleanupStaleBuckets();

  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: maxTokens, lastRefill: now };

  // Refill tokens based on time elapsed
  const elapsedSec = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsedSec * refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      retryAfterMs: 0,
    };
  }

  // Rejected — calculate when the next token will be available
  const deficit = 1 - bucket.tokens;
  const retryAfterMs = Math.ceil((deficit / refillRate) * 1000);
  buckets.set(key, bucket);

  return {
    allowed: false,
    remaining: 0,
    retryAfterMs,
  };
}

// ── IP Extraction ───────────────────────────────────────────────────────────

export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ── Middleware Wrapper ──────────────────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Next.js route handler with token bucket rate limiting.
 *
 * Usage:
 *   export const GET = withRateLimit(async (req) => { ... }, RATE_LIMIT_GENERAL);
 *   export const POST = withRateLimit(async (req) => { ... }, RATE_LIMIT_AI);
 *
 * For user-based limiting, extracts userId from X-Rate-Limit-Key header
 * (set by the route handler itself before the rate limit check) or falls
 * back to 'anonymous'. Since most routes call auth() first, the wrapper
 * expects the handler to be called after auth is resolved.
 *
 * For IP-based limiting (webhooks), uses the client IP.
 */
export function withRateLimit(
  handler: RouteHandler,
  config: RateLimitConfig,
  routeKey: string,
): RouteHandler {
  return async (req, context) => {
    let key: string;

    if (config.keySource === 'ip') {
      key = `ip:${getClientIP(req)}:${routeKey}`;
    } else {
      // For user-based rate limiting, we'll use a header set by auth middleware
      // or fall back to IP-based as a safety net
      const userId = req.headers.get('x-clerk-user-id');
      if (userId) {
        key = `user:${userId}:${routeKey}`;
      } else {
        // Fallback to IP when userId isn't available yet
        key = `ip:${getClientIP(req)}:${routeKey}`;
      }
    }

    const result = consumeToken(key, config.maxTokens, config.refillRate);

    if (!result.allowed) {
      const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Limit': String(config.maxTokens),
          },
        },
      );
    }

    // Call the actual handler
    const response = await handler(req, context);

    // Attach rate limit headers to successful responses
    if (response.headers) {
      response.headers.set('X-RateLimit-Remaining', String(result.remaining));
      response.headers.set('X-RateLimit-Limit', String(config.maxTokens));
    }

    return response;
  };
}

// ── Inline Rate Limit Check ────────────────────────────────────────────────

/**
 * Inline rate limit check for use inside route handlers
 * (when you need to check auth first and then rate limit by userId).
 *
 * Returns null if allowed, or a NextResponse(429) if rejected.
 *
 * Usage:
 *   const blocked = checkRateLimit(userId, 'ai-categorize', RATE_LIMIT_AI);
 *   if (blocked) return blocked;
 */
export function checkRateLimit(
  identifier: string,
  routeKey: string,
  config: RateLimitConfig,
): NextResponse | null {
  const key = `${config.keySource === 'ip' ? 'ip' : 'user'}:${identifier}:${routeKey}`;
  const result = consumeToken(key, config.maxTokens, config.refillRate);

  if (!result.allowed) {
    const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Limit': String(config.maxTokens),
        },
      },
    );
  }

  return null; // Allowed
}
