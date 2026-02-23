import { createApiHandler, Errors, parseBody } from "../../../lib/api";

/**
 * GET /api/workspace
 * Get current workspace details
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspace) {
    throw Errors.notFound("Workspace");
  }

  return {
    workspace: ctx.workspace,
    members: [], // TODO: Fetch members if needed
  };
});

/**
 * PATCH /api/workspace
 * Update workspace settings
 */
export const PATCH = createApiHandler(async (req, ctx) => {
  if (!ctx.workspace) {
    throw Errors.notFound("Workspace");
  }

  const body = await parseBody<{
    name?: string;
    logo_url?: string;
  }>(req);

  // Update workspace
  const { data, error } = await ctx.supabase
    .from("organizations")
    .update({
      name: body.name,
      logo_url: body.logo_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.workspace.id)
    .select()
    .single();

  if (error) {
    throw Errors.internal("Failed to update workspace");
  }

  return data;
});
