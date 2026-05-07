import { createApiHandler, Errors } from "@/lib/api";

/**
 * POST /api/prospects/trash/empty   (CRM-5)
 *
 * Hard-deletes every prospect in the current workspace whose
 * `deleted_at` column is non-null. Returns the number of rows
 * affected so the UI can show a toast like "12 prospects supprimés
 * définitivement".
 *
 * The Supabase RLS on `prospects` already restricts visibility to the
 * caller's organization; we still pin `organization_id = workspaceId`
 * defensively.
 */
export const POST = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { data, error } = await ctx.supabase
    .from("prospects")
    .delete()
    .eq("organization_id", ctx.workspaceId)
    .not("deleted_at", "is", null)
    .select("id");

  if (error) {
    console.error("[API] empty corbeille error:", error);
    throw Errors.internal("Impossible de vider la corbeille");
  }

  return { deleted: (data ?? []).length };
});
