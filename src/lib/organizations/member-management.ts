import { createClient } from '@/lib/supabase/server';
import { SubscriptionManager } from '@/lib/services/subscription-manager';

/**
 * Gestion des membres d'organisation
 * Inclut la gestion de active_organization_id lors de la suppression
 */

/**
 * Supprimer un membre d'une organisation
 * - Supprime le membership
 * - Met à jour active_organization_id si nécessaire
 * - Met à jour la facturation Stripe (si per-seat)
 */
export async function removeOrganizationMember(
  organizationId: string,
  userIdToRemove: string,
  removedBy: string // User ID qui effectue la suppression
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // 1. Vérifier que removedBy a les droits (owner ou admin)
    const { data: removerMembership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", removedBy)
      .single();

    if (!removerMembership || (removerMembership.role !== "owner" && removerMembership.role !== "admin")) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    // 2. Vérifier qu'on ne supprime pas le dernier membre (owner)
    const { data: allMembers } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", organizationId);

    if (!allMembers || allMembers.length <= 1) {
      return { success: false, error: "Cannot remove the last member from organization" };
    }

    // 3. Vérifier qu'on ne supprime pas le owner (sauf si c'est lui-même qui se retire)
    const { data: memberToRemove } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userIdToRemove)
      .single();

    if (memberToRemove?.role === "owner" && removedBy !== userIdToRemove) {
      return { success: false, error: "Cannot remove organization owner. Transfer ownership first." };
    }

    // 4. Supprimer le membership
    const { error: deleteError } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", userIdToRemove);

    if (deleteError) {
      console.error("Error removing member:", deleteError);
      return { success: false, error: "Failed to remove member" };
    }

    // 5. Si le membre supprimé avait cette organisation comme active_organization_id,
    // la mettre à null
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", userIdToRemove)
      .single();

    if (profile?.active_organization_id === organizationId) {
      await supabase
        .from("profiles")
        .update({ active_organization_id: null })
        .eq("id", userIdToRemove);
    }

    // 6. Mettre à jour la facturation Stripe (si per-seat)
    try {
      await SubscriptionManager.updateSubscriptionQuantity(organizationId);
    } catch (error) {
      console.error("Error updating subscription quantity:", error);
      // Ne pas échouer la suppression si la mise à jour Stripe échoue
    }

    return { success: true };
  } catch (error) {
    console.error("Error in removeOrganizationMember:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Ajouter un membre à une organisation
 * - Crée le membership
 * - Met à jour la facturation Stripe (si per-seat)
 */
export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: "admin" | "member" = "member",
  addedBy: string // User ID qui ajoute le membre
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // 1. Vérifier que addedBy a les droits (owner ou admin)
    const { data: adderMembership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", addedBy)
      .single();

    if (!adderMembership || (adderMembership.role !== "owner" && adderMembership.role !== "admin")) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    // 2. Vérifier que l'utilisateur n'est pas déjà membre
    const { data: existing } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      return { success: false, error: "User is already a member of this organization" };
    }

    // 3. Ajouter le membership
    const { error: insertError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role,
      });

    if (insertError) {
      console.error("Error adding member:", insertError);
      return { success: false, error: "Failed to add member" };
    }

    // 4. Si l'utilisateur n'a pas d'organisation active, définir celle-ci comme active
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", userId)
      .single();

    if (!profile?.active_organization_id) {
      await supabase
        .from("profiles")
        .update({ active_organization_id: organizationId })
        .eq("id", userId);
    }

    // 5. Mettre à jour la facturation Stripe (si per-seat)
    try {
      await SubscriptionManager.updateSubscriptionQuantity(organizationId);
    } catch (error) {
      console.error("Error updating subscription quantity:", error);
      // Ne pas échouer l'ajout si la mise à jour Stripe échoue
    }

    return { success: true };
  } catch (error) {
    console.error("Error in addOrganizationMember:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Transférer la propriété d'une organisation
 * - Change le rôle de l'ancien owner en admin
 * - Change le rôle du nouveau owner en owner
 */
export async function transferOwnership(
  organizationId: string,
  newOwnerId: string,
  currentOwnerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // 1. Vérifier que currentOwnerId est bien le owner actuel
    const { data: currentOwner } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", currentOwnerId)
      .single();

    if (!currentOwner || currentOwner.role !== "owner") {
      return { success: false, error: "Only the current owner can transfer ownership" };
    }

    // 2. Vérifier que newOwnerId est membre de l'organisation
    const { data: newOwner } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", newOwnerId)
      .single();

    if (!newOwner) {
      return { success: false, error: "New owner must be a member of the organization" };
    }

    // 3. Mettre à jour les rôles dans une transaction
    // Ancien owner devient admin
    const { error: updateOldOwner } = await supabase
      .from("organization_members")
      .update({ role: "admin" })
      .eq("organization_id", organizationId)
      .eq("user_id", currentOwnerId);

    if (updateOldOwner) {
      return { success: false, error: "Failed to update old owner role" };
    }

    // Nouveau owner devient owner
    const { error: updateNewOwner } = await supabase
      .from("organization_members")
      .update({ role: "owner" })
      .eq("organization_id", organizationId)
      .eq("user_id", newOwnerId);

    if (updateNewOwner) {
      return { success: false, error: "Failed to update new owner role" };
    }

    // 4. Mettre à jour owner_id dans organizations
    const { error: updateOrg } = await supabase
      .from("organizations")
      .update({ owner_id: newOwnerId })
      .eq("id", organizationId);

    if (updateOrg) {
      console.error("Error updating organization owner_id:", updateOrg);
      // Ne pas échouer si cette mise à jour échoue, les rôles sont déjà mis à jour
    }

    return { success: true };
  } catch (error) {
    console.error("Error in transferOwnership:", error);
    return { success: false, error: "Internal server error" };
  }
}
