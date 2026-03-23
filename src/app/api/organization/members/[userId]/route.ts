import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";

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

  const { data: targetMember } = await ctx.supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", ctx.workspaceId)
    .eq("user_id", targetUserId)
    .single();

  if (targetMember?.role === "owner") {
    throw Errors.badRequest("Impossible de retirer le propriétaire de l'organisation");
  }

  const { error } = await ctx.supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", ctx.workspaceId)
    .eq("user_id", targetUserId);

  if (error) throw Errors.internal("Failed to remove member");
  return { removed: true };
});
