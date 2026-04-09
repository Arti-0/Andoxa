import { createApiHandler, Errors } from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest } from "next/server";

function extractInvitationId(req: NextRequest) {
  return new URL(req.url).pathname.split("/").pop();
}

/**
 * DELETE /api/invitations/[id]
 * Annule (supprime) une invitation en attente.
 * Seuls owner/admin peuvent annuler.
 */
export const DELETE = createApiHandler(
  async (req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

    const id = extractInvitationId(req);
    if (!id) throw Errors.badRequest("ID requis");

    const { data: callerMember } = await ctx.supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", ctx.workspaceId)
      .eq("user_id", ctx.userId)
      .single();

    if (
      !callerMember ||
      !["owner", "admin"].includes(callerMember.role ?? "")
    ) {
      throw Errors.forbidden();
    }

    const service = createServiceClient();

    const { data: inv } = await service
      .from("invitations")
      .select("id, organization_id, consumed_at")
      .eq("id", id)
      .maybeSingle();

    if (!inv) throw Errors.notFound("Invitation");
    if (inv.organization_id !== ctx.workspaceId) throw Errors.forbidden();
    if (inv.consumed_at) throw Errors.badRequest("Invitation déjà utilisée");

    const { error } = await service.from("invitations").delete().eq("id", id);

    if (error) throw Errors.internal(error.message);

    return { ok: true as const };
  },
  { requireWorkspace: true }
);
