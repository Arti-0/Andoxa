import { createApiHandler } from "@/lib/api";
import { inferLinkedInAccountTier } from "@/lib/linkedin/tier";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import { reconcileUnipileAccountStatusFromAccount } from "@/lib/unipile/account-status";
import type { UnipileAccount } from "@/lib/unipile/types";

/**
 * Staleness window for the Unipile validation call. The hourly reconciler cron
 * keeps every row touched within an hour; the per-request gate just avoids
 * burning Unipile API quota when the user mashes refresh.
 *
 * Picked at 60s: long enough that a typical session (poll on focus, navigate
 * around) only ever hits Unipile once; short enough that a user who just
 * reconnected sees the green badge on the next /me poll.
 */
const ME_RECONCILE_MAX_AGE_MS = 60 * 1000;

function isUnipileAccountGoneError(e: unknown): boolean {
  if (e instanceof UnipileApiError) {
    return (
      e.status === 404 || e.unipileType === "errors/resource_not_found"
    );
  }
  return false;
}

function toStringArray(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features.map((x) => String(x));
}

function isFresh(lastStatusAt: string | null | undefined, maxAgeMs: number): boolean {
  if (!lastStatusAt) return false;
  const t = new Date(lastStatusAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < maxAgeMs;
}

/**
 * GET /api/unipile/me
 *
 * Returns LinkedIn + WhatsApp connection state for the current user, and
 * keeps `user_unipile_accounts` in sync with Unipile's authoritative view:
 *   - 404 → row deleted (account is gone Unipile-side).
 *   - Otherwise → `sources[].status` is mapped to our local `status` and
 *     written back if it changed. Closes the desync window when a status
 *     webhook (ACCOUNT_CREDENTIALS, ACCOUNT_STOPPED, ...) is missed.
 *
 * Cost: usually one DB read. We only call Unipile when `last_status_at` is
 * older than ME_RECONCILE_MAX_AGE_MS. The hourly reconciler cron handles the
 * background drift, so this in-request reconcile is the safety net for
 * "user just hit Settings; show me the truth right now."
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    const { data: accounts } = await ctx.supabase
      .from("user_unipile_accounts")
      .select(
        "account_type, unipile_account_id, status, error_message, last_status_at, is_premium, premium_features"
      )
      .eq("user_id", ctx.userId);

    let linkedin = accounts?.find((a) => a.account_type === "LINKEDIN");
    let whatsapp = accounts?.find((a) => a.account_type === "WHATSAPP");

    let linkedinClearedStale = false;
    let whatsappClearedStale = false;
    let linkedinReconciledStatus: string | null = null;
    let whatsappReconciledStatus: string | null = null;

    // Reconcile both accounts against Unipile in parallel, with a short timeout
    // so this latency-sensitive endpoint degrades to local DB state instead of
    // blocking the user when Unipile is slow. The 60s freshness gate means most
    // polls skip these calls entirely; a timeout/error just falls back to the
    // stored status (the hourly reconciler cron repairs any drift).
    const RECONCILE_TIMEOUT_MS = 8_000;

    const reconcileLinkedIn = async () => {
      if (
        !linkedin?.unipile_account_id ||
        isFresh(linkedin.last_status_at, ME_RECONCILE_MAX_AGE_MS)
      ) {
        return;
      }
      try {
        const account = await unipileFetch<UnipileAccount>(
          `/accounts/${encodeURIComponent(linkedin.unipile_account_id)}`,
          { timeoutMs: RECONCILE_TIMEOUT_MS }
        );
        const reconciled = await reconcileUnipileAccountStatusFromAccount(
          ctx.supabase,
          { userId: ctx.userId, accountType: "LINKEDIN", unipileAccount: account }
        );
        if (reconciled?.changed) {
          linkedinReconciledStatus = reconciled.status;
        }
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
    };

    const reconcileWhatsApp = async () => {
      if (
        !whatsapp?.unipile_account_id ||
        isFresh(whatsapp.last_status_at, ME_RECONCILE_MAX_AGE_MS)
      ) {
        return;
      }
      try {
        const account = await unipileFetch<UnipileAccount>(
          `/accounts/${encodeURIComponent(whatsapp.unipile_account_id)}`,
          { timeoutMs: RECONCILE_TIMEOUT_MS }
        );
        const reconciled = await reconcileUnipileAccountStatusFromAccount(
          ctx.supabase,
          { userId: ctx.userId, accountType: "WHATSAPP", unipileAccount: account }
        );
        if (reconciled?.changed) {
          whatsappReconciledStatus = reconciled.status;
        }
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
    };

    await Promise.all([reconcileLinkedIn(), reconcileWhatsApp()]);

    const linkedinTier = inferLinkedInAccountTier(
      linkedin?.is_premium ?? false,
      toStringArray(linkedin?.premium_features)
    );

    const linkedinStatus = linkedinClearedStale
      ? "disconnected"
      : (linkedinReconciledStatus ?? linkedin?.status ?? "unknown");

    const whatsappStatus = whatsappClearedStale
      ? "disconnected"
      : (whatsappReconciledStatus ?? whatsapp?.status ?? "unknown");

    return {
      connected: !!linkedin?.unipile_account_id,
      account_id: linkedin?.unipile_account_id ?? undefined,
      linkedin_status: linkedinStatus,
      linkedin_error: linkedin?.error_message ?? null,
      linkedin_is_premium: linkedin?.is_premium ?? false,
      linkedin_premium_features: toStringArray(linkedin?.premium_features),
      linkedin_tier: linkedinTier,
      whatsapp_connected: !!whatsapp?.unipile_account_id,
      whatsapp_status: whatsappStatus,
      whatsapp_error: whatsapp?.error_message ?? null,
    };
  },
  { requireWorkspace: false }
);
