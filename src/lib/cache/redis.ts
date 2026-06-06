// andoxa-perf-2b 2026-06-06: switched to Upstash REST client (serverless-safe)
/**
 * Redis Cache Layer
 *
 * Provides caching for frequently accessed data to reduce Supabase queries.
 * Backed by Upstash Redis over HTTP/REST — stateless and connectionless, which
 * is the correct client for Vercel serverless / Fluid Compute (no TCP connection
 * to establish per cold start). Falls back to an in-memory cache when Upstash
 * credentials are absent (local dev).
 *
 * Usage:
 * ```ts
 * const data = await cache.wrap('key', () => fetchData(), { ttl: 60 });
 * ```
 */

import { Redis } from "@upstash/redis";

// andoxa-perf-2b: hard ceiling on any single Upstash round-trip. In-region
// Upstash answers in ~tens of ms; if it's slow or erroring, the cache MUST
// degrade to a DB read fast rather than stall the request. (A 13s prod sample
// traced to default 5× exponential-backoff retries on a failing Upstash.) Any
// dangling promise resolves later and is harmlessly discarded.
const CACHE_OP_TIMEOUT_MS = 600;

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout), ms);
  });
  return Promise.race([p.finally(() => clearTimeout(timer)), timeout]);
}

// A dead/unreachable Upstash would otherwise log on every single cache op
// (2× per request). Log the first occurrence per instance, then stay silent —
// the cache has already degraded to a DB read, so this is informational.
let cacheErrorLogged = false;
function logCacheErrorOnce(op: string, error: unknown): void {
  if (cacheErrorLogged) return;
  cacheErrorLogged = true;
  console.error(
    `[Cache] ${op} error (degraded to DB; further cache errors suppressed):`,
    error
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number;
  /** Cache key prefix */
  prefix?: string;
}

interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  del(key: string): Promise<void>;
  wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T>;
  invalidatePattern(pattern: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default TTLs (in seconds)
// ─────────────────────────────────────────────────────────────────────────────

export const CACHE_TTL = {
  /** User session data - short TTL */
  SESSION: 60,
  /** Workspace data - medium TTL */
  WORKSPACE: 300,
  /** Subscription data - medium TTL */
  SUBSCRIPTION: 300,
  /** Prospects list - short TTL (frequently updated) */
  PROSPECTS: 60,
  /** Campaign stats - medium TTL */
  CAMPAIGNS: 180,
  /** KPI data - short TTL */
  KPI: 30,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Fallback Cache (for development/when Redis unavailable)
// ─────────────────────────────────────────────────────────────────────────────

class MemoryCache implements CacheClient {
  private store = new Map<string, { value: unknown; expiresAt: number }>();
  private prefix: string;

  constructor(prefix = "andoxa:") {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);
    const entry = this.store.get(fullKey);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(fullKey);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.getKey(key);
    const ttl = options?.ttl ?? 300; // Default 5 minutes
    const expiresAt = Date.now() + ttl * 1000;

    this.store.set(fullKey, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    this.store.delete(fullKey);
  }

  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, options);
    return result;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const fullPattern = this.getKey(pattern);
    const regex = new RegExp(
      "^" + fullPattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upstash Redis Cache (production) — HTTP/REST, stateless, serverless-friendly
// ─────────────────────────────────────────────────────────────────────────────

class UpstashCache implements CacheClient {
  private client: Redis;
  private prefix: string;

  constructor(url: string, token: string, prefix = "andoxa:") {
    this.prefix = prefix;
    // Stateless REST client — no connection lifecycle, safe to construct once
    // and reuse across invocations. `retry` is capped: the default is 5 attempts
    // with exponential backoff (~12s ceiling), which turned a failing Upstash
    // into multi-second request stalls. One quick retry, then fall back.
    this.client = new Redis({
      url,
      token,
      retry: { retries: 1, backoff: () => 50 },
    });
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // @upstash/redis transparently (de)serializes JSON values. Bounded by
      // withTimeout so a slow/unreachable Upstash degrades to a miss fast.
      const value = await withTimeout<T | null>(
        this.client.get<T>(this.getKey(key)),
        CACHE_OP_TIMEOUT_MS,
        null
      );
      return value ?? null;
    } catch (error) {
      logCacheErrorOnce("Get", error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? 300;
      await withTimeout<unknown>(
        this.client.set(this.getKey(key), value, { ex: ttl }),
        CACHE_OP_TIMEOUT_MS,
        undefined
      );
    } catch (error) {
      logCacheErrorOnce("Set", error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(this.getKey(key));
    } catch (error) {
      console.error("[Cache] Del error:", error);
    }
  }

  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, options);
    return result;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = this.getKey(pattern);
      // SCAN instead of KEYS: non-blocking, O(1) per call. KEYS is O(N) over the
      // whole keyspace and is discouraged in production.
      let cursor = "0";
      const toDelete: string[] = [];
      do {
        const [next, batch] = await this.client.scan(cursor, {
          match: fullPattern,
          count: 100,
        });
        cursor = next;
        if (batch.length > 0) toDelete.push(...batch);
      } while (cursor !== "0");

      if (toDelete.length > 0) {
        await this.client.del(...toDelete);
      }
    } catch (error) {
      console.error("[Cache] InvalidatePattern error:", error);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Factory
// ─────────────────────────────────────────────────────────────────────────────

let cacheInstance: CacheClient | null = null;

export function createCache(): CacheClient {
  if (cacheInstance) return cacheInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    cacheInstance = new UpstashCache(url, token);
  } else {
    console.log("[Cache] No Upstash credentials, using in-memory cache");
    cacheInstance = new MemoryCache();
  }

  return cacheInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────────────────────────────────────

export const cache = createCache();

// ─────────────────────────────────────────────────────────────────────────────
// Cache Key Builders (consistent key generation)
// ─────────────────────────────────────────────────────────────────────────────

export const cacheKeys = {
  workspace: (id: string) => `workspace:${id}`,
  workspaceMembers: (id: string) => `workspace:${id}:members`,
  subscription: (workspaceId: string) => `subscription:${workspaceId}`,
  prospects: (workspaceId: string, page?: number) =>
    page ? `prospects:${workspaceId}:page:${page}` : `prospects:${workspaceId}`,
  prospect: (id: string) => `prospect:${id}`,
  campaigns: (workspaceId: string) => `campaigns:${workspaceId}`,
  campaign: (id: string) => `campaign:${id}`,
  kpi: (workspaceId: string) => `kpi:${workspaceId}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Cache Invalidation Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const invalidate = {
  workspace: async (workspaceId: string) => {
    await cache.invalidatePattern(`workspace:${workspaceId}*`);
  },
  /** Call after any prospect row change (create, update, soft-delete, import, bulk…). Wired from API routes; keeps list cache correct once GET uses `cacheKeys.prospects`. */
  prospects: async (workspaceId: string) => {
    await cache.invalidatePattern(`prospects:${workspaceId}*`);
  },
  campaigns: async (workspaceId: string) => {
    await cache.invalidatePattern(`campaigns:${workspaceId}*`);
  },
  all: async (workspaceId: string) => {
    await cache.invalidatePattern(`*:${workspaceId}*`);
  },
};
