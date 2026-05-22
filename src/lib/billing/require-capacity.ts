import { Errors, type ApiContext } from "@/lib/api";
import { effectivePlanIdForLimits } from "@/lib/billing/effective-plan";
import {
  checkPlanLimit,
  type PlanLimits,
} from "@/lib/config/plans-config";

/**
 * Resources we can cap. Keep the union in sync with `PlanLimits` keys —
 * the helper below maps each entry to its DB count query.
 *
 * `import_csv_xlsx_max_rows` is intentionally not here: it's not a workspace
 * counter, it's a per-request validation handled by `canImportRows` at the
 * import route boundary.
 */
export type CappedResource =
  | "users"
  | "prospects"
  | "campaigns"
  | "organizations";

type Resource = Extract<keyof PlanLimits, CappedResource>;

/**
 * Count the current usage for a given resource in `ctx.workspaceId`.
 *
 * Each branch is a single index-friendly count query — no joins. Falls back
 * to 0 on a count error so a transient DB hiccup never wrongly *unblocks*
 * a mutation (it would, but the cap check still uses 0 as the floor; the
 * subsequent insert would just succeed on the next try).
 */
async function readUsage(
  ctx: ApiContext,
  resource: Resource
): Promise<number> {
  const orgId = ctx.workspaceId!;
  switch (resource) {
    case "users": {
      // Active members + pending invitations both consume a seat. A pending
      // invite is a *committed* seat — the inviter chose to spend it. Not
      // counting them lets an admin spam invites past the cap, with the
      // accept-side check rejecting only the latecomers (frustrating UX).
      //
      // Deactivated members (active=false, after a downgrade prune) keep
      // their data read-only but don't consume seats — they're not in the
      // count below.
      const [membersRes, pendingRes] = await Promise.all([
        ctx.supabase
          .from("organization_members")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("active", true),
        ctx.supabase
          .from("invitations")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .is("consumed_at", null)
          .gt("expires_at", new Date().toISOString()),
      ]);
      return (membersRes.count ?? 0) + (pendingRes.count ?? 0);
    }
    case "prospects": {
      const { count } = await ctx.supabase
        .from("prospects")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .is("deleted_at", null);
      return count ?? 0;
    }
    case "campaigns": {
      const { count } = await ctx.supabase
        .from("campaign_jobs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .in("status", ["draft", "pending", "running", "paused"]);
      return count ?? 0;
    }
    case "organizations": {
      const { count } = await ctx.supabase
        .from("organizations")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ctx.userId)
        .is("deleted_at", null);
      return count ?? 0;
    }
  }
}

/**
 * Resolve the effective plan for the active workspace. Falls back to `trial`
 * if the row is missing — same defensive behaviour as `effectivePlanIdForLimits`.
 */
async function readEffectivePlan(ctx: ApiContext) {
  const { data: org } = await ctx.supabase
    .from("organizations")
    .select("plan, subscription_status")
    .eq("id", ctx.workspaceId!)
    .maybeSingle();
  return effectivePlanIdForLimits(
    (org?.plan as string | null) ?? null,
    (org?.subscription_status as string | null) ?? null
  );
}

/**
 * Throw `Errors.planLimitReached` if adding `amount` to the current usage
 * would exceed the plan's cap. Unlimited caps (`-1`) always pass.
 *
 *   await requireCapacity(ctx, "users", 1);      // before sending an invite
 *   await requireCapacity(ctx, "prospects", 25); // before bulk-creating 25
 *
 * The thrown error carries `{ resource, used, limit }` in `details` so the
 * client can open the upgrade prompt with the relevant context.
 */
export async function requireCapacity(
  ctx: ApiContext,
  resource: CappedResource,
  amount = 1
): Promise<void> {
  if (!ctx.workspaceId && resource !== "organizations") {
    throw Errors.badRequest("Workspace required");
  }

  const planId = await readEffectivePlan(ctx);
  const used = await readUsage(ctx, resource);
  const projected = used + amount;
  const check = checkPlanLimit(planId, resource, projected - 1);

  // checkPlanLimit returns canUse=true when projected-1 < limit, i.e. after
  // adding 1 more we'd still be at-or-under the cap. For amounts > 1 we
  // recompute to enforce the actual delta.
  if (check.limit === -1) return;
  if (projected <= check.limit) return;

  throw Errors.planLimitReached(resource, used, check.limit);
}

/**
 * Non-throwing variant — useful in UI-bound endpoints (e.g. `/api/usage/limits`)
 * that need to return the structured state instead of bailing the request.
 */
export async function readCapacity(
  ctx: ApiContext,
  resource: CappedResource
): Promise<{ used: number; limit: number; canUse: boolean }> {
  if (!ctx.workspaceId && resource !== "organizations") {
    throw Errors.badRequest("Workspace required");
  }
  const planId = await readEffectivePlan(ctx);
  const used = await readUsage(ctx, resource);
  const check = checkPlanLimit(planId, resource, used);
  return { used, limit: check.limit, canUse: check.canUse };
}
