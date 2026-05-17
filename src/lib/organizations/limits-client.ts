import { type PlanId, toPlanId, getPlanLimits as getPlanLimitsFromConfig, type PlanLimits as PlanLimitsFromConfig } from '@/lib/config/plans-config';
import { createClient } from '@/lib/supabase/client';

/** @see lib/organizations/limits.ts — same shape, browser-side. */
export interface PlanLimits {
  users: number;
  prospects: number;
  emails: number;
  enrichmentCredits: number;
}

function mapPlanLimits(configLimits: PlanLimitsFromConfig): PlanLimits {
  return {
    users: configLimits.users === -1 ? Infinity : configLimits.users,
    prospects: configLimits.prospects === -1 ? Infinity : configLimits.prospects,
    emails: Infinity,
    enrichmentCredits:
      configLimits.enrichment_credits === -1
        ? Infinity
        : configLimits.enrichment_credits,
  };
}

/** @deprecated Use `getPlanLimits` from `@/lib/config/plans-config`. */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  trial: mapPlanLimits(getPlanLimitsFromConfig('trial')),
  solo: mapPlanLimits(getPlanLimitsFromConfig('solo')),
  team: mapPlanLimits(getPlanLimitsFromConfig('team')),
  custom: mapPlanLimits(getPlanLimitsFromConfig('custom')),
  demo: mapPlanLimits(getPlanLimitsFromConfig('demo')),
};

/** Read plan limits in the browser, defaulting to trial caps. */
export function getPlanLimits(plan: PlanId | string | null | undefined): PlanLimits {
  return mapPlanLimits(getPlanLimitsFromConfig(toPlanId(plan)));
}

export async function canAddMember(organizationId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', organizationId)
    .single();

  if (!org) return false;

  const limits = getPlanLimits(org.plan as string);
  if (limits.users === Infinity) return true;

  const { count } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  return (count || 0) < limits.users;
}

export async function canAddProspects(
  organizationId: string,
  count: number = 1
): Promise<boolean> {
  const supabase = createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', organizationId)
    .single();

  if (!org) return false;

  const limits = getPlanLimits(org.plan as string);
  if (limits.prospects === Infinity) return true;

  const { count: currentCount } = await supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  return (currentCount || 0) + count <= limits.prospects;
}

export async function canSendEmails(organizationId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', organizationId)
    .single();

  if (!org) return false;

  const limits = getPlanLimits(org.plan as string);
  if (limits.emails === Infinity) return true;
  return true;
}
