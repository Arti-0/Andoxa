import { createApiHandler, Errors } from "@/lib/api";

/**
 * GET /api/unipile/chats/andoxa-ids
 * Returns unipile_chat_ids that were started via Andoxa (linked in unipile_chat_prospects)
 * and a map chatId -> prospectId for navigation to prospect profile.
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data, error } = await ctx.supabase
    .from("unipile_chat_prospects")
    .select("unipile_chat_id, prospect_id")
    .eq("organization_id", ctx.workspaceId);

  if (error) {
    throw Errors.internal("Impossible de récupérer les chats Andoxa");
  }

  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.unipile_chat_id))];
  const chatToProspect: Record<string, string> = {};
  for (const r of rows) {
    if (r.unipile_chat_id && r.prospect_id) {
      chatToProspect[r.unipile_chat_id] = r.prospect_id;
    }
  }
  return { ids, chatToProspect };
});
