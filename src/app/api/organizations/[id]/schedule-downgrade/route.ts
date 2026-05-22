import { NextRequest } from "next/server";

import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth/require-role";
import { stripeService } from "@/lib/services/stripe-service";
import { isPlanId, type PlanId } from "@/lib/config/plans-config";

export const runtime = "nodejs";

const RANK: Record<PlanId, number> = {
  trial: 0,
  solo: 1,
  team: 2,
  custom: 3,
  demo: 99, // demo is internal — refuse to schedule downgrades on it
};

function idFromUrl(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segments.indexOf("organizations");
  return segments[i + 1] ?? "";
}

/**
 * POST /api/organizations/[id]/schedule-downgrade
 * Body: { targetPlan: 'solo' | 'team' }
 *
 * Schedules a downgrade for the owner's active org. The effective date is
 * pinned to the Stripe subscription's `current_period_end` — never set
 * client-side, never inferred from `now() + months` — so the in-app
 * countdown stays in lock-step with the actual billing cycle.
 *
 * The plan flip happens later: a cron picks up rows where
 * `scheduled_downgrade_effective_at <= now()` and runs the LIFO member
 * deactivation + plan column update. Stripe itself reconciles via the
 * existing webhook handler.
 */
export const POST = createApiHandler(
  async (req: NextRequest, ctx) => {
    const orgId = idFromUrl(req);
    if (!orgId) throw Errors.badRequest("Organization id manquant");
    if (orgId !== ctx.workspaceId) {
      throw Errors.forbidden(
        "Vous ne pouvez modifier que votre organisation active"
      );
    }

    await requireRole(ctx, "owner");

    const body = await parseBody<{ targetPlan?: string }>(req);
    const targetPlan = (body.targetPlan ?? "").trim().toLowerCase();
    if (!isPlanId(targetPlan) || (targetPlan !== "solo" && targetPlan !== "team")) {
      throw Errors.badRequest(
        "Plan cible invalide — utilisez 'solo' ou 'team'"
      );
    }

    const { data: org, error } = await ctx.supabase
      .from("organizations")
      .select(
        "plan, stripe_subscription_id, scheduled_downgrade_to, status, deleted_at"
      )
      .eq("id", orgId)
      .maybeSingle();

    if (error || !org) throw Errors.notFound("Organization");
    if (org.deleted_at) throw Errors.badRequest("Organisation supprimée");

    const currentPlan = (org.plan ?? "trial") as PlanId;
    if (!isPlanId(currentPlan)) {
      throw Errors.badRequest("Plan actuel invalide");
    }

    // Must be a strict downgrade. Same-plan or upward changes go through
    // the upgrade/checkout flow, not this endpoint.
    if (RANK[targetPlan] >= RANK[currentPlan]) {
      throw Errors.badRequest(
        "Le plan cible doit être inférieur au plan actuel"
      );
    }

    // Idempotent: if there's already a pending downgrade to the same target,
    // re-return the existing schedule. Reschedule to a different target
    // requires explicit cancel-then-schedule.
    if (org.scheduled_downgrade_to && org.scheduled_downgrade_to !== targetPlan) {
      throw Errors.conflict(
        "Une rétrogradation est déjà planifiée vers un autre plan. Annulez-la d'abord."
      );
    }

    if (!org.stripe_subscription_id) {
      throw Errors.badRequest(
        "Aucun abonnement actif — la rétrogradation programmée nécessite un cycle de facturation en cours"
      );
    }

    // Pin the effective date to the Stripe subscription's period end so
    // the user keeps what they paid for. The cron applies the change after
    // this timestamp; Stripe's own renewal webhook handles the billing side.
    const subscription = await stripeService.getSubscription(
      org.stripe_subscription_id
    );
    const periodEndUnix =
      (subscription as unknown as { current_period_end?: number })
        .current_period_end ?? null;
    if (!periodEndUnix) {
      throw Errors.internal(
        "Impossible de déterminer la fin du cycle de facturation"
      );
    }
    const effectiveAt = new Date(periodEndUnix * 1000).toISOString();

    const { error: updateErr } = await ctx.supabase
      .from("organizations")
      .update({
        scheduled_downgrade_to: targetPlan,
        scheduled_downgrade_effective_at: effectiveAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateErr) throw Errors.internal(updateErr.message);

    return {
      ok: true as const,
      targetPlan,
      effectiveAt,
      currentPlan,
    };
  },
  {
    requireWorkspace: true,
    rateLimit: { name: "schedule-downgrade", requests: 10, window: "1 m" },
  }
);
