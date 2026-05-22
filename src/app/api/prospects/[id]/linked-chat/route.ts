import {
  createApiHandler,
  Errors,
  type ApiContext,
} from "../../../../../lib/api";
import { NextRequest } from "next/server";

export interface LinkedChatPayload {
  unipile_chat_id: string | null;
}

export async function getLinkedChat(
  ctx: ApiContext,
  prospectId: string,
): Promise<LinkedChatPayload> {
  if (!prospectId) throw Errors.notFound("Prospect");
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { data, error } = await ctx.supabase
    .from("unipile_chat_prospects")
    .select("unipile_chat_id")
    .eq("prospect_id", prospectId)
    .eq("organization_id", ctx.workspaceId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw Errors.internal("Impossible de récupérer le chat lié");
  }

  return { unipile_chat_id: data?.unipile_chat_id ?? null };
}

/**
 * GET /api/prospects/[id]/linked-chat
 * Returns the unipile_chat_id for this prospect if linked in unipile_chat_prospects.
 * Used for quick link to Messagerie from the prospect profile.
 */
export const GET = createApiHandler(async (req: NextRequest, ctx) => {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const prospectId = segments[segments.length - 2];
  return getLinkedChat(ctx, prospectId);
});
