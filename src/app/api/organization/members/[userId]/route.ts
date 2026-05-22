import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { requireRole, requireSelfNotTarget } from "@/lib/auth/require-role";

function extractUserId(req: NextRequest) {
  return new URL(req.url).pathname.split("/").pop();
}

/**
 * PATCH /api/organization/members/[userId]
 *
 * Two independent updates, depending on the body:
 *   - `{ role: 'admin' | 'member' }` — change a member's role (owner/admin only).
 *   - `{ active: boolean }` — toggle a member's seat (owner/admin only). Used
 *     by the downgrade-transition view. Owner cannot be deactivated and the
 *     caller cannot toggle themselves.
 *
 * Both can be sent together. Owner role-change is *not* allowed here — owner
 * transfer goes through the dedicated `transfer_ownership` RPC.
 */
export const PATCH = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const targetUserId = extractUserId(req);
  if (!targetUserId) throw Errors.notFound("Member");

  await requireRole(ctx, "admin");

  const body = await parseBody<{ role?: string; active?: boolean }>(req);
  const wantsRoleChange = typeof body.role === "string";
  const wantsActiveChange = typeof body.active === "boolean";

  if (!wantsRoleChange && !wantsActiveChange) {
    throw Errors.badRequest("Aucun changement demandé");
  }

  if (wantsRoleChange && !["admin", "member"].includes(body.role!)) {
    throw Errors.validation({ role: "Must be 'admin' or 'member'" });
  }

  requireSelfNotTarget(
    ctx,
    targetUserId,
    "Vous ne pouvez pas modifier votre propre membre"
  );

  // Owner is protected from BOTH role changes and deactivation. Role moves
  // happen only via transfer_ownership; deactivation of an owner would
  // leave the org with zero owners and violate the partial unique index.
  const { data: targetMember } = await ctx.supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", ctx.workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!targetMember) throw Errors.notFound("Member");
  if (targetMember.role === "owner") {
    throw Errors.badRequest(
      "Le propriétaire ne peut pas être modifié — utilisez le transfert de propriété"
    );
  }

  const updates: { role?: string; active?: boolean; deactivated_at?: string | null } = {};
  if (wantsRoleChange) updates.role = body.role!;
  if (wantsActiveChange) {
    updates.active = body.active!;
    updates.deactivated_at = body.active === false ? new Date().toISOString() : null;
  }

  const { data, error } = await ctx.supabase
    .from("organization_members")
    .update(updates)
    .eq("organization_id", ctx.workspaceId)
    .eq("user_id", targetUserId)
    .select()
    .single();

  if (error || !data) throw Errors.notFound("Member");
  return data;
});

/**
 * DELETE /api/organization/members/[userId]
 * Remove a member from the organization (owner/admin only)
 */
export const DELETE = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const targetUserId = extractUserId(req);
  if (!targetUserId) throw Errors.notFound("Member");

  await requireRole(ctx, "admin");
  requireSelfNotTarget(
    ctx,
    targetUserId,
    "Vous ne pouvez pas vous retirer vous-même de l'organisation"
  );

  // Fetch member + org info before deletion (for notification message)
  const { data: targetProfile } = await ctx.supabase
    .from("profiles")
    .select("full_name")
    .eq("id", targetUserId)
    .single();

  const { data: targetMember } = await ctx.supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", ctx.workspaceId)
    .eq("user_id", targetUserId)
    .single();

  if (targetMember?.role === "owner") {
    throw Errors.badRequest("Impossible de retirer le propriétaire de l'organisation");
  }

  const { data: org } = await ctx.supabase
    .from("organizations")
    .select("name")
    .eq("id", ctx.workspaceId)
    .single();

  const { error } = await ctx.supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", ctx.workspaceId)
    .eq("user_id", targetUserId);

  if (error) throw Errors.internal("Failed to remove member");

  const memberName = (targetProfile as { full_name?: string | null } | null)?.full_name?.trim() || "Un membre";
  const orgName = (org as { name?: string | null } | null)?.name?.trim() || "l'organisation";
  await createNotification(ctx.supabase, {
    title: "Membre retiré de l'organisation",
    message: `${memberName} ne fait plus partie de ${orgName}`,
    category: "user",
    action_type: "user_left",
    actor_id: ctx.userId ?? null,
    organization_id: ctx.workspaceId,
    target_url: "/settings",
  });

  return { removed: true };
});
