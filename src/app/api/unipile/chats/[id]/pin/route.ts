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

  const { data: row, error: findErr } = await ctx.supabase
    .from("unipile_chat_prospects")
    .select("id")
    .eq("organization_id", ctx.workspaceId)
    .eq("unipile_chat_id", chatId)
    .maybeSingle();

  if (findErr || !row) throw Errors.notFound("Conversation CRM");

  const { error } = await ctx.supabase
    .from("unipile_chat_prospects")
    .update({
      pinned_at: pinned ? new Date().toISOString() : null,
    })
    .eq("id", row.id);

  if (error) throw Errors.internal(error.message);

  return { ok: true as const, pinned };
});
