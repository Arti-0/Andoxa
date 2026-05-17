import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";
import type { Database, Json } from "@/lib/types/supabase";

type CampaignJobUpdate = Database["public"]["Tables"]["campaign_jobs"]["Update"];

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
 * Update job status (pause/resume/cancel) or metadata.name
 */
export const PATCH = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const id = extractJobId(req);

  const body = await parseBody<{ status?: string; name?: string }>(req);
  const updates: CampaignJobUpdate = {};

  if (body.status !== undefined) {
    if (!["paused", "running", "failed"].includes(body.status)) {
      throw Errors.validation({ status: "Must be 'paused', 'running', or 'failed'" });
    }
    updates.status = body.status;
    if (body.status === "running") updates.started_at = new Date().toISOString();
  }

  if (body.name !== undefined) {
    const { data: existing } = await ctx.supabase
      .from("campaign_jobs")
      .select("metadata")
      .eq("id", id)
      .eq("organization_id", ctx.workspaceId)
      .single();
    const existingMeta = (existing?.metadata as Record<string, unknown> | null) ?? {};
    const trimmed = body.name.trim();
    if (trimmed) {
      updates.metadata = { ...existingMeta, name: trimmed } as Json;
    } else {
      const { name: _n, ...rest } = existingMeta;
      updates.metadata =
        Object.keys(rest).length > 0 ? (rest as Json) : null;
    }
  }

  if (Object.keys(updates).length === 0) {
    throw Errors.validation({ body: "Nothing to update" });
  }

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

/**
 * DELETE /api/campaigns/jobs/[id]
 * Soft-delete a campaign job. Used by /campaigns2's row action and the bulk
 * delete bar. Owner-only (the existing RLS policies already restrict to org
 * members + `created_by`).
 *
 * Implementation: set status='failed' AND clear the metadata-name so it
 * doesn't pollute lists. A real `deleted_at` column will land alongside the
 * bulk endpoint — see BACKEND.md §1.3 / §1.6.
 */
export const DELETE = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const id = extractJobId(req);

  const { data: existing, error: fetchErr } = await ctx.supabase
    .from("campaign_jobs")
    .select("created_by")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .single();
  if (fetchErr || !existing) throw Errors.notFound("Campaign job");
  if (existing.created_by && existing.created_by !== ctx.userId) {
    throw Errors.forbidden("Owner-only");
  }

  const { error } = await ctx.supabase
    .from("campaign_jobs")
    .update({ status: "failed" })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId);
  if (error) throw Errors.internal("Failed to delete campaign job");

  return { id, deleted: true };
});
