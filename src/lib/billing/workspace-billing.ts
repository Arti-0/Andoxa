import type { Workspace } from "@/lib/workspace/types";

export class BillingInactiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingInactiveError";
  }
}

/**
 * True if the workspace may use paid features (active subscription or valid Stripe trial).
 */
export function hasActiveBilling(
  workspace:
    | Pick<Workspace, "subscription_status" | "trial_ends_at">
    | null
    | undefined
): boolean {
  if (!workspace) return false;
  const sub = workspace.subscription_status;
  if (sub === "active") return true;
  if (sub === "trialing") {
    if (workspace.trial_ends_at) {
      return new Date(workspace.trial_ends_at).getTime() > Date.now();
    }
    return true;
  }
  return false;
}

/**
 * Ensures API access is allowed for the current billing state.
 * @throws BillingInactiveError when subscription is explicitly inactive or trial has ended.
 */
export function assertWorkspaceHasActiveBilling(workspace: Workspace): void {
  const sub = workspace.subscription_status;
  if (sub === "active") return;

  if (sub === "trialing") {
    if (workspace.trial_ends_at && new Date(workspace.trial_ends_at).getTime() <= Date.now()) {
      throw new BillingInactiveError(
        "Votre essai est terminé. Souscrivez un abonnement payant pour continuer à utiliser Andoxa."
      );
    }
    return;
  }

  if (sub === null || sub === undefined) return;

  throw new BillingInactiveError(
    "Abonnement inactif ou expiré. Mettez à jour votre moyen de paiement pour continuer."
  );
}
