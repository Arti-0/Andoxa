import { PlanId } from '@/lib/config/stripe-config';
import { createClient } from '@/lib/supabase/client';

/**
 * Get organization plan with fallback logic
 * Priority: organizations.plan > user_subscriptions.plan_id via owner_id
 * 
 * @param organizationId - The organization ID
 * @returns The plan ID or 'essential' as final fallback
 */
export async function getOrganizationPlan(organizationId: string): Promise<PlanId> {
  const supabase = createClient();
  
  try {
    // 1. Get organization with plan and owner_id
    const { data: organization } = await supabase
      .from('organizations')
      .select('plan, subscription_status, owner_id')
      .eq('id', organizationId)
      .maybeSingle();

    // 2. If organization has a plan and is not canceled, use it
    if (organization?.plan && organization.subscription_status !== 'canceled') {
      return organization.plan as PlanId;
    }

    // 3. Fallback: get plan from user_subscriptions via owner_id
    if (organization?.owner_id) {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status')
        .eq('user_id', organization.owner_id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription?.plan_id) {
        return subscription.plan_id as PlanId;
      }
    }

    // 4. Final fallback
    return 'essential';
  } catch (error) {
    console.error('Error getting organization plan:', error);
    return 'essential';
  }
}

