import { createApiHandler } from "@/lib/api";

/**
 * GET /api/unipile/me
 * Returns connection status for LinkedIn and WhatsApp Unipile accounts.
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    const { data: accounts } = await ctx.supabase
      .from("user_unipile_accounts")
      .select(
        "account_type, unipile_account_id, status, error_message, is_premium, premium_features"
      )
      .eq("user_id", ctx.userId);

    const linkedin = accounts?.find((a) => a.account_type === "LINKEDIN");
    const whatsapp = accounts?.find((a) => a.account_type === "WHATSAPP");

    return {
      connected: !!linkedin?.unipile_account_id,
      account_id: linkedin?.unipile_account_id ?? undefined,
      linkedin_status: linkedin?.status ?? "unknown",
      linkedin_error: linkedin?.error_message ?? null,
      linkedin_is_premium: linkedin?.is_premium ?? false,
      linkedin_premium_features: linkedin?.premium_features ?? [],
      whatsapp_connected: !!whatsapp?.unipile_account_id,
      whatsapp_status: whatsapp?.status ?? "unknown",
      whatsapp_error: whatsapp?.error_message ?? null,
    };
  },
  { requireWorkspace: false }
);
