import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";

/**
 * POST /api/organization/invite-by-user-id
 * Owner/admin adds a member by target user's UUID (waiting room flow).
 */
export const POST = createApiHandler(
  async (req: NextRequest, ctx) => {
    if (!ctx.workspaceId) {
      throw Errors.badRequest("Workspace requis");
    }

    const body = await parseBody<{ user_id?: string }>(req);
    const targetUserId = body.user_id?.trim();
    if (!targetUserId) {
      throw Errors.badRequest("user_id requis");
    }

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(targetUserId)) {
      throw Errors.badRequest("user_id doit être un UUID valide");
    }

    if (targetUserId === ctx.userId) {
      throw Errors.badRequest("Vous êtes déjà membre");
    }

    const { data: membership } = await ctx.supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", ctx.workspaceId)
      .eq("user_id", ctx.userId)
      .maybeSingle();

    const isOwner =
      membership?.role === "owner" ||
      (await ctx.supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", ctx.workspaceId)
        .single()
        .then(({ data }) => data?.owner_id === ctx.userId));

    if (!isOwner && membership?.role !== "admin") {
      throw Errors.forbidden("Seuls le propriétaire ou un admin peuvent inviter");
    }

    const { error: insertError } = await ctx.supabase.from("organization_members").insert({
      organization_id: ctx.workspaceId,
      user_id: targetUserId,
      role: "member",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        throw Errors.badRequest("Cet utilisateur est déjà membre");
      }
      throw Errors.internal(insertError.message);
    }

    return { ok: true, organization_id: ctx.workspaceId, user_id: targetUserId };
  },
  { requireWorkspace: true }
);
