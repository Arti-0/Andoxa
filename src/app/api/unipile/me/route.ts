import { createApiHandler } from "@/lib/api";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";

function isUnipileAccountGoneError(e: unknown): boolean {
  if (e instanceof UnipileApiError) {
    return (
      e.status === 404 || e.unipileType === "errors/resource_not_found"
    );
  }
  return false;
}

/**
 * GET /api/unipile/me
 * Returns connection status for LinkedIn and WhatsApp Unipile accounts.
 * Vérifie encore l’existence du compte côté Unipile ; si 404, supprime la ligne locale (id obsolète).
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    const { data: accounts } = await ctx.supabase
      .from("user_unipile_accounts")
      .select(
        "account_type, unipile_account_id, status, error_message, is_premium, premium_features"
      )
      .eq("user_id", ctx.userId);

    let linkedin = accounts?.find((a) => a.account_type === "LINKEDIN");
    let whatsapp = accounts?.find((a) => a.account_type === "WHATSAPP");

    let linkedinClearedStale = false;
    let whatsappClearedStale = false;

    if (linkedin?.unipile_account_id) {
      try {
        await unipileFetch(
          `/accounts/${encodeURIComponent(linkedin.unipile_account_id)}`
        );
      } catch (e) {
        if (isUnipileAccountGoneError(e)) {
          const { error: delErr } = await ctx.supabase
            .from("user_unipile_accounts")
            .delete()
            .eq("user_id", ctx.userId)
            .eq("account_type", "LINKEDIN");
          if (delErr) {
            console.error("[Unipile /me] failed to clear stale LinkedIn row:", delErr);
          } else {
            linkedin = undefined;
            linkedinClearedStale = true;
          }
        } else {
          console.warn("[Unipile /me] LinkedIn account validation failed:", e);
        }
      }
    }

    if (whatsapp?.unipile_account_id) {
      try {
        await unipileFetch(
          `/accounts/${encodeURIComponent(whatsapp.unipile_account_id)}`
        );
      } catch (e) {
        if (isUnipileAccountGoneError(e)) {
          const { error: delErr } = await ctx.supabase
            .from("user_unipile_accounts")
            .delete()
            .eq("user_id", ctx.userId)
            .eq("account_type", "WHATSAPP");
          if (delErr) {
            console.error("[Unipile /me] failed to clear stale WhatsApp row:", delErr);
          } else {
            whatsapp = undefined;
            whatsappClearedStale = true;
          }
        } else {
          console.warn("[Unipile /me] WhatsApp account validation failed:", e);
        }
      }
    }

    return {
      connected: !!linkedin?.unipile_account_id,
      account_id: linkedin?.unipile_account_id ?? undefined,
      linkedin_status: linkedinClearedStale
        ? "disconnected"
        : (linkedin?.status ?? "unknown"),
      linkedin_error: linkedin?.error_message ?? null,
      linkedin_is_premium: linkedin?.is_premium ?? false,
      linkedin_premium_features: linkedin?.premium_features ?? [],
      whatsapp_connected: !!whatsapp?.unipile_account_id,
      whatsapp_status: whatsappClearedStale
        ? "disconnected"
        : (whatsapp?.status ?? "unknown"),
      whatsapp_error: whatsapp?.error_message ?? null,
    };
  },
  { requireWorkspace: false }
);
