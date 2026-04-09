import { createApiHandler, Errors, getSearchParams } from "@/lib/api";

/**
 * GET /api/campaigns/invited-prospect-ids?prospect_ids=id1,id2,...
 * Retourne les prospect_ids déjà invités avec succès (invite / invite_with_note)
 * par l'utilisateur courant dans le workspace courant.
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const params = getSearchParams(req);
  const rawIds = params.prospect_ids ?? "";
  const prospectIds = rawIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 500);

  if (prospectIds.length === 0) return { ids: [] as string[] };

  const { data: rows, error: rowsErr } = await ctx.supabase
    .from("campaign_job_prospects")
    .select("prospect_id, job_id")
    .in("prospect_id", prospectIds)
    .eq("status", "success");

  if (rowsErr || !rows?.length) {
    if (rowsErr) console.error("[invited-prospect-ids]", rowsErr);
    return { ids: [] as string[] };
  }

  const jobIds = [...new Set(rows.map((r) => r.job_id))];

  const { data: jobs, error: jobsErr } = await ctx.supabase
    .from("campaign_jobs")
    .select("id, type, created_by, organization_id")
    .in("id", jobIds)
    .eq("created_by", ctx.userId)
    .eq("organization_id", ctx.workspaceId)
    .in("type", ["invite", "invite_with_note"]);

  if (jobsErr || !jobs?.length) {
    if (jobsErr) console.error("[invited-prospect-ids] jobs", jobsErr);
    return { ids: [] as string[] };
  }

  const eligibleJobIds = new Set(jobs.map((j) => j.id));
  const invited = new Set(
    rows.filter((r) => eligibleJobIds.has(r.job_id)).map((r) => r.prospect_id)
  );

  return { ids: [...invited] };
});
