import { createApiHandler, Errors } from "../../../../lib/api";

interface Activity {
  id: string;
  type: "prospect_added";
  title: string;
  description: string;
  timestamp: string;
}

/**
 * GET /api/dashboard/activity
 * Returns recent activity for the dashboard (prospect_added only for now)
 */
export const GET = createApiHandler(async (_req, ctx): Promise<Activity[]> => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data, error } = await ctx.supabase
    .from("prospects")
    .select("id, full_name, source, created_at")
    .eq("organization_id", ctx.workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw Errors.internal("Failed to fetch activity");
  }

  const activities: Activity[] = (data ?? []).map((p) => ({
    id: p.id,
    type: "prospect_added" as const,
    title: "Nouveau prospect",
    description: `${p.full_name ?? "Sans nom"} ajouté depuis ${p.source ?? "manuel"}`,
    timestamp: p.created_at ?? new Date().toISOString(),
  }));

  return activities;
});
