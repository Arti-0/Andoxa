import { createApiHandler, Errors } from "@/lib/api";
import { cache, CACHE_TTL } from "@/lib/cache/redis";
import { parsePeriod } from "@/lib/dashboard/period";

import {
  getDashboardStats,
} from "../stats/route";
import {
  getDashboardPriorities,
  type PrioritiesPayload,
} from "../priorities/route";
import {
  getDashboardFunnel,
  type FunnelResponse,
} from "../funnel/route";
import {
  getTopDeals,
  type TopDealRow,
} from "../top-deals/route";
import {
  getAtRisk,
  type AtRiskRow,
} from "../at-risk/route";
import {
  getActiveCampaigns,
  type ActiveCampaign,
} from "../active-campaigns/route";
import {
  getDashboardActivity,
  type Activity,
  type DashboardActivityScope,
} from "../activity/route";
import {
  getLinkedInUsage,
  type LinkedInUsagePayload,
} from "../linkedin-usage/route";

/**
 * GET /api/dashboard/overview?period=...&scope=...
 *
 * Aggregator that returns the full dashboard payload in one request. Auths
 * once, then fans out to the 8 dashboard data fetchers with Promise.all.
 *
 * Why this exists: the cockpit dashboard used to fire 8 individual /api/dashboard/*
 * calls in parallel. Each one paid the createApiHandler boilerplate cost
 * (~80-150ms of auth + workspace lookup) before the real Supabase queries
 * ran. With the aggregator, that cost is paid once — net ~500ms-1s saved on
 * cold dashboard loads.
 *
 * Each individual /api/dashboard/* route still exists for direct callers
 * (PDF export, incremental refresh, third-party scripts).
 */

export interface DashboardOverviewPayload {
  stats: Awaited<ReturnType<typeof getDashboardStats>>;
  priorities: PrioritiesPayload;
  funnel: FunnelResponse;
  topDeals: TopDealRow[];
  atRisk: AtRiskRow[];
  activeCampaigns: ActiveCampaign[];
  activity: Activity[];
  linkedinUsage: LinkedInUsagePayload;
}

export const GET = createApiHandler(
  async (req, ctx): Promise<DashboardOverviewPayload> => {
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

    const url = new URL(req.url);
    const period = parsePeriod(url.searchParams.get("period"));
    const rawScope = (url.searchParams.get("scope") ?? "all").toLowerCase();
    const scope: DashboardActivityScope =
      rawScope === "mine" || rawScope === "team" || rawScope === "system"
        ? rawScope
        : "all";

    // andoxa-perf-2b: cache the aggregate payload. The fan-out below is ~480ms
    // of parallel Supabase aggregation (measured in prod); serve it from the
    // shared cache for 30s instead. Keyed by workspace + user + period + scope
    // — userId matters because scope="mine"/activity is per-user. Short TTL
    // bounds staleness without explicit invalidation.
    return cache.wrap(
      `dashboard:overview:${ctx.workspaceId}:${ctx.userId}:${period}:${scope}`,
      async (): Promise<DashboardOverviewPayload> => {
        // Fan out — every inner fetch only does its own Supabase queries; the
        // auth + workspace context is shared via `ctx`. Errors propagate so the
        // client sees a normal failure shape instead of silent partial data.
        const [
          stats,
          priorities,
          funnel,
          topDeals,
          atRisk,
          activeCampaigns,
          activity,
          linkedinUsage,
        ] = await Promise.all([
          getDashboardStats(ctx, period),
          getDashboardPriorities(ctx),
          getDashboardFunnel(ctx, period),
          getTopDeals(ctx, { limit: 5 }),
          getAtRisk(ctx, { limit: 5, minSilenceDays: 6 }),
          getActiveCampaigns(ctx),
          getDashboardActivity(ctx, scope),
          getLinkedInUsage(ctx),
        ]);

        return {
          stats,
          priorities,
          funnel,
          topDeals,
          atRisk,
          activeCampaigns,
          activity,
          linkedinUsage,
        };
      },
      { ttl: CACHE_TTL.KPI }
    );
  },
);
