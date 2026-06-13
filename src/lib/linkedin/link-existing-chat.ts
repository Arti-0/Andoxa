/**
 * Links a CRM prospect to an *existing* LinkedIn conversation that wasn't
 * started through Andoxa.
 *
 * Why this exists: messagerie marks a chat "Hors CRM" purely on the absence of
 * a `unipile_chat_prospects` row. That row is normally created at send time or
 * by the inbound webhook backfill — neither fires when you simply add a prospect
 * you were already talking to. This resolver bridges that gap: prospect vanity
 * URL → provider_id (one Unipile lookup) → scan the account's recent chats for
 * the 1:1 whose attendee matches → upsert the link.
 *
 * Cost note: matching is attendee-based because a chat object only exposes a
 * Unipile-internal id, not the LinkedIn member id. So we fetch attendees per
 * chat, capped by `maxChats`, and stop at the first match. Run it in the
 * background (Next `after()`) or a cron — never inline on a hot request.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { unipileFetch } from "@/lib/unipile/client";
import { extractLinkedInSlug } from "@/lib/unipile/campaign";
import type { UnipileListResponse } from "@/lib/unipile/types";

/** Default ceiling on how many recent chats to scan before giving up. */
export const LINK_CHAT_MAX_SCAN = 100;

interface AttendeeLite {
  id?: string;
  provider_id?: string;
}

export type LinkExistingChatReason =
  | "invalid_linkedin"
  | "provider_unresolved"
  | "no_chat"
  | "linked";

export interface LinkExistingChatResult {
  found: boolean;
  chatId: string | null;
  providerId: string | null;
  reason: LinkExistingChatReason;
}

/** Resolve a prospect's LinkedIn vanity URL to its provider_id. Null on failure. */
async function resolveProviderId(
  accountId: string,
  slug: string,
): Promise<string | null> {
  try {
    const res = await unipileFetch<{ provider_id?: string }>(
      `/users/${encodeURIComponent(slug)}?account_id=${encodeURIComponent(accountId)}`,
    );
    return res?.provider_id ?? null;
  } catch {
    return null;
  }
}

/** Find the existing chat whose attendees include `providerId`. Scans the most
 *  recent `maxChats` chats and returns the first match (null if none). */
async function findChatIdForProviderId(
  accountId: string,
  providerId: string,
  maxChats: number,
): Promise<string | null> {
  let chats: { id: string }[];
  try {
    const data = await unipileFetch<UnipileListResponse<{ id: string }>>(
      `/chats?account_id=${encodeURIComponent(accountId)}&account_type=LINKEDIN&limit=${maxChats}`,
    );
    chats = data?.items ?? [];
  } catch {
    return null;
  }

  for (const chat of chats) {
    try {
      const att = await unipileFetch<
        UnipileListResponse<AttendeeLite> & { items?: AttendeeLite[] }
      >(`/chats/${chat.id}/attendees`);
      const match = (att.items ?? []).some(
        (a) => a.id === providerId || a.provider_id === providerId,
      );
      if (match) return chat.id;
    } catch {
      // Skip a chat whose attendees can't be fetched; keep scanning.
    }
  }
  return null;
}

/**
 * Best-effort: find and link the prospect's existing LinkedIn chat. Never
 * throws — returns a structured result the caller can act on or ignore.
 */
export async function linkExistingChatForProspect(
  supabase: SupabaseClient<Database>,
  args: {
    organizationId: string;
    accountId: string;
    prospectId: string;
    linkedin: string;
    maxChats?: number;
  },
): Promise<LinkExistingChatResult> {
  const slug = extractLinkedInSlug(args.linkedin);
  if (!slug) {
    return { found: false, chatId: null, providerId: null, reason: "invalid_linkedin" };
  }

  const providerId = await resolveProviderId(args.accountId, slug);
  if (!providerId) {
    return { found: false, chatId: null, providerId: null, reason: "provider_unresolved" };
  }

  const chatId = await findChatIdForProviderId(
    args.accountId,
    providerId,
    args.maxChats ?? LINK_CHAT_MAX_SCAN,
  );
  if (!chatId) {
    return { found: false, chatId: null, providerId, reason: "no_chat" };
  }

  await supabase.from("unipile_chat_prospects").upsert(
    {
      prospect_id: args.prospectId,
      unipile_chat_id: chatId,
      organization_id: args.organizationId,
    },
    { onConflict: "prospect_id,unipile_chat_id" },
  );

  return { found: true, chatId, providerId, reason: "linked" };
}
