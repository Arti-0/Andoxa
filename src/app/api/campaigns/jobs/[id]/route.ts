import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";

function extractJobId(req: NextRequest) {
  const parts = new URL(req.url).pathname.split("/");
  return parts[parts.length - 1] || parts[parts.length - 2];
}

/**
 * GET /api/campaigns/jobs/[id]
 * Get a campaign job detail with prospect statuses
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const id = extractJobId(req);

  const { data: job, error } = await ctx.supabase
    .from("campaign_jobs")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (error || !job) throw Errors.notFound("Campaign job");

  const { data: jobProspects } = await ctx.supabase
    .from("campaign_job_prospects")
    .select("id, prospect_id, status, error, processed_at")
    .eq("job_id", id)
    .order("processed_at", { ascending: true, nullsFirst: false });

  const prospectIds = (jobProspects ?? []).map((p) => p.prospect_id);
  let prospectNames: Record<string, string> = {};
  if (prospectIds.length > 0) {
    const { data: prospectRows } = await ctx.supabase
      .from("prospects")
      .select("id, full_name, company")
      .in("id", prospectIds);
    if (prospectRows) {
      prospectNames = Object.fromEntries(
        prospectRows.map((r) => [r.id, r.full_name ?? r.company ?? r.id.slice(0, 8)])
      );
    }
  }

  const enriched = (jobProspects ?? []).map((p) => ({
    ...p,
    prospect_name: prospectNames[p.prospect_id] ?? p.prospect_id.slice(0, 8),
  }));

  return { ...job, prospects: enriched };
});

/**
 * PATCH /api/campaigns/jobs/[id]
 * Update job status (pause/resume/cancel)
 */
export const PATCH = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const id = extractJobId(req);

  const body = await parseBody<{ status: string }>(req);
  if (!body.status || !["paused", "running", "failed"].includes(body.status)) {
    throw Errors.validation({ status: "Must be 'paused', 'running', or 'failed'" });
  }

  const updates: Record<string, unknown> = { status: body.status };
  if (body.status === "running") updates.started_at = new Date().toISOString();

  const { data, error } = await ctx.supabase
    .from("campaign_jobs")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error || !data) throw Errors.notFound("Campaign job");

  return data;
});
