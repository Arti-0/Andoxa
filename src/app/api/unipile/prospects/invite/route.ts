import { ApiError, createApiHandler, Errors, parseBody } from "@/lib/api";
import { LinkedInInviteWeeklyQuotaError } from "@/lib/linkedin/weekly-invite-quota";
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

  // Quota is enforced atomically inside sendLinkedInInviteForProspect via
  // consumeLinkedInInviteQuota. If the cap is reached we get a typed error.
  try {
    await sendLinkedInInviteForProspect(ctx, prospect, accountId, body.message);
  } catch (err) {
    if (err instanceof LinkedInInviteWeeklyQuotaError) {
      throw new ApiError("RATE_LIMIT", err.message, 429);
    }
    const msg = err instanceof UnipileApiError ? err.message : String(err);
    throw Errors.badRequest(msg);
  }

  return { ok: true as const };
});

