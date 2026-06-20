import { NextResponse } from "next/server";
import { timingSafeEqualStr } from "@/lib/security/timing-safe-equal";

import { createServiceClient } from "@/lib/supabase/service";
import { captureRouteError } from "@/lib/sentry/route-error";
import { PLAN_LIMITS, toPlanId } from "@/lib/config/plans-config";

/**
 * POST /api/cron/apply-scheduled-downgrades  (Vercel Cron, hourly)
 *
 * Drains organizations whose owners scheduled a downgrade and whose Stripe
 * period has now ended. For each:
 *
 *   1. Flip `organizations.plan` to the scheduled target.
 *   2. LIFO-deactivate excess members: keep the owner, deactivate the
 *      most-recently-added members until active count ≤ new cap. Owner is
 *      structurally protected by the `transfer_ownership`-only invariant
 *      (single-owner unique index). Members whose `active=false` already
 *      stay deactivated.
 *   3. Clear the schedule columns.
 *
 * Idempotent: a half-applied row (plan flipped but schedule not cleared) is
 * re-picked on the next tick. Each step is its own commit so a partial
 * failure doesn't roll back work already done.
 */
const MAX_ORGS_PER_RUN = 25;

async function applyOne(
  supabase: ReturnType<typeof createServiceClient>,
  org: {
    id: string;
    plan: string | null;
    scheduled_downgrade_to: string | null;
  }
): Promise<{ outcome: "applied" | "skipped"; reason?: string }> {
  const target = toPlanId(org.scheduled_downgrade_to);
  if (!org.scheduled_downgrade_to || target === "trial") {
    // Defensive — shouldn't be picked up by the query but bail loudly anyway.
    return { outcome: "skipped", reason: "no_target" };
  }

  const cap = PLAN_LIMITS[target].users;

  // Read all active members ordered by created_at ASC. Owner is always first
  // because of `created_at` semantics (creator membership row is the oldest)
  // — and even if it weren't, the unique-owner index would block any plan
  // flip that would zero them out.
  const { data: actives, error: readErr } = await supabase
    .from("organization_members")
    .select("user_id, role, created_at")
    .eq("organization_id", org.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (readErr) {
    return { outcome: "skipped", reason: readErr.message };
  }

  const list = actives ?? [];
  if (cap !== -1 && list.length > cap) {
    // LIFO: drop the most recently added members until we fit.
    // Skip the owner row even if it shows up unusually late.
    const toDeactivate: string[] = [];
    for (let i = list.length - 1; i >= 0 && list.length - toDeactivate.length > cap; i--) {
      const m = list[i];
      if (m.role === "owner") continue;
      toDeactivate.push(m.user_id);
    }
    if (toDeactivate.length > 0) {
      const { error: deactivateErr } = await supabase
        .from("organization_members")
        .update({
          active: false,
          deactivated_at: new Date().toISOString(),
        })
        .eq("organization_id", org.id)
        .in("user_id", toDeactivate);
      if (deactivateErr) {
        return { outcome: "skipped", reason: deactivateErr.message };
      }
    }
  }

  // Apply the plan flip + clear the schedule columns in one update so the
  // org never sits with `plan=team` and a stale schedule pointing at solo.
  const { error: updateErr } = await supabase
    .from("organizations")
    .update({
      plan: target,
      scheduled_downgrade_to: null,
      scheduled_downgrade_effective_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", org.id);

  if (updateErr) {
    return { outcome: "skipped", reason: updateErr.message };
  }

  return { outcome: "applied" };
}

export async function POST(req: Request) {
  const route = "api/cron/apply-scheduled-downgrades";
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      captureRouteError(route, new Error("CRON_SECRET not configured"), {
        extra: { step: "auth" },
      });
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!auth || !timingSafeEqualStr(auth, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const nowIso = new Date().toISOString();

    const { data: candidates, error: fetchErr } = await supabase
      .from("organizations")
      .select("id, plan, scheduled_downgrade_to")
      .not("scheduled_downgrade_to", "is", null)
      .lte("scheduled_downgrade_effective_at", nowIso)
      .is("deleted_at", null)
      .limit(MAX_ORGS_PER_RUN);

    if (fetchErr) {
      captureRouteError(route, fetchErr, { extra: { step: "fetch" } });
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const results: { id: string; outcome: string; reason?: string }[] = [];
    for (const org of candidates ?? []) {
      const r = await applyOne(supabase, org as {
        id: string;
        plan: string | null;
        scheduled_downgrade_to: string | null;
      });
      results.push({ id: org.id, ...r });
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (err) {
    captureRouteError(route, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Vercel Cron invokes with GET — same handler, same Bearer auth.
export async function GET(req: Request) {
  return POST(req);
}
