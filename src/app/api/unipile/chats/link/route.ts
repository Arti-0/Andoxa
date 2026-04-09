import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";

/**
 * POST /api/unipile/chats/link
 * Lie une conversation Unipile à un prospect existant.
 * Crée une entrée dans unipile_chat_prospects.
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  assertMessagerieAndTemplatesPlan(ctx);

  const body = await parseBody<{
    chat_id: string;
    prospect_id: string;
  }>(req);

  if (!body.chat_id?.trim()) throw Errors.validation({ chat_id: "Requis" });
  if (!body.prospect_id?.trim())
    throw Errors.validation({ prospect_id: "Requis" });

  const { data: prospect } = await ctx.supabase
    .from("prospects")
    .select("id")
    .eq("id", body.prospect_id)
    .eq("organization_id", ctx.workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!prospect) throw Errors.notFound("Prospect");

  const { error } = await ctx.supabase.from("unipile_chat_prospects").upsert(
    [
      {
        prospect_id: body.prospect_id,
        unipile_chat_id: body.chat_id.trim(),
        organization_id: ctx.workspaceId,
      },
    ],
    { onConflict: "prospect_id,unipile_chat_id" }
  );

  if (error) throw Errors.internal(error.message);

  return { ok: true as const };
});
