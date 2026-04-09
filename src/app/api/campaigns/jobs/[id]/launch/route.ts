import { createApiHandler, Errors } from "@/lib/api";
import type { NextRequest } from "next/server";

function extractJobIdFromLaunchPath(req: NextRequest): string | null {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("launch");
  if (i > 0) return parts[i - 1] ?? null;
  return null;
}

/**
 * POST /api/campaigns/jobs/[id]/launch
 * Passe un job de draft → pending pour le cron / traitement batch.
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const id = extractJobIdFromLaunchPath(req);
  if (!id) throw Errors.badRequest("ID requis");

  const { data: job, error: fetchErr } = await ctx.supabase
    .from("campaign_jobs")
    .select("id, status, organization_id")
    .eq("id", id)
    .single();

  if (fetchErr || !job) throw Errors.notFound("Campaign job");
  if (job.organization_id !== ctx.workspaceId) throw Errors.forbidden();
  if (job.status !== "draft") {
    throw Errors.badRequest(`Impossible de lancer un job en status '${job.status}'`);
  }

  const { error: updateErr } = await ctx.supabase
    .from("campaign_jobs")
    .update({ status: "pending" })
    .eq("id", id);

  if (updateErr) throw Errors.internal(updateErr.message);

  return { ok: true as const };
});
