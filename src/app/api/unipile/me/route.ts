import { createApiHandler } from "@/lib/api";
import { getAccountIdForUser } from "@/lib/unipile/account";

/**
 * GET /api/unipile/me
 * Returns whether the current user has a connected Unipile account.
 * Used by the LinkedIn page to show "Connect" vs "Connected" state.
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    return { connected: false };
  }

  try {
    const accountId = await getAccountIdForUser(ctx);
    return { connected: true, account_id: accountId };
  } catch {
    return { connected: false };
  }
});
