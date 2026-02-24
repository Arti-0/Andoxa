import { createApiHandler, Errors } from "../../../../lib/api";

/**
 * GET /api/dashboard/stats
 * Returns aggregated stats for the dashboard Quick Stats and KPI Grid
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { workspaceId, supabase } = ctx;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startIso = startOfMonth.toISOString();
  const endIso = endOfMonth.toISOString();

  // Run parallel queries for KPI metrics
  const [
    prospectsResult,
    signeResult,
    chiffreAffairesResult,
    nouveauxProspectsResult,
    prospectsQualifiesResult,
    dealsEnCoursResult,
    eventsResult,
  ] = await Promise.all([
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .eq("status", "signe"),
    supabase
      .from("prospects")
      .select("estimated_value")
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .eq("status", "signe")
      .not("estimated_value", "is", null),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .in("status", ["rdv", "proposition"]),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .in("status", ["nouveau", "rdv", "proposition"]),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .gte("start_time", startIso)
      .lte("start_time", endIso),
  ]);

  if (prospectsResult.error) {
    throw Errors.internal("Failed to fetch prospects count");
  }

  const prospects = prospectsResult.count ?? 0;

  // Chiffre d'affaires: sum of estimated_value for signed deals
  let chiffreAffaires = 0;
  if (!chiffreAffairesResult.error && chiffreAffairesResult.data) {
    chiffreAffaires = (chiffreAffairesResult.data as { estimated_value: number }[]).reduce(
      (sum, p) => sum + (p.estimated_value ?? 0),
      0
    );
  }

  // Conversion rate: count(status='signe') / total * 100
  let conversionRate = 0;
  if (prospects > 0 && !signeResult.error && signeResult.count != null) {
    conversionRate = Math.round((signeResult.count / prospects) * 1000) / 10;
  }

  const events = eventsResult.error ? 0 : eventsResult.count ?? 0;

  return {
    prospects,
    campaigns: 0,
    events,
    conversionRate,
    kpis: {
      chiffreAffaires,
      nouveauxProspects: nouveauxProspectsResult.error ? 0 : nouveauxProspectsResult.count ?? 0,
      tauxOuvertureEmails: null as number | null,
      rendezVousPlanifies: events,
      prospectsQualifies: prospectsQualifiesResult.error
        ? 0
        : prospectsQualifiesResult.count ?? 0,
      dealsEnCours: dealsEnCoursResult.error ? 0 : dealsEnCoursResult.count ?? 0,
    },
  };
});
