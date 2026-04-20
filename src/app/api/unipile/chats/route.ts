import { createApiHandler, Errors } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import { getAccountIdForUser, getAllAccountIdsForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import type { UnipileChat, UnipileListResponse } from "@/lib/unipile/types";

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

/** Enrich chats with interlocutor names and picture_url from attendees API */
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
    const pic = attendees.find((a) => a.picture_url)?.picture_url;
    if (pic) ext.picture_url = pic;
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

    const enriched = await enrichChatsWithInterlocutorNames(allItems);
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
