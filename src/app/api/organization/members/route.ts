import { createApiHandler, Errors } from "../../../../lib/api";

/**
 * GET /api/organization/members
 * List organization members with roles
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data: membersData, error } = await ctx.supabase
    .from("organization_members")
    .select("user_id, role")
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
    .select("id, full_name, avatar_url, email")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string | null; avatar_url?: string | null; email?: string | null }) => [
      p.id,
      { name: p.full_name ?? "Inconnu", avatar_url: p.avatar_url ?? null, email: p.email ?? null },
    ])
  );

  const members = (membersData ?? []).map((m: { user_id: string; role: string | null }) => ({
    id: m.user_id,
    name: profileMap.get(m.user_id)?.name ?? "Inconnu",
    avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
    email: profileMap.get(m.user_id)?.email ?? null,
    role: m.role ?? "member",
  }));

  return { items: members };
});
