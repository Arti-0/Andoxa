import { NextRequest } from "next/server";

import { createApiHandler, Errors } from "@/lib/api";
import { requireRole } from "@/lib/auth/require-role";

export const runtime = "nodejs";

function idFromUrl(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segments.indexOf("organizations");
  return segments[i + 1] ?? "";
}

/**
 * POST /api/organizations/[id]/cancel-downgrade
 *
 * Clears a pending scheduled downgrade. Owner-only. The CHECK constraint
 * on the table requires both columns to be null together, so we always
 * clear them as a pair.
 *
 * No-op if no schedule is set — we still return 200 so the UI can call
 * this defensively without an extra read.
 */
export const POST = createApiHandler(
  async (req: NextRequest, ctx) => {
    const orgId = idFromUrl(req);
    if (!orgId) throw Errors.badRequest("Organization id manquant");
    if (orgId !== ctx.workspaceId) {
      throw Errors.forbidden(
        "Vous ne pouvez modifier que votre organisation active"
      );
    }

    await requireRole(ctx, "owner");

    const { error } = await ctx.supabase
      .from("organizations")
      .update({
        scheduled_downgrade_to: null,
        scheduled_downgrade_effective_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (error) throw Errors.internal(error.message);

    return { ok: true as const };
  },
  {
    requireWorkspace: true,
    rateLimit: { name: "cancel-downgrade", requests: 20, window: "1 m" },
  }
);
