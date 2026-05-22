import { createApiHandler, Errors, type ApiContext } from "../../../../lib/api";
import { getProspectStatuses } from "@/lib/prospects/statuses";
import { isMockStatsEnabled, mockProspectsFunnel } from "@/lib/mock-stats";

/**
 * GET /api/prospects/funnel
 *
 * Drives the Pipeline tab's KPI cards (CRM-7). For each pipeline stage,
 * returns:
 *   • count    — number of active prospects currently in the stage
 *   • delta_7d — change vs. the prior ISO 7-day window. Computed by
 *     comparing prospects whose `updated_at` landed them in the stage
 *     this week vs. last week. Heuristic: in absence of a status_event
 *     table we use `updated_at` as the most-recent stage transition.
 *   • avg_cycle_days — average days that prospects who left this stage
 *     spent in it. Approximated using `created_at → updated_at` for
 *     prospects whose status is past the stage in the canonical order.
 *
 * Both heuristics are documented in CRM_BACKEND_TODO.md. They will be
 * replaced by exact computations once a `prospect_status_events` table
 * lands.
 */

interface StageRow {
  /** Status key (matches prospect_statuses.key, e.g. "new", "qualified"). */
  status: string;
  /** Display name from the per-org row — clients can use directly without a lookup. */
  name: string;
  /** Hex colour from the per-org row. */
  color: string;
  count: number;
  delta_7d: number;
  avg_cycle_days: number | null;
}

export const GET = createApiHandler(async (_req, ctx) => {
  const workspaceId = ctx.workspaceId;
  if (!workspaceId) throw Errors.badRequest("Workspace required");
  if (isMockStatsEnabled()) return mockProspectsFunnel();

  // Per-org pipeline — same source the settings tab / kanban / pills use.
  const orgStatuses = await getProspectStatuses(ctx.supabase, workspaceId);
  const stageOrder = orgStatuses.map((s) => s.key);
  const knownKeys = new Set(stageOrder);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Counts per stage (current snapshot, excluding soft-deleted).
  const { data: rows, error } = await ctx.supabase
    .from("prospects")
    .select("status, created_at, updated_at")
    .eq("organization_id", workspaceId)
    .is("deleted_at", null);

  if (error) {
    console.error("[API] prospects/funnel error:", error);
    throw Errors.internal("Failed to compute funnel");
  }

  const counts = new Map<string, number>();
  for (const s of stageOrder) counts.set(s, 0);

  // For delta computation: prospects whose updated_at falls inside the
  // window (this week vs. last week).
  const thisWeek = new Map<string, number>();
  const lastWeek = new Map<string, number>();
  for (const s of stageOrder) {
    thisWeek.set(s, 0);
    lastWeek.set(s, 0);
  }

  // For cycle days: track per-status (created_at → updated_at) deltas
  // for prospects that have moved past the status. We treat
  // `updated_at` as the most recent transition timestamp.
  const cycleSums = new Map<string, number>();
  const cycleCounts = new Map<string, number>();
  for (const s of stageOrder) {
    cycleSums.set(s, 0);
    cycleCounts.set(s, 0);
  }

  for (const row of rows ?? []) {
    const status = knownKeys.has(row.status ?? "") ? (row.status as string) : null;
    if (!status) continue;
    counts.set(status, (counts.get(status) ?? 0) + 1);

    if (row.updated_at) {
      const u = row.updated_at;
      if (u >= sevenDaysAgo) {
        thisWeek.set(status, (thisWeek.get(status) ?? 0) + 1);
      } else if (u >= fourteenDaysAgo) {
        lastWeek.set(status, (lastWeek.get(status) ?? 0) + 1);
      }
    }

    if (row.created_at && row.updated_at) {
      const days =
        (new Date(row.updated_at).getTime() -
          new Date(row.created_at).getTime()) /
        86400000;
      if (days >= 0) {
        // Attribute the cycle-time to the *previous* stage, so e.g.
        // a prospect now in `rdv` informs the average cycle of `qualified`.
        const idx = stageOrder.indexOf(status);
        const prev = idx > 0 ? stageOrder[idx - 1] : null;
        if (prev) {
          cycleSums.set(prev, (cycleSums.get(prev) ?? 0) + days);
          cycleCounts.set(prev, (cycleCounts.get(prev) ?? 0) + 1);
        }
      }
    }
  }

  const stages: StageRow[] = orgStatuses.map((row) => {
    const s = row.key;
    const count = counts.get(s) ?? 0;
    const delta = (thisWeek.get(s) ?? 0) - (lastWeek.get(s) ?? 0);
    const cs = cycleCounts.get(s) ?? 0;
    const avg =
      cs > 0
        ? Math.round(((cycleSums.get(s) ?? 0) / cs) * 10) / 10
        : null;
    return {
      status: s,
      name: row.name,
      color: row.color,
      count,
      delta_7d: delta,
      avg_cycle_days: avg,
    };
  });

  return {
    stages,
    period: { from: sevenDaysAgo, to: new Date().toISOString() },
  };
});
