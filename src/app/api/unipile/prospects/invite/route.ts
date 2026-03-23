import { ApiError, createApiHandler, Errors, parseBody } from "@/lib/api";
import { LINKEDIN_INVITE_DAILY_CAP } from "@/lib/config/linkedin-invite";
import { UnipileApiError } from "@/lib/unipile/client";
import { getAccountIdForUser } from "@/lib/unipile/account";
import {
  getLinkedInInviteUsage,
  incrementLinkedInInviteUsage,
} from "@/lib/unipile/invite-usage";
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

  const usage = await getLinkedInInviteUsage(ctx.supabase, ctx.userId);
  if (usage.used >= usage.cap) {
    throw new ApiError(
      "RATE_LIMIT",
      `Limite quotidienne d'invitations LinkedIn atteinte (${LINKEDIN_INVITE_DAILY_CAP}). Réessayez demain.`,
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

  await incrementLinkedInInviteUsage(ctx.supabase, ctx.userId);

  return { ok: true as const, used: usage.used + 1, cap: usage.cap };
});
