import { NextRequest } from "next/server";
import {
  createApiHandler,
  Errors,
  parseBody,
  type ApiContext,
} from "@/lib/api";
import { redeemOrganizationInvitation } from "@/lib/invitations/redeem-invite";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/invitations/redeem
 * Accepts a pending invite for the authenticated user (session cookies).
 */
export const POST = createApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    const body = await parseBody<{ token?: string; invite_token?: string }>(
      req
    );
    const token = body.token?.trim() ?? body.invite_token?.trim();
    if (!token) {
      throw Errors.badRequest("Token requis");
    }
    if (!UUID_RE.test(token)) {
      throw Errors.badRequest("Token invalide");
    }

    const { result, rpcError } = await redeemOrganizationInvitation(
      ctx.supabase,
      token
    );

    if (rpcError) {
      throw Errors.internal(rpcError);
    }

    if (!result.success) {
      const message =
        result.reason === "email_mismatch"
          ? "Cette invitation ne correspond pas à l’adresse e-mail du compte connecté."
          : result.reason === "email_not_confirmed"
            ? "Confirmez votre adresse e-mail avant d’accepter l’invitation."
            : result.reason === "invalid_or_expired_token"
              ? "Invitation invalide ou expirée."
              : "Impossible d’accepter l’invitation.";
      throw Errors.badRequest(message);
    }

    return {
      ok: true as const,
      organization_id: result.organization_id,
      already_member: result.already_member === true,
    };
  },
  {
    requireWorkspace: false,
    rateLimit: { name: "invite-redeem", requests: 30, window: "1 m" },
  }
);
