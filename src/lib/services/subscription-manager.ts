import { createClient } from "@/lib/supabase/server";
import { BILLING_CONFIG } from "@/lib/config/billing-config";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Gestionnaire de souscriptions Stripe
 * Gère la mise à jour de la quantité (per-seat billing)
 */
export class SubscriptionManager {
  /**
   * Mettre à jour la quantité de l'abonnement Stripe
   * Appelé automatiquement quand un membre est ajouté ou supprimé
   */
  static async updateSubscriptionQuantity(
    organizationId: string
  ): Promise<void> {
    if (!BILLING_CONFIG.isPerSeat()) {
      return; // Pas nécessaire en mode organization-based
    }

    if (!stripe) {
      console.warn("Stripe not configured, skipping subscription quantity update");
      return;
    }

    const supabase = await createClient();

    try {
      // 1. Compter les membres actifs
      const { count } = await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId);

      const quantity = Math.max(count || 1, 1); // Minimum 1 siège

      // 2. Récupérer l'abonnement Stripe
      const { data: org } = await supabase
        .from("organizations")
        .select("stripe_subscription_id")
        .eq("id", organizationId)
        .single();

      if (!org?.stripe_subscription_id) {
        console.warn("No Stripe subscription found for organization", organizationId);
        return;
      }

      // 3. Récupérer l'abonnement actuel
      const subscription = await stripe.subscriptions.retrieve(
        org.stripe_subscription_id
      );

      // 4. Mettre à jour la quantité
      const subscriptionItem = subscription.items.data[0];

      if (!subscriptionItem) {
        console.warn("No subscription items found for subscription", org.stripe_subscription_id);
        return;
      }

      await stripe.subscriptions.update(org.stripe_subscription_id, {
        items: [{
          id: subscriptionItem.id,
          quantity: quantity,
        }],
        proration_behavior: "always_invoice", // Facturation au prorata
      });

      console.log(`Updated subscription quantity to ${quantity} for org ${organizationId}`);
    } catch (error) {
      console.error("Error updating subscription quantity:", error);
      throw error;
    }
  }

  /**
   * Ajouter un membre et mettre à jour la facturation
   * (Déplacé dans member-management.ts pour centraliser la logique)
   */
  static async addMember(
    organizationId: string,
    userId: string,
    role: "admin" | "member" = "member"
  ): Promise<void> {
    // Cette méthode est maintenant dans member-management.ts
    // Gardée pour compatibilité mais devrait être dépréciée
    const { addOrganizationMember } = await import("@/lib/organizations/member-management");
    const result = await addOrganizationMember(organizationId, userId, role, userId);
    if (!result.success) {
      throw new Error(result.error || "Failed to add member");
    }
  }

  /**
   * Supprimer un membre et mettre à jour la facturation
   * (Déplacé dans member-management.ts pour centraliser la logique)
   */
  static async removeMember(
    organizationId: string,
    userId: string
  ): Promise<void> {
    // Cette méthode est maintenant dans member-management.ts
    // Gardée pour compatibilité mais devrait être dépréciée
    const { removeOrganizationMember } = await import("@/lib/organizations/member-management");
    const result = await removeOrganizationMember(organizationId, userId, userId);
    if (!result.success) {
      throw new Error(result.error || "Failed to remove member");
    }
  }
}
