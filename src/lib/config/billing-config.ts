/**
 * Configuration du modèle de facturation
 * Permet de switcher facilement entre facturation par organisation et par siège
 */

export type BillingModel = "organization" | "per-seat";

/**
 * Modèle de facturation actuel
 *
 * - "organization" : Facturation par organisation (une org Pro = un prix fixe)
 * - "per-seat" : Facturation par siège (une org Pro avec 10 users coûte plus qu'avec 1 user)
 */
export const BILLING_MODEL: BillingModel =
  (process.env.BILLING_MODEL as BillingModel) || "organization";

/**
 * Configuration du modèle de facturation
 */
export const BILLING_CONFIG = {
  model: BILLING_MODEL,

  /**
   * Vérifier si on utilise la facturation par siège
   */
  isPerSeat(): boolean {
    return this.model === "per-seat";
  },

  /**
   * Vérifier si on utilise la facturation par organisation
   */
  isOrganizationBased(): boolean {
    return this.model === "organization";
  },

  /**
   * Obtenir le nombre de sièges pour une organisation
   * (utilisé uniquement en mode per-seat)
   */
  async getSeatCount(organizationId: string): Promise<number> {
    if (!this.isPerSeat()) {
      return 1; // En mode organization, on facture toujours 1 siège
    }

    // En mode per-seat, compter les membres actifs
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { count } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    return count || 1; // Minimum 1 siège
  },
} as const;
