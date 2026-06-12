/**
 * Cached reads of the user's OWN LinkedIn account state via Unipile, feeding
 * the safety engine (entry gate + pacing circuit breakers):
 *
 *   - `fetchOwnLinkedInProfileSnapshot`: photo / headline / bio / connections
 *     count from `GET /users/me`. Powers the credibility check (photo, title,
 *     20+ connections) and the maturity check (150+ connections, bio filled).
 *   - `fetchPendingInvitationsCount`: count of still-pending sent invitations
 *     from `GET /users/invite/sent`. Powers the "too many pending invites"
 *     circuit breaker.
 *
 * Both are best-effort: when Unipile does not expose a field (or the call
 * fails), they return `null` for that piece and the engine falls back to its
 * safe default (the gate does not block on unknown data, the breaker stays
 * disarmed, and the conservative caps do the protecting). Results are cached
 * in Redis so the cron never hammers Unipile: profile 24h, pending count 6h.
 */

import { cache } from "@/lib/cache/redis";
import { UnipileApiError, unipileFetch } from "./client";
import type { UnipileListResponse } from "./types";

const OWN_PROFILE_CACHE_TTL_S = 24 * 3600;
const PENDING_INVITES_CACHE_TTL_S = 6 * 3600;

/** Stop counting pending invitations past this many (the breaker threshold is
 *  far below; exact totals beyond it carry no extra signal). */
const PENDING_INVITES_COUNT_CEILING = 600;
const PENDING_INVITES_PAGE_SIZE = 100;
const PENDING_INVITES_MAX_PAGES = Math.ceil(
  PENDING_INVITES_COUNT_CEILING / PENDING_INVITES_PAGE_SIZE,
);

export type OwnLinkedInProfileSnapshot = {
  hasPhoto: boolean;
  hasHeadline: boolean;
  hasSummary: boolean;
  /** `null` when Unipile does not return a connections count for the account. */
  connectionsCount: number | null;
  /** LinkedIn identity verification badge; `null` when Unipile does not
   *  expose the field for this account (treat as unknown, never as false-bad). */
  isVerified: boolean | null;
};

type UnipileOwnProfile = {
  profile_picture_url?: string | null;
  headline?: string | null;
  occupation?: string | null;
  summary?: string | null;
  connections_count?: number | null;
  follower_count?: number | null;
  is_verified?: boolean | null;
  verified?: boolean | null;
};

/** Best-effort read of the identity-verification flag — Unipile has shipped it
 *  under different names depending on API version; absent = unknown. */
function readIsVerified(p: UnipileOwnProfile): boolean | null {
  if (typeof p.is_verified === "boolean") return p.is_verified;
  if (typeof p.verified === "boolean") return p.verified;
  return null;
}

function readConnectionsCount(p: UnipileOwnProfile): number | null {
  const n = p.connections_count;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Snapshot of the user's own LinkedIn profile, cached 24h per Unipile account.
 * Returns `null` when Unipile is unreachable or errors (callers must treat
 * that as "unknown", never as "bad profile").
 */
export async function fetchOwnLinkedInProfileSnapshot(
  unipileAccountId: string,
): Promise<OwnLinkedInProfileSnapshot | null> {
  const key = `linkedin:ownprofile:${unipileAccountId}`;
  // Cache wraps a sentinel object so a legitimate "Unipile said no" is also
  // cached (a bare null would read as a cache miss and refetch every tick).
  const wrapped = await cache.wrap(
    key,
    async (): Promise<{ v: OwnLinkedInProfileSnapshot | null }> => {
      try {
        const p = await unipileFetch<UnipileOwnProfile>(
          `/users/me?account_id=${encodeURIComponent(unipileAccountId)}&linkedin_sections=*`,
          { timeoutMs: 15_000 },
        );
        return {
          v: {
            hasPhoto: Boolean(p.profile_picture_url?.trim()),
            hasHeadline: Boolean((p.headline ?? p.occupation ?? "").trim()),
            hasSummary: Boolean(p.summary?.trim()),
            connectionsCount: readConnectionsCount(p),
            isVerified: readIsVerified(p),
          },
        };
      } catch (err) {
        if (err instanceof UnipileApiError) return { v: null };
        throw err;
      }
    },
    { ttl: OWN_PROFILE_CACHE_TTL_S },
  );
  return wrapped.v;
}

type UnipileSentInvitation = { id?: string };

/**
 * Number of sent invitations still pending on the LinkedIn account, cached 6h.
 * Counts by paging `GET /users/invite/sent` and stops at
 * {@link PENDING_INVITES_COUNT_CEILING} (returned capped). Returns `null` when
 * the endpoint is unavailable on this Unipile plan or errors, in which case
 * the pending-invitations circuit breaker stays disarmed and the conservative
 * volume caps remain the only protection.
 */
export async function fetchPendingInvitationsCount(
  unipileAccountId: string,
): Promise<number | null> {
  const key = `linkedin:pendinginvites:${unipileAccountId}`;
  const wrapped = await cache.wrap(
    key,
    async (): Promise<{ v: number | null }> => {
      try {
        let count = 0;
        let cursor: string | null = null;
        for (let page = 0; page < PENDING_INVITES_MAX_PAGES; page++) {
          const qs = new URLSearchParams({
            account_id: unipileAccountId,
            limit: String(PENDING_INVITES_PAGE_SIZE),
          });
          if (cursor) qs.set("cursor", cursor);
          const res = await unipileFetch<UnipileListResponse<UnipileSentInvitation>>(
            `/users/invite/sent?${qs.toString()}`,
            { timeoutMs: 15_000 },
          );
          count += res.items?.length ?? 0;
          cursor = res.cursor ?? null;
          if (!cursor || count >= PENDING_INVITES_COUNT_CEILING) break;
        }
        return { v: Math.min(count, PENDING_INVITES_COUNT_CEILING) };
      } catch (err) {
        if (err instanceof UnipileApiError) return { v: null };
        throw err;
      }
    },
    { ttl: PENDING_INVITES_CACHE_TTL_S },
  );
  return wrapped.v;
}

/** Drop both cached reads for an account (call after reconnect). */
export async function invalidateOwnLinkedInAccountCaches(
  unipileAccountId: string,
): Promise<void> {
  await Promise.all([
    cache.del(`linkedin:ownprofile:${unipileAccountId}`),
    cache.del(`linkedin:pendinginvites:${unipileAccountId}`),
  ]);
}
