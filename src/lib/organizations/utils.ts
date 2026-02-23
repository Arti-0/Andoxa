import { createClient } from '@/lib/supabase/server';

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  plan: string;
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
 * Récupérer l'organisation active de l'utilisateur
 */
export async function getActiveOrganization(userId: string): Promise<Organization | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", userId)
    .single();

  if (!profile?.active_organization_id) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.active_organization_id)
    .single();

  return org as Organization | null;
}

/**
 * Vérifier si l'utilisateur est membre d'une organisation
 */
export async function isOrganizationMember(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .single();

  return !!data;
}

/**
 * Récupérer le rôle de l'utilisateur dans une organisation
 */
export async function getOrganizationRole(
  userId: string,
  organizationId: string
): Promise<"owner" | "admin" | "member" | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .single();

  return data?.role as "owner" | "admin" | "member" | null;
}

/**
 * Récupérer toutes les organisations d'un utilisateur
 */
export async function getUserOrganizations(
  userId: string
): Promise<Organization[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(*)")
    .eq("user_id", userId);

  if (!data) return [];

  return data
    .map((item: any) => item.organizations)
    .filter((org: any): org is Organization => org != null);
}

/**
 * Changer l'organisation active de l'utilisateur
 */
export async function setActiveOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Vérifier que l'utilisateur est membre
  const isMember = await isOrganizationMember(userId, organizationId);
  if (!isMember) return false;

  const { error } = await supabase
    .from("profiles")
    .update({ active_organization_id: organizationId })
    .eq("id", userId);

  return !error;
}

/**
 * Récupérer les membres d'une organisation
 */
export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .order("joined_at", { ascending: true });

  return (data || []) as OrganizationMember[];
}

/**
 * Vérifier si l'utilisateur est owner ou admin d'une organisation
 */
export async function isOrganizationOwnerOrAdmin(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const role = await getOrganizationRole(userId, organizationId);
  return role === 'owner' || role === 'admin';
}

/**
 * Vérifier si l'utilisateur est owner d'une organisation
 */
export async function isOrganizationOwner(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const role = await getOrganizationRole(userId, organizationId);
  return role === 'owner';
}

