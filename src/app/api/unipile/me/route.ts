import { createApiHandler } from "@/lib/api";
import { getAccountIdForUser } from "@/lib/unipile/account";

/**
 * GET /api/unipile/me
 * Returns connection status for LinkedIn and WhatsApp Unipile accounts.
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    return { connected: false, whatsapp_connected: false };
  }

  let linkedinConnected = false;
  let linkedinAccountId: string | undefined;
  let whatsappConnected = false;

  try {
    linkedinAccountId = await getAccountIdForUser(ctx, "LINKEDIN");
    linkedinConnected = true;
  } catch {
    // LinkedIn not connected
  }

  try {
    await getAccountIdForUser(ctx, "WHATSAPP");
    whatsappConnected = true;
  } catch {
    // WhatsApp not connected
  }

  return {
    connected: linkedinConnected,
    account_id: linkedinAccountId,
    whatsapp_connected: whatsappConnected,
  };
});
