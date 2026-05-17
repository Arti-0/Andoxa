import { type PlanId, toPlanId } from '@/lib/config/plans-config';
import { createClient } from '@/lib/supabase/client';

/**
 * Get the effective plan for an organization, falling back to the owner's
 * personal `user_subscriptions` row if the org column is missing/canceled.
 *
 * Returns a coerced PlanId (defaults to `trial` when nothing matches).
 */
export async function getOrganizationPlan(organizationId: string): Promise<PlanId> {
  const supabase = createClient();

  try {
    const { data: organization } = await supabase
      .from('organizations')
      .select('plan, subscription_status, owner_id')
      .eq('id', organizationId)
      .maybeSingle();

    if (organization?.plan && organization.subscription_status !== 'canceled') {
      return toPlanId(organization.plan);
    }

    if (organization?.owner_id) {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status')
        .eq('user_id', organization.owner_id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription?.plan_id) {
        return toPlanId(subscription.plan_id);
      }
    }

    return 'trial';
  } catch (error) {
    console.error('Error getting organization plan:', error);
    return 'trial';
  }
}
