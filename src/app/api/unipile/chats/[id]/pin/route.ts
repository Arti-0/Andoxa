import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import type { NextRequest } from "next/server";

function getChatIdForPin(req: NextRequest): string | null {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("chats");
  const id = i >= 0 ? parts[i + 1] : null;
  const tail = i >= 0 ? parts[i + 2] : null;
  if (!id || tail !== "pin") return null;
  return decodeURIComponent(id);
}

/**
 * PATCH /api/unipile/chats/[id]/pin
 * Sets `unipile_chat_prospects.pinned_at` for chats linked to the workspace (CRM-only list).
 */
export const PATCH = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  assertMessagerieAndTemplatesPlan(ctx);

  const chatId = getChatIdForPin(req);
  if (!chatId) throw Errors.badRequest("Chat ID required");

  const body = await parseBody<{ pinned?: boolean }>(req);
  const pinned = body.pinned === true;
  const pinnedAt = pinned ? new Date().toISOString() : null;

  // Pin is a plain boolean that must persist for ANY conversation, and must be
  // robust to a chat having MORE than one linkage row (a CRM-linked row + a
  // prospect-less pin row, or several links). We therefore update *every* row
  // for this (org, chat) — never `maybeSingle()`, which throws on duplicates
  // and was making unpin fail and revert. If no row exists yet, we insert a
  // prospect-less row purely to carry `pinned_at` (the chat→prospect mapping
  // ignores null-prospect rows, so this stays "hors CRM").
  const { data: updatedRows, error: updateErr } = await ctx.supabase
    .from("unipile_chat_prospects")
    .update({ pinned_at: pinnedAt })
    .eq("organization_id", ctx.workspaceId)
    .eq("unipile_chat_id", chatId)
    .select("id");

  if (updateErr) throw Errors.internal(updateErr.message);

  if (pinned) {
    if (!updatedRows || updatedRows.length === 0) {
      // No linkage row yet — insert a prospect-less row purely to carry the pin.
      const { error: insertErr } = await ctx.supabase
        .from("unipile_chat_prospects")
        .insert({
          organization_id: ctx.workspaceId,
          unipile_chat_id: chatId,
          prospect_id: null,
          pinned_at: pinnedAt,
        });
      if (insertErr) throw Errors.internal(insertErr.message);
    }
  } else {
    // Unpin: the UPDATE above already cleared pinned_at on CRM-linked rows.
    // Prospect-less rows exist ONLY to carry a pin, so once unpinned they're
    // dead weight — and a leftover one is exactly what made the conversation
    // "re-pin" on the next refetch. Delete them so no stale marker survives.
    const { error: cleanupErr } = await ctx.supabase
      .from("unipile_chat_prospects")
      .delete()
      .eq("organization_id", ctx.workspaceId)
      .eq("unipile_chat_id", chatId)
      .is("prospect_id", null);
    if (cleanupErr) throw Errors.internal(cleanupErr.message);
  }

  return { ok: true as const, pinned };
});
