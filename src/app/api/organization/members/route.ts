import { createApiHandler, Errors } from "../../../../lib/api";

/**
 * GET /api/organization/members
 * List organization members (for filter dropdowns)
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data: membersData, error } = await ctx.supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", ctx.workspaceId);

  if (error) {
    console.error("[API] Organization members fetch error:", error);
    throw Errors.internal("Failed to fetch members");
  }

  const userIds = [...new Set((membersData ?? []).map((m: { user_id: string }) => m.user_id))];
  if (userIds.length === 0) {
    return { items: [] };
  }

  const { data: profiles } = await ctx.supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Inconnu"]));

  const members = userIds.map((id) => ({
    id,
    name: profileMap.get(id) ?? "Inconnu",
  }));

  return { items: members };
});
