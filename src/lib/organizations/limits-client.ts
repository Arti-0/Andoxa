import { PlanId } from '@/lib/config/stripe-config';
import { createClient } from '@/lib/supabase/client';
import { getPlanLimits as getPlanLimitsFromConfig, type PlanLimits as PlanLimitsFromConfig } from '@/lib/config/plans-config';

// Re-export PlanLimits interface for backward compatibility
export interface PlanLimits {
  users: number;
  prospects: number;
  emails: number;
  enrichmentCredits: number;
}

/**
 * @deprecated Use getPlanLimitsFromConfig from @/lib/config/plans-config instead
 * This function maps the new PlanLimits structure to the old interface
 */
function mapPlanLimits(configLimits: PlanLimitsFromConfig): PlanLimits {
  return {
    users: configLimits.users === -1 ? Infinity : configLimits.users,
    prospects: configLimits.prospects === -1 ? Infinity : configLimits.prospects,
    emails: Infinity, // Email limits not in new config, default to Infinity
    enrichmentCredits: configLimits.enrichment_credits === -1 ? Infinity : configLimits.enrichment_credits,
  };
}

/**
 * @deprecated Use PLAN_LIMITS from @/lib/config/plans-config instead
 * Kept for backward compatibility only
 */
export const PLAN_LIMITS: Record<PlanId | "demo", PlanLimits> = {
  trial: mapPlanLimits(getPlanLimitsFromConfig("trial")),
  essential: mapPlanLimits(getPlanLimitsFromConfig("essential")),
  pro: mapPlanLimits(getPlanLimitsFromConfig("pro")),
  business: mapPlanLimits(getPlanLimitsFromConfig("business")),
  demo: mapPlanLimits(getPlanLimitsFromConfig("demo")),
};

/**
 * Vérifier si l'organisation peut ajouter un membre (version client)
 */
export async function canAddMember(organizationId: string): Promise<boolean> {
  const supabase = createClient();

  // Récupérer l'organisation et compter les membres
  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', organizationId)
    .single();

  if (!org) return false;

  const limits = getPlanLimits(org.plan as PlanId);
  if (limits.users === Infinity) return true;

  const { count } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  return (count || 0) < limits.users;
}

/**
 * Récupérer les limites du plan
 * Uses the centralized plans-config for accurate limits
 */
export function getPlanLimits(plan: PlanId | "demo" | string | null | undefined): PlanLimits {
  if (!plan) return mapPlanLimits(getPlanLimitsFromConfig("trial"));

  try {
    const configLimits = getPlanLimitsFromConfig(plan as PlanId | "demo");
    return mapPlanLimits(configLimits);
  } catch {
    // Fallback to trial if plan is invalid
    return mapPlanLimits(getPlanLimitsFromConfig("trial"));
  }
}

/**
 * Vérifier si l'organisation peut ajouter des prospects (version client)
 */
export async function canAddProspects(organizationId: string, count: number = 1): Promise<boolean> {
  const supabase = createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', organizationId)
    .single();

  if (!org) return false;

  const limits = getPlanLimits(org.plan as PlanId);
  if (limits.prospects === Infinity) return true;

  const { count: currentCount } = await supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  return (currentCount || 0) + count <= limits.prospects;
}

/**
 * Vérifier si l'organisation peut envoyer des emails (version client)
 */
export async function canSendEmails(organizationId: string, count: number = 1): Promise<boolean> {
  const supabase = createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', organizationId)
    .single();

  if (!org) return false;

  const limits = getPlanLimits(org.plan as PlanId);
  if (limits.emails === Infinity) return true;

  // Compter les emails envoyés dans la période actuelle
  // Note: Cette logique devra être adaptée selon votre système de tracking
  // Pour l'instant, on retourne true si la limite est Infinity
  return true;
}

