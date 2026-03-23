import { createApiHandler, Errors } from "@/lib/api";
import { getLinkedInInviteUsage } from "@/lib/unipile/invite-usage";

/**
 * GET /api/unipile/invite-quota
 * Daily LinkedIn invite usage for the current user (CRM single-invite cap).
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.userId) {
    throw Errors.unauthorized();
  }

  const usage = await getLinkedInInviteUsage(ctx.supabase, ctx.userId);
  return usage;
});
