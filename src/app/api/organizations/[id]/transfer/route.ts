import { NextRequest } from "next/server";

import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth/require-role";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function idFromUrl(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segments.indexOf("organizations");
  return segments[i + 1] ?? "";
}

/**
 * POST /api/organizations/[id]/transfer
 * Body: { toUserId: string; confirm: 'TRANSFER' }
 *
 * Atomic owner swap via the `transfer_ownership` RPC. The DB-side function
 * runs the demote + promote in one statement under the partial unique index
 * on (org_id) WHERE role='owner' — the invariant is structurally guaranteed,
 * never "between updates".
 *
 * Requires the typed `TRANSFER` confirmation token in the body so a CSRF-style
 * misfire can't strip ownership silently — matches the design doc's typed
 * confirmation guard on Step 2 of the owner-transfer modal.
 */
export const POST = createApiHandler(
  async (req: NextRequest, ctx) => {
    const orgId = idFromUrl(req);
    if (!orgId) throw Errors.badRequest("Organization id manquant");
    if (orgId !== ctx.workspaceId) {
      throw Errors.forbidden(
        "Vous ne pouvez transférer que la propriété de votre organisation active"
      );
    }

    await requireRole(ctx, "owner");

    const body = await parseBody<{ toUserId?: string; confirm?: string }>(req);
    const toUserId = (body.toUserId ?? "").trim();
    if (!UUID_RE.test(toUserId)) {
      throw Errors.badRequest("Identifiant utilisateur invalide");
    }
    if (body.confirm !== "TRANSFER") {
      throw Errors.badRequest(
        "Tapez TRANSFER pour confirmer le changement de propriétaire"
      );
    }

    // The RPC validates that the target is an active member of this org
    // and is not the caller. We pass the org_id explicitly rather than
    // trusting ctx.workspaceId — the path is the source of truth here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (ctx.supabase as any).rpc("transfer_ownership", {
      p_org_id: orgId,
      p_to_user_id: toUserId,
    });

    if (error) {
      const msg = (error.message ?? "").toString();
      // Surface the RPC's typed exception messages as 400s the UI can map
      // back to user-friendly French copy.
      if (msg.includes("caller_not_owner")) {
        throw Errors.forbidden(
          "Seul le propriétaire actuel peut transférer la propriété"
        );
      }
      if (msg.includes("target_not_member")) {
        throw Errors.badRequest(
          "Cet utilisateur n'est pas membre de l'organisation"
        );
      }
      if (msg.includes("target_not_active")) {
        throw Errors.badRequest(
          "Impossible de transférer à un membre désactivé"
        );
      }
      if (msg.includes("cannot_transfer_to_self")) {
        throw Errors.badRequest("Vous êtes déjà le propriétaire");
      }
      throw Errors.internal(msg || "Échec du transfert");
    }

    return { ok: true as const };
  },
  {
    requireWorkspace: true,
    rateLimit: { name: "owner-transfer", requests: 5, window: "5 m" },
  }
);
