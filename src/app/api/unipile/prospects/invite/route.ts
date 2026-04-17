import { ApiError, createApiHandler, Errors, parseBody } from "@/lib/api";
import { weeklyPeriodKey } from "@/lib/campaigns/throttle";
import { getLinkedInInviteWeeklyUsageCap } from "@/lib/linkedin/limits";
import { UnipileApiError } from "@/lib/unipile/client";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { sendLinkedInInviteForProspect } from "@/lib/unipile/linkedin-single-invite";

/**
 * POST /api/unipile/prospects/invite
 * Single-prospect LinkedIn invite (same Unipile flow as campaign batch).
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId || !ctx.userId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{ prospect_id?: string; message?: string }>(req);
  const prospectId = body?.prospect_id?.trim();
  if (!prospectId) {
    throw Errors.validation({ prospect_id: "Requis" });
  }

  const week = weeklyPeriodKey();

  const { data: acct } = await ctx.supabase
    .from("user_unipile_accounts")
    .select("is_premium")
    .eq("user_id", ctx.userId)
    .eq("account_type", "LINKEDIN")
    .maybeSingle();

  const cap = getLinkedInInviteWeeklyUsageCap(!!acct?.is_premium);

  const { data: counterRow } = await ctx.supabase
    .from("usage_counters")
    .select("count")
    .eq("user_id", ctx.userId)
    .eq("action", "linkedin_invite")
    .eq("period_key", week)
    .maybeSingle();

  const used = counterRow?.count ?? 0;
  if (used >= cap) {
    throw new ApiError(
      "RATE_LIMIT",
      `Limite hebdomadaire d'invitations LinkedIn atteinte (${cap}). Réessayez la semaine prochaine.`,
      429
    );
  }

  const { data: prospect, error: pErr } = await ctx.supabase
    .from("prospects")
    .select("id, full_name, company, job_title, phone, email, linkedin")
    .eq("id", prospectId)
    .eq("organization_id", ctx.workspaceId)
    .is("deleted_at", null)
    .single();

  if (pErr || !prospect) {
    throw Errors.notFound("Prospect");
  }

  if (!prospect.linkedin) {
    throw Errors.badRequest("Ce prospect n'a pas d'URL LinkedIn");
  }

  const accountId = await getAccountIdForUser(ctx);

  try {
    await sendLinkedInInviteForProspect(ctx, prospect, accountId, body.message);
  } catch (err) {
    const msg = err instanceof UnipileApiError ? err.message : String(err);
    throw Errors.badRequest(msg);
  }

  return { ok: true as const, used: used + 1, cap };
});
