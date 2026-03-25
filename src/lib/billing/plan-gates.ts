import type { ApiContext } from "@/lib/api/handlers";
import { Errors } from "@/lib/api";
import { normalizePlanIdForRoutes } from "./effective-plan";

/**
 * Messagerie Unipile + modèles : Pro, Business (et démo interne).
 */
export function assertMessagerieAndTemplatesPlan(ctx: ApiContext): void {
  if (!ctx.workspace) {
    throw Errors.badRequest("Workspace required");
  }
  const p = normalizePlanIdForRoutes(
    ctx.workspace.plan,
    ctx.workspace.subscription_status
  );
  if (p !== "pro" && p !== "business" && p !== "demo") {
    throw Errors.forbidden(
      "La messagerie et les modèles de messages sont réservés aux plans Pro et Business."
    );
  }
}
