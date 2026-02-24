import { createApiHandler, Errors } from "@/lib/api";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import type { UnipileChat, UnipileListResponse } from "@/lib/unipile/types";

interface UnipileAttendee {
  id?: string;
  provider_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
}

/** Build display name from attendee (first_name, last_name, or name) */
function attendeeDisplayName(a: UnipileAttendee): string | null {
  const first = a.first_name?.trim();
  const last = a.last_name?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ").trim() || null;
  return a.name?.trim() || null;
}

/** Enrich chats with interlocutor names from attendees API */
async function enrichChatsWithInterlocutorNames(
  items: UnipileChat[],
  maxEnrich = 25
): Promise<(UnipileChat & { interlocutor_name?: string })[]> {
  const toEnrich = items.slice(0, maxEnrich);
  const results = await Promise.allSettled(
    toEnrich.map((chat) =>
      unipileFetch<
        UnipileListResponse<UnipileAttendee> & { items?: UnipileAttendee[] }
      >(`/chats/${chat.id}/attendees`)
    )
  );

  const enriched = items.map((chat, i) => {
    const ext = chat as UnipileChat & { interlocutor_name?: string };
    if (i >= toEnrich.length) return ext;
    const res = results[i];
    if (res.status !== "fulfilled") return ext;
    const data = res.value;
    const attendees = (data as { items?: UnipileAttendee[] })?.items ?? [];
    const name = attendees.map(attendeeDisplayName).find(Boolean);
    if (name) ext.interlocutor_name = name;
    return ext;
  });

  return enriched;
}

/**
 * GET /api/unipile/chats
 * List chats – proxy to Unipile API
 * Enriches each chat with interlocutor_name from attendees when chat.name is empty.
 * Query: account_type (optional), limit, cursor, unread, before, after
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const accountId = await getAccountIdForUser(ctx);

  const { searchParams } = new URL(req.url);
  const accountType = searchParams.get("account_type");
  const limit = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  const unread = searchParams.get("unread");
  const before = searchParams.get("before");
  const after = searchParams.get("after");

  const q = new URLSearchParams();
  q.set("account_id", accountId);
  if (accountType) q.set("account_type", accountType);
  else q.set("account_type", "LINKEDIN");
  if (limit) q.set("limit", limit);
  if (cursor) q.set("cursor", cursor);
  if (unread !== null && unread !== undefined) q.set("unread", unread);
  if (before) q.set("before", before);
  if (after) q.set("after", after);
  const query = q.toString();
  const path = query ? `/chats?${query}` : "/chats";

  try {
    const data = await unipileFetch<UnipileListResponse<UnipileChat>>(path);
    const items = data?.items ?? [];
    const enriched = await enrichChatsWithInterlocutorNames(items);
    return { ...data, items: enriched };
  } catch (err) {
    if (err instanceof UnipileApiError) {
      throw Errors.internal(err.message);
    }
    const message = err instanceof Error ? err.message : "Unipile API error";
    if (message.includes("UNIPILE_API_KEY")) {
      throw Errors.internal(
        "Unipile n'est pas configuré. Définissez UNIPILE_API_KEY."
      );
    }
    throw Errors.internal(message);
  }
});
