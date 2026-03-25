/**
 * Helpers de quota « crédits enrichissement » (comptage jobs / limites plan).
 * La logique est conservée pour une réactivation future ; le produit ne l’applique plus
 * pour l’instant (pas de blocage import / pas d’affichage dashboard).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanId } from "@/lib/config/plans-config";
import { checkPlanLimit, getPlanLimits } from "@/lib/config/plans-config";
import type { Database } from "@/lib/types/supabase";

export function planAllowsAutoEnrichOnImport(planId: PlanId | string): boolean {
  return planId === "pro" || planId === "business";
}

function startOfUtcMonth(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** Completed enrichment jobs this calendar month (UTC) for credit-style limits. */
export async function countCompletedEnrichmentsThisMonth(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<number> {
  const from = startOfUtcMonth();
  const { count, error } = await supabase
    .from("enrichment_jobs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .gte("updated_at", from);

  if (error) return 0;
  return count ?? 0;
}

export function canEnqueueMoreEnrichments(
  planId: PlanId,
  usedThisMonth: number
): { canUse: boolean; limit: number } {
  const check = checkPlanLimit(planId, "enrichment_credits", usedThisMonth);
  return { canUse: check.canUse, limit: check.limit };
}

export function getEnrichmentCreditLimit(planId: PlanId): number {
  return getPlanLimits(planId).enrichment_credits;
}

export function readAutoEnrichOptIn(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const m = metadata as Record<string, unknown>;
  return m.auto_enrich_on_import === true;
}

/** Pending + processing jobs count toward monthly enrichment quota. */
export async function countActiveEnrichmentJobs(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("enrichment_jobs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("status", ["pending", "processing"]);

  if (error) return 0;
  return count ?? 0;
}
