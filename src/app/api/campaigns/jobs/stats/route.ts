import { createApiHandler, Errors } from "@/lib/api";
import { isMockStatsEnabled, mockCampaignJobStats } from "@/lib/mock-stats";

/**
 * GET /api/campaigns/jobs/stats
 *
 * Returns per-job aggregate counters for the current workspace. Backed by the
 * `campaign_job_stats` SQL view (see migrations/047_campaign_job_stats.sql).
 * Used by /campaigns2's job list to show accepted/replied/meetings inline.
 *
 * Shape: { items: [{ job_id, accepted, replied, meetings }] }
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { data, error } = await ctx.supabase
    .from("campaign_job_stats")
    .select("job_id, accepted, replied, meetings")
    .eq("organization_id", ctx.workspaceId);

  if (error) {
    // The view ships in migration 047 — if it hasn't been applied yet, return
    // an empty list rather than 500'ing the whole list endpoint.
    return { items: [] as { job_id: string; accepted: number; replied: number; meetings: number }[] };
  }

  const rows = data ?? [];
  if (isMockStatsEnabled()) {
    return {
      items: rows.map((row, i) => ({
        job_id: row.job_id,
        ...mockCampaignJobStats(row.accepted ?? 0, i),
      })),
    };
  }

  return { items: rows };
});
