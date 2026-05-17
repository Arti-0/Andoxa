import type { ApiContext } from "@/lib/api/handlers";
import { Errors } from "@/lib/api";
import { isPaidPlan } from "@/lib/config/plans-config";
import { normalizePlanIdForRoutes } from "./effective-plan";

/**
 * Messagerie Unipile + message templates: any paid plan (Solo / Team / Custom).
 * Demo accounts also pass for QA/sales walkthroughs.
 *
 * Trial accounts are NOT gated out here — they're already paying via Stripe
 * trial on Solo, and `normalizePlanIdForRoutes` returns `solo` for them.
 */
export function assertMessagerieAndTemplatesPlan(ctx: ApiContext): void {
  if (!ctx.workspace) {
    throw Errors.badRequest("Workspace required");
  }
  const p = normalizePlanIdForRoutes(
    ctx.workspace.plan,
    ctx.workspace.subscription_status
  );
  if (!isPaidPlan(p)) {
    throw Errors.forbidden(
      "La messagerie et les modèles de messages nécessitent un abonnement actif."
    );
  }
}
