import { createApiHandler, Errors } from "@/lib/api";

/**
 * GET /api/unipile/chats/andoxa-ids
 * Returns unipile_chat_ids that were started via Andoxa (linked in unipile_chat_prospects).
 * Used to display orange band on those conversations in the LinkedIn page.
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data, error } = await ctx.supabase
    .from("unipile_chat_prospects")
    .select("unipile_chat_id")
    .eq("organization_id", ctx.workspaceId);

  if (error) {
    throw Errors.internal("Impossible de récupérer les chats Andoxa");
  }

  const ids = [...new Set((data ?? []).map((r) => r.unipile_chat_id))];
  return { ids };
});
