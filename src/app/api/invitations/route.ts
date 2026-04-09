import { createApiHandler, Errors } from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/invitations
 * Liste les invitations (consumed_at IS NULL ou non) pour le workspace courant.
 * Réservé aux owners/admins.
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

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

    const { data, error } = await service
      .from("invitations")
      .select("id, email, role, created_at, expires_at, consumed_at")
      .eq("organization_id", ctx.workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw Errors.internal(error.message);

    return {
      items: (data ?? []).map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
        consumed_at: inv.consumed_at,
        status: inv.consumed_at
          ? "joined"
          : new Date(inv.expires_at) < new Date()
            ? "expired"
            : "pending",
      })),
    };
  },
  { requireWorkspace: true }
);
