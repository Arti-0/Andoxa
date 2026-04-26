import { createApiHandler, Errors } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import { getAccountIdForUser, getAllAccountIdsForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import type { UnipileChat, UnipileListResponse } from "@/lib/unipile/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

/** Stale-after duration: attendee cache entries older than this are refreshed. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface UnipileAttendee {
  id?: string;
  provider_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  picture_url?: string | null;
}

/** Build display name from attendee (first_name, last_name, or name) */
function attendeeDisplayName(a: UnipileAttendee): string | null {
  const first = a.first_name?.trim();
  const last = a.last_name?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ").trim() || null;
  return a.name?.trim() || null;
}

type CachedRow = Database["public"]["Tables"]["unipile_attendee_cache"]["Row"];

/**
 * Load cached attendee data for a set of chat IDs, returning a map
 * chatId → { interlocutor_name, picture_url, cached_at }.
 * Rows that don't exist or are stale are excluded so callers know to refresh them.
 */
async function loadCache(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  chatIds: string[]
): Promise<Map<string, Pick<CachedRow, "interlocutor_name" | "picture_url" | "cached_at">>> {
  if (chatIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("unipile_attendee_cache")
    .select("chat_id, interlocutor_name, picture_url, cached_at")
    .eq("organization_id", organizationId)
    .in("chat_id", chatIds);

  if (error || !data) return new Map();

  const now = Date.now();
  const map = new Map<string, Pick<CachedRow, "interlocutor_name" | "picture_url" | "cached_at">>();
  for (const row of data) {
    const age = now - new Date(row.cached_at).getTime();
    if (age < CACHE_TTL_MS) {
      map.set(row.chat_id, row);
    }
  }
  return map;
}

/**
 * Persist (upsert) a batch of enriched attendee entries to the cache.
 * Silently ignores write errors — the cache is best-effort.
 */
async function saveCache(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  entries: Array<{ chat_id: string; interlocutor_name: string | null; picture_url: string | null }>
): Promise<void> {
  if (entries.length === 0) return;
  const now = new Date().toISOString();
  await supabase
    .from("unipile_attendee_cache")
    .upsert(
      entries.map((e) => ({
        organization_id: organizationId,
        chat_id: e.chat_id,
        interlocutor_name: e.interlocutor_name,
        picture_url: e.picture_url,
        cached_at: now,
      })),
      { onConflict: "organization_id,chat_id" }
    );
}

/**
 * Fetch attendees from Unipile for a single chat and return enrichment data.
 * Returns null on any error so the batch keeps going.
 */
async function fetchAttendeeEnrichment(
  chatId: string
): Promise<{ interlocutor_name: string | null; picture_url: string | null } | null> {
  try {
    const data = await unipileFetch<
      UnipileListResponse<UnipileAttendee> & { items?: UnipileAttendee[] }
    >(`/chats/${chatId}/attendees`);
    const attendees = (data as { items?: UnipileAttendee[] })?.items ?? [];
    const name = attendees.map(attendeeDisplayName).find(Boolean) ?? null;
    const pic = attendees.find((a) => a.picture_url)?.picture_url ?? null;
    return { interlocutor_name: name, picture_url: pic };
  } catch {
    return null;
  }
}

/**
 * Enrich all chats with interlocutor name + picture_url.
 *
 * Strategy (cache-first):
 * 1. Load all chat IDs from the Supabase cache (24-hour TTL).
 * 2. For chat IDs that are missing or stale, fetch from the Unipile attendees API.
 * 3. Persist newly fetched entries back to the cache.
 * 4. Apply enrichment to every chat in the list — no cap.
 */
async function enrichChatsWithCache(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  items: UnipileChat[]
): Promise<(UnipileChat & { interlocutor_name?: string })[]> {
  if (items.length === 0) return [];

  const chatIds = items.map((c) => c.id);
  const cached = await loadCache(supabase, organizationId, chatIds);

  // Identify chats whose cache entry is missing or stale
  const staleIds = chatIds.filter((id) => !cached.has(id));

  if (staleIds.length > 0) {
    const freshResults = await Promise.allSettled(
      staleIds.map(async (id) => ({ id, enrichment: await fetchAttendeeEnrichment(id) }))
    );

    const toSave: Array<{ chat_id: string; interlocutor_name: string | null; picture_url: string | null }> = [];

    for (const r of freshResults) {
      if (r.status !== "fulfilled" || !r.value.enrichment) continue;
      const { id, enrichment } = r.value;
      cached.set(id, {
        interlocutor_name: enrichment.interlocutor_name,
        picture_url: enrichment.picture_url,
        cached_at: new Date().toISOString(),
      });
      toSave.push({ chat_id: id, ...enrichment });
    }

    // Fire-and-forget cache write (don't block the response)
    void saveCache(supabase, organizationId, toSave);
  }

  return items.map((chat) => {
    const entry = cached.get(chat.id);
    if (!entry) return chat;
    const ext = chat as UnipileChat & { interlocutor_name?: string };
    if (entry.interlocutor_name) ext.interlocutor_name = entry.interlocutor_name;
    if (entry.picture_url) ext.picture_url = entry.picture_url;
    return ext;
  });
}

/**
 * GET /api/unipile/chats
 * List chats – proxy to Unipile API.
 * Enriches every chat with interlocutor_name + picture_url via a Supabase-backed
 * 24-hour cache so Unipile attendee round-trips are amortized across requests.
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  assertMessagerieAndTemplatesPlan(ctx);

  const { searchParams } = new URL(req.url);
  const channelFilter = searchParams.get("channel"); // "all", "LINKEDIN", "WHATSAPP"
  const limit = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  const unread = searchParams.get("unread");
  const before = searchParams.get("before");
  const after = searchParams.get("after");

  async function fetchChatsForAccount(accountId: string, accountType: string) {
    const q = new URLSearchParams();
    q.set("account_id", accountId);
    q.set("account_type", accountType);
    if (limit) q.set("limit", limit);
    if (cursor) q.set("cursor", cursor);
    if (unread !== null && unread !== undefined) q.set("unread", unread);
    if (before) q.set("before", before);
    if (after) q.set("after", after);

    const data = await unipileFetch<UnipileListResponse<UnipileChat>>(`/chats?${q.toString()}`);
    return (data?.items ?? []).map((c) => ({ ...c, _channel: accountType }));
  }

  try {
    let allItems: (UnipileChat & { _channel?: string })[] = [];

    if (channelFilter === "all" || !channelFilter) {
      const accounts = await getAllAccountIdsForUser(ctx);
      if (accounts.length === 0) {
        const defaultId = await getAccountIdForUser(ctx);
        allItems = await fetchChatsForAccount(defaultId, "LINKEDIN");
      } else {
        const results = await Promise.allSettled(
          accounts.map((a) => fetchChatsForAccount(a.accountId, a.accountType))
        );
        for (const r of results) {
          if (r.status === "fulfilled") allItems.push(...r.value);
        }
        allItems.sort((a, b) => {
          const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return tb - ta;
        });
      }
    } else {
      const acType = channelFilter as "LINKEDIN" | "WHATSAPP";
      const accountId = await getAccountIdForUser(ctx, acType);
      allItems = await fetchChatsForAccount(accountId, acType);
    }

    // Enrich all chats via cache — no arbitrary cap
    const enriched = await enrichChatsWithCache(ctx.supabase, ctx.workspaceId, allItems);
    return { items: enriched };
  } catch (err) {
    if (err instanceof UnipileApiError) {
      throw Errors.internal(err.message);
    }
    const message = err instanceof Error ? err.message : "Erreur de messagerie";
    if (message.includes("UNIPILE_API_KEY")) {
      throw Errors.internal("La messagerie n'est pas configurée. Contactez l'administrateur.");
    }
    throw Errors.internal(message);
  }
});
