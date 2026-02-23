/**
 * Campaign creation limits utilities
 */

export interface CampaignLimitCheck {
  canCreate: boolean;
  used: number;
  limit: number;
  reason?: string;
}

/**
 * Check if user can create a new campaign
 * @returns Promise with limit check result
 */
export async function checkCampaignCreationLimit(): Promise<CampaignLimitCheck> {
  try {
    const response = await fetch("/api/campaigns/check-limit", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return {
        canCreate: false,
        used: 0,
        limit: 0,
        reason: "Erreur lors de la vérification des limites",
      };
    }

    const data = await response.json();
    return {
      canCreate: data.canCreate,
      used: data.used || 0,
      limit: data.limit || 0,
      reason: data.reason,
    };
  } catch (error) {
    console.error("Error checking campaign limit:", error);
    return {
      canCreate: false,
      used: 0,
      limit: 0,
      reason: "Erreur lors de la vérification des limites",
    };
  }
}

