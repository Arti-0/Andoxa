import { createApiHandler, Errors } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import type { Json } from "@/lib/types/supabase";
import { parseWorkflowDefinition, tryBuildPublishedDefinition } from "@/lib/workflows";

function getWorkflowIdFromUrl(req: Request): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segments.indexOf("workflows");
  return segments[i + 1] ?? "";
}

/**
 * POST /api/workflows/[id]/publish — copy draft_definition → published_definition (single « publié » state).
 */
export const POST = createApiHandler(
  async (_req, ctx) => {
    assertMessagerieAndTemplatesPlan(ctx);
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
    const id = getWorkflowIdFromUrl(_req);
    if (!id) throw Errors.badRequest("ID workflow manquant");

    const { data: wf, error: wfErr } = await ctx.supabase
      .from("workflows")
      .select("*")
      .eq("id", id)
      .eq("organization_id", ctx.workspaceId)
      .maybeSingle();

    if (wfErr || !wf) throw Errors.notFound("Workflow");

    let def;
    try {
      def = parseWorkflowDefinition(wf.draft_definition);
    } catch {
      throw Errors.badRequest("Brouillon invalide : impossible de parser la définition");
    }

    const built = await tryBuildPublishedDefinition(ctx.supabase, ctx.userId, def);
    if (!built.ok) {
      throw Errors.badRequest(built.message);
    }

    const { data: updated, error: updErr } = await ctx.supabase
      .from("workflows")
      .update({
        published_definition: built.definition as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", ctx.workspaceId)
      .select()
      .single();

    if (updErr || !updated) throw Errors.internal("Publication impossible");

    return { workflow: updated };
  },
  { rateLimit: { name: "workflows-publish", requests: 30, window: "1 m" } }
);
