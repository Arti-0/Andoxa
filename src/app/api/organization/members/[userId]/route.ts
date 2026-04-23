import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";
import { createNotification } from "@/lib/notifications/create-notification";

function extractUserId(req: NextRequest) {
  return new URL(req.url).pathname.split("/").pop();
}

/**
 * PATCH /api/organization/members/[userId]
 * Change a member's role (owner/admin only)
 */
export const PATCH = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const targetUserId = extractUserId(req);
  if (!targetUserId) throw Errors.notFound("Member");

  const { data: callerMember } = await ctx.supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", ctx.workspaceId)
    .eq("user_id", ctx.userId)
    .single();

  if (!callerMember || !["owner", "admin"].includes(callerMember.role ?? "")) {
    throw Errors.forbidden();
  }

  const body = await parseBody<{ role: string }>(req);
  if (!body.role || !["admin", "member"].includes(body.role)) {
    throw Errors.validation({ role: "Must be 'admin' or 'member'" });
  }

  if (targetUserId === ctx.userId) {
    throw Errors.badRequest("Vous ne pouvez pas changer votre propre rôle");
  }

  const { data, error } = await ctx.supabase
    .from("organization_members")
    .update({ role: body.role })
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

  const { data: callerMember } = await ctx.supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", ctx.workspaceId)
    .eq("user_id", ctx.userId)
    .single();

  if (!callerMember || !["owner", "admin"].includes(callerMember.role ?? "")) {
    throw Errors.forbidden();
  }

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
