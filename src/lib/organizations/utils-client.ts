import { createClient } from '@/lib/supabase/client';

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  logo_url?: string | null;
  owner_id: string;
  plan: string;
  status?: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  max_users: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Récupérer l'organisation active de l'utilisateur (version client)
 */
export async function getActiveOrganization(userId: string): Promise<Organization | null> {
  const supabase = createClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_organization_id')
    .eq('id', userId)
    .single();
  
  if (!profile?.active_organization_id) return null;
  
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.active_organization_id)
    .single();
  
  return org as Organization | null;
}

/**
 * Vérifier si l'utilisateur est membre d'une organisation (version client)
 */
export async function isOrganizationMember(
  userId: string, 
  organizationId: string
): Promise<boolean> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single();
  
  return !!data;
}

/**
 * Récupérer le rôle de l'utilisateur dans une organisation (version client)
 */
export async function getOrganizationRole(
  userId: string, 
  organizationId: string
): Promise<'owner' | 'admin' | 'member' | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single();
  
  return data?.role as 'owner' | 'admin' | 'member' | null;
}

/**
 * Récupérer toutes les organisations d'un utilisateur (version client)
 */
export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(*)')
    .eq('user_id', userId);
  
  if (!data) return [];
  
  return data
    .map((item: any) => item.organizations)
    .filter((org: any): org is Organization => org != null);
}

/**
 * Changer l'organisation active de l'utilisateur (version client)
 */
export async function setActiveOrganization(
  userId: string, 
  organizationId: string
): Promise<boolean> {
  const supabase = createClient();
  
  // Vérifier que l'utilisateur est membre
  const isMember = await isOrganizationMember(userId, organizationId);
  if (!isMember) return false;
  
  const { error } = await supabase
    .from('profiles')
    .update({ active_organization_id: organizationId })
    .eq('id', userId);
  if (error) return false;

  const role = await getOrganizationRole(userId, organizationId);
  if (!role) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentMeta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const { error: metaErr } = await supabase.auth.updateUser({
    data: {
      ...currentMeta,
      active_organization_id: organizationId,
      active_organization_role: role,
    },
  });

  return !metaErr;
}

/**
 * Récupérer les membres d'une organisation (version client)
 */
export async function getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('joined_at', { ascending: true });
  
  return (data || []) as OrganizationMember[];
}

/**
 * Vérifier si l'utilisateur est owner ou admin d'une organisation (version client)
 */
export async function isOrganizationOwnerOrAdmin(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const role = await getOrganizationRole(userId, organizationId);
  return role === 'owner' || role === 'admin';
}

/**
 * Vérifier si l'utilisateur est owner d'une organisation (version client)
 */
export async function isOrganizationOwner(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const role = await getOrganizationRole(userId, organizationId);
  return role === 'owner';
}

