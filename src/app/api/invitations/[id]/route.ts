import { createApiHandler, Errors } from "@/lib/api";
import { NextRequest } from "next/server";

/**
 * DELETE /api/invitations/[id]
 * Cancel a pending invitation
 */
export const DELETE = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const invitationId = new URL(req.url).pathname.split("/").pop();
  if (!invitationId) throw Errors.notFound("Invitation");

  const { error } = await ctx.supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .eq("organization_id", ctx.workspaceId);

  if (error) throw Errors.internal("Failed to cancel invitation");
  return { cancelled: true };
});
