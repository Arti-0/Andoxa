import { createApiHandler, Errors } from "@/lib/api";
import { NextRequest } from "next/server";

function extractJobId(req: NextRequest) {
  const parts = new URL(req.url).pathname.split("/");
  // /api/campaigns/jobs/[id]/duplicate → id is two-from-last
  return parts[parts.length - 2];
}

/**
 * POST /api/campaigns/jobs/[id]/duplicate
 *
 * Clones a campaign_jobs row + its campaign_job_prospects rows into a new
 * `draft` job owned by the caller. Counters reset. Used by /campaigns2's
 * "Dupliquer" action (and eventually the bulk bar).
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId || !ctx.userId) throw Errors.badRequest("Workspace required");
  const id = extractJobId(req);

  const { data: source, error: srcErr } = await ctx.supabase
    .from("campaign_jobs")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .single();
  if (srcErr || !source) throw Errors.notFound("Campaign job");

  // Compose new metadata: keep original keys but rename.
  const sourceMeta = (source.metadata as Record<string, unknown> | null) ?? {};
  const baseName = (sourceMeta.name as string | undefined)?.trim();
  const newMeta = { ...sourceMeta, name: baseName ? `${baseName} (copie)` : "Copie sans titre" };

  const { data: prospects, error: pErr } = await ctx.supabase
    .from("campaign_job_prospects")
    .select("prospect_id")
    .eq("job_id", id);
  if (pErr) throw Errors.internal("Failed to load source prospects");

  const prospectIds = (prospects ?? []).map((p) => p.prospect_id).filter(Boolean) as string[];

  const { data: newJob, error: insErr } = await ctx.supabase
    .from("campaign_jobs")
    .insert({
      organization_id: ctx.workspaceId,
      created_by: ctx.userId,
      type: source.type,
      status: "draft",
      total_count: prospectIds.length,
      batch_size: source.batch_size,
      delay_ms: source.delay_ms,
      message_template: source.message_template,
      metadata: newMeta,
    })
    .select()
    .single();
  if (insErr || !newJob) throw Errors.internal("Failed to duplicate campaign job");

  if (prospectIds.length > 0) {
    const rows = prospectIds.map((pid) => ({ job_id: newJob.id, prospect_id: pid }));
    const { error: rowsErr } = await ctx.supabase
      .from("campaign_job_prospects")
      .insert(rows);
    if (rowsErr) {
      // Best-effort: drop the empty clone if prospect-linking fails so we don't
      // leave a half-built job lying around.
      await ctx.supabase.from("campaign_jobs").delete().eq("id", newJob.id);
      throw Errors.internal("Failed to copy prospects");
    }
  }

  return newJob;
});
