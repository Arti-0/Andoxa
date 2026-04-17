import type { SupabaseClient } from "@supabase/supabase-js";
import { unipileFetch } from "@/lib/unipile/client";
import type { Database } from "@/lib/types/supabase";

const PAGE_SIZE = 50;
const DELAY_BETWEEN_PAGES_MS = 2000;
const MAX_PAGES = 60;

type RelationsPage = {
  object?: string;
  items?: Array<{
    provider_id?: string;
    id?: string;
    member_id?: string;
  }>;
  cursor?: string | null;
};

function attendeeIdFromRelationItem(item: NonNullable<RelationsPage["items"]>[number]): string | null {
  const raw = item.provider_id ?? item.id ?? item.member_id ?? null;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

/**
 * Full paginated sync of LinkedIn relations for a user (background job).
 * Same row shape as `syncLinkedInRelations` in the Unipile webhook; uses Unipile cursor pagination.
 */
export async function syncAllLinkedInRelations(
  userId: string,
  unipileAccountId: string,
  supabase: SupabaseClient<Database>
): Promise<{ synced: number; pages: number }> {
  console.log(`[LinkedIn] Starting full relation sync for user ${userId}`);

  let cursor: string | undefined;
  let totalSynced = 0;
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    const qs = new URLSearchParams({
      account_id: unipileAccountId,
      limit: String(PAGE_SIZE),
    });
    if (cursor) {
      qs.set("cursor", cursor);
    }

    const data = await unipileFetch<RelationsPage>(`/users/relations?${qs.toString()}`);
    const items = data?.items ?? [];

    if (!items.length) {
      break;
    }

    const rows = items
      .map((r) => {
        const attendee_id = attendeeIdFromRelationItem(r);
        if (!attendee_id) return null;
        return {
          user_id: userId,
          attendee_id,
          connected_at: new Date().toISOString(),
        };
      })
      .filter(
        (r): r is { user_id: string; attendee_id: string; connected_at: string } => r != null
      );

    if (rows.length > 0) {
      const { error } = await supabase.from("linkedin_relations").upsert(rows, {
        onConflict: "user_id,attendee_id",
        ignoreDuplicates: true,
      });
      if (error) {
        console.error("[LinkedIn] Full relation sync upsert:", error);
      }
    }

    totalSynced += items.length;
    pageCount++;

    const nextCursor =
      data.cursor != null && String(data.cursor).trim() !== ""
        ? String(data.cursor).trim()
        : null;

    if (!nextCursor) {
      break;
    }

    cursor = nextCursor;
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_PAGES_MS));
  }

  return { synced: totalSynced, pages: pageCount };
}
