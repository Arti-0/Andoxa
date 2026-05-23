import { createApiHandler, Errors } from "@/lib/api";
import { loadCampaignJobStats } from "@/lib/campaigns/job-stats";
import { isMockStatsEnabled, mockCampaignJobStats } from "@/lib/mock-stats";

/**
 * GET /api/campaigns/jobs/stats
 *
 * Per-job accepted / replied / meetings counters for the campaigns table
 * performance column. Aggregated from prospect_activity with job attribution
 * (explicit campaign_job_id, or prospect membership on the job).
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  let rows: Awaited<ReturnType<typeof loadCampaignJobStats>>;
  try {
    rows = await loadCampaignJobStats(ctx.supabase, ctx.workspaceId);
  } catch (err) {
    console.error("[campaigns/jobs/stats] aggregation failed:", err);
    throw Errors.internal("Failed to load campaign stats");
  }

  if (isMockStatsEnabled()) {
    return {
      items: rows.map((row, i) => ({
        job_id: row.job_id,
        ...mockCampaignJobStats(row.accepted, i),
      })),
    };
  }

  return { items: rows };
});
