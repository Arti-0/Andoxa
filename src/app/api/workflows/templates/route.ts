import { createApiHandler, Errors } from "@/lib/api";

/**
 * GET /api/workflows/templates
 * Returns workflows in the same organization that have been marked as templates.
 * Built-in templates ship in src/lib/workflows/templates.ts and aren't returned here.
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");

  const { data, error } = await ctx.supabase
    .from("workflows")
    .select(
      "id, name, description, draft_definition, published_definition, metadata, updated_at"
    )
    .eq("organization_id", ctx.workspaceId)
    .eq("is_template", true)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw Errors.internal("Impossible de charger les modèles");

  return { items: data ?? [] };
});
