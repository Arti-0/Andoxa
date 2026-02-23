import { createApiHandler, Errors } from "../../../../lib/api";

/**
 * GET /api/dashboard/stats
 * Returns aggregated stats for the dashboard Quick Stats
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { workspaceId, supabase } = ctx;

  // Prospects count (exclude soft-deleted)
  const { count: prospectsCount, error: prospectsError } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", workspaceId)
    .is("deleted_at", null);

  if (prospectsError) {
    throw Errors.internal("Failed to fetch prospects count");
  }

  const prospects = prospectsCount ?? 0;

  // Campaigns: fixed 0 (abandoned for now)
  const campaigns = 0;

  // Events count for current month (graceful fallback if table missing)
  let events = 0;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startIso = startOfMonth.toISOString();
    const endIso = endOfMonth.toISOString();

    const { count: eventsCount, error: eventsError } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .gte("start_time", startIso)
      .lte("start_time", endIso);

    if (!eventsError) {
      events = eventsCount ?? 0;
    }
  } catch {
    events = 0;
  }

  // Conversion rate: count(status='signe') / total * 100
  let conversionRate = 0;
  if (prospects > 0) {
    const { count: signeCount, error: signeError } = await supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .eq("status", "signe");

    if (!signeError && signeCount != null) {
      conversionRate = Math.round((signeCount / prospects) * 1000) / 10;
    }
  }

  return {
    prospects,
    campaigns,
    events,
    conversionRate,
  };
});
