/**
 * Redis Cache Layer
 * 
 * Provides caching for frequently accessed data to reduce Supabase queries.
 * Falls back gracefully when Redis is unavailable.
 * 
 * Usage:
 * ```ts
 * const data = await cache.wrap('key', () => fetchData(), { ttl: 60 });
 * ```
 */

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
// Redis Cache (production)
// ─────────────────────────────────────────────────────────────────────────────

class RedisCache implements CacheClient {
  private client: any; // Redis client type
  private prefix: string;
  private isConnected = false;

  constructor(redisUrl: string, prefix = "andoxa:") {
    this.prefix = prefix;
    this.initializeClient(redisUrl);
  }

  private async initializeClient(redisUrl: string) {
    try {
      // Dynamic import to avoid issues when Redis is not needed
      const { createClient } = await import("redis");
      this.client = createClient({ url: redisUrl });

      this.client.on("error", (err: Error) => {
        console.error("[Redis] Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("[Redis] Connected");
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.warn("[Redis] Failed to connect, using memory cache:", error);
      this.isConnected = false;
    }
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const fullKey = this.getKey(key);
      const value = await this.client.get(fullKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("[Redis] Get error:", error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.isConnected) return;

    try {
      const fullKey = this.getKey(key);
      const ttl = options?.ttl ?? 300;
      await this.client.setEx(fullKey, ttl, JSON.stringify(value));
    } catch (error) {
      console.error("[Redis] Set error:", error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const fullKey = this.getKey(key);
      await this.client.del(fullKey);
    } catch (error) {
      console.error("[Redis] Del error:", error);
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
    if (!this.isConnected) return;

    try {
      const fullPattern = this.getKey(pattern);
      const keys = await this.client.keys(fullPattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error("[Redis] InvalidatePattern error:", error);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Factory
// ─────────────────────────────────────────────────────────────────────────────

let cacheInstance: CacheClient | null = null;

export function createCache(): CacheClient {
  if (cacheInstance) return cacheInstance;

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    cacheInstance = new RedisCache(redisUrl);
  } else {
    console.log("[Cache] No REDIS_URL, using memory cache");
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
