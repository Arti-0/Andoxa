import { Errors, type ApiContext } from "@/lib/api";

export type OrgRole = "owner" | "admin" | "member";

const RANK: Record<OrgRole, number> = { member: 0, admin: 1, owner: 2 };

function isOrgRole(value: string | null | undefined): value is OrgRole {
  return value === "owner" || value === "admin" || value === "member";
}

/**
 * Require the caller to hold at least `minRole` in `ctx.workspaceId`.
 *
 * Reads `organization_members.role` once and compares against the rank
 * (member < admin < owner). Throws `Errors.forbidden()` if the caller
 * is missing, deactivated, or under-ranked. Returns the resolved role on
 * success so callers can branch on the exact level when needed.
 *
 *   await requireRole(ctx, "admin");          // any admin or owner
 *   const role = await requireRole(ctx, "owner"); // owner only
 */
export async function requireRole(
  ctx: ApiContext,
  minRole: OrgRole
): Promise<OrgRole> {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data } = await ctx.supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", ctx.workspaceId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const role = data?.role;
  if (!isOrgRole(role)) {
    throw Errors.forbidden();
  }

  if (RANK[role] < RANK[minRole]) {
    throw Errors.forbidden();
  }

  return role;
}

/**
 * Guard for "you can't perform this action on yourself". Used for the
 * role-change and deactivation handlers where targeting your own row is
 * always disallowed (owner self-demotion only happens through the
 * dedicated ownership-transfer flow).
 */
export function requireSelfNotTarget(
  ctx: ApiContext,
  targetUserId: string,
  message = "Vous ne pouvez pas effectuer cette action sur vous-même"
): void {
  if (targetUserId === ctx.userId) {
    throw Errors.badRequest(message);
  }
}
