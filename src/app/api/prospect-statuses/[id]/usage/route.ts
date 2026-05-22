import { NextRequest } from "next/server";
import { createApiHandler, Errors } from "@/lib/api";
import { getStatusUsage } from "@/lib/prospects/status-usage";

function idFrom(req: NextRequest): string | null {
  const parts = req.nextUrl.pathname.split("/");
  const usageIdx = parts.indexOf("usage");
  if (usageIdx > 0) return parts[usageIdx - 1] ?? null;
  return null;
}

/**
 * GET /api/prospect-statuses/[id]/usage
 *
 * Returns prospect count + workflows referencing this status (trigger or CRM
 * steps) so the settings UI can block blind deletes and prompt for transfer.
 */
export const GET = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const id = idFrom(req);
  if (!id) throw Errors.notFound("Statut");

  const usage = await getStatusUsage(ctx.supabase, ctx.workspaceId, id);
  if (!usage) throw Errors.notFound("Statut");

  return usage;
});
