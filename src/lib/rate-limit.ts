import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, requests: number, window: string): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const key = `${name}:${requests}:${window}`;
  if (limiters.has(key)) return limiters.get(key)!;

  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(requests, window as `${number} ${"s" | "m" | "h" | "d"}`),
    prefix: `rl:${name}`,
    analytics: false,
  });
  limiters.set(key, limiter);
  return limiter;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier.
 * Returns null if rate limiting is not configured (missing Redis credentials).
 */
export async function checkRateLimit(
  identifier: string,
  name = "api",
  requests = 100,
  window = "1 m"
): Promise<RateLimitResult | null> {
  const limiter = getLimiter(name, requests, window);
  if (!limiter) return null;

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch {
    return null;
  }
}

/**
 * Rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}

/**
 * Returns a 429 response if rate limited, or null if allowed.
 */
export async function withRateLimit(
  request: NextRequest,
  identifier: string,
  options?: { name?: string; requests?: number; window?: string }
): Promise<NextResponse | null> {
  const result = await checkRateLimit(
    identifier,
    options?.name ?? "api",
    options?.requests ?? 100,
    options?.window ?? "1 m"
  );

  if (!result) return null;

  if (!result.success) {
    // Same contract as createApiHandler errors: non-2xx + success: false (never 200).
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Trop de requêtes. Réessayez dans quelques instants.",
        },
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(result),
          "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}
