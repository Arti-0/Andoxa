import { createApiHandler, Errors } from "@/lib/api";
import { invalidate } from "@/lib/cache/redis";
import { NextRequest } from "next/server";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { enrichProspectFromUnipile } from "@/lib/enrichment/unipile-enrich";
import { logEnrich } from "@/lib/prospect-activity";

/**
 * POST /api/prospects/[id]/enrich
 * Enrich prospect from Unipile LinkedIn profile (GET /users/{identifier}?linkedin_sections=*)
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const id = segments[segments.length - 2];

  if (!id || id === "enrich") {
    throw Errors.notFound("Prospect");
  }
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const accountId = await getAccountIdForUser(ctx);

  const result = await enrichProspectFromUnipile({
    supabase: ctx.supabase,
    organizationId: ctx.workspaceId,
    prospectId: id,
    accountId,
  });

  if (!result.ok) {
    throw Errors.badRequest(result.error);
  }

  await logEnrich(ctx.supabase, {
    organization_id: ctx.workspaceId,
    prospect_id: id,
    actor_id: ctx.userId,
    source: "unipile",
  });

  const { data: updated, error: updateError } = await ctx.supabase
    .from("prospects")
    .select()
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (updateError || !updated) {
    throw Errors.internal("Impossible de charger le prospect mis à jour");
  }

  await invalidate.prospects(ctx.workspaceId);

  return updated;
});
