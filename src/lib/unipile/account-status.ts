/**
 * Helpers to keep `user_unipile_accounts.status` in sync with Unipile's
 * authoritative view of an account.
 *
 * Two entry points:
 *   - `markUnipileAccountErroredFromError`: call from a consumer `catch` when
 *     a credential-class UnipileApiError surfaces (webhook may have been
 *     missed; we still need to flip the row to error).
 *   - `reconcileUnipileAccountStatusFromAccount`: call after a successful
 *     `GET /accounts/{id}` to align local status with the live `sources[].status`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";

import type { Database } from "@/lib/types/supabase";
import { createServiceClient } from "@/lib/supabase/service";
import { UnipileApiError, unipileFetch } from "./client";
import type { UnipileAccount } from "./types";

/**
 * Unipile error types that mean "this account is broken on the provider side —
 * user must reconnect." Aligned with `UNIPILE_ERROR_MESSAGES` in types.ts.
 */
const CREDENTIAL_ERROR_TYPES = new Set([
  "errors/missing_credentials",
  "errors/disconnected_account",
  "errors/invalid_credentials",
  "errors/expired_credentials",
  "errors/insufficient_permissions",
]);

/**
 * Map a Unipile source status string (returned by `GET /accounts/{id}` in
 * `sources[].status`) to our local `user_unipile_accounts.status` value.
 *
 * Unknown values return `null` (caller should leave the row alone rather
 * than overwriting a known status with "unknown").
 */
export function mapUnipileSourceStatus(sourceStatus: string | undefined | null):
  | { status: string; errorCode: string | null }
  | null {
  if (!sourceStatus) return null;
  const s = sourceStatus.toUpperCase();
  switch (s) {
    case "OK":
    case "CONNECTED":
      return { status: "connected", errorCode: null };
    case "CONNECTING":
    case "OK_RESYNCING":
    case "INTERMEDIATE_CONNECTING":
      return { status: "connecting", errorCode: null };
    case "STOPPED":
      return { status: "stopped", errorCode: "ACCOUNT_STOPPED" };
    case "CREDENTIALS":
      return { status: "error", errorCode: "ACCOUNT_CREDENTIALS" };
    case "PERMISSIONS":
      return { status: "error", errorCode: "ACCOUNT_PERMISSIONS" };
    case "ERROR":
    case "DISCONNECTED":
      return { status: "error", errorCode: "ACCOUNT_ERROR" };
    default:
      return null;
  }
}

const ERROR_LABELS: Record<string, string> = {
  ACCOUNT_ERROR: "Erreur de compte LinkedIn — reconnexion requise.",
  ACCOUNT_CREDENTIALS: "Identifiants LinkedIn invalides — reconnexion requise.",
  ACCOUNT_PERMISSIONS: "Permissions LinkedIn insuffisantes — reconnexion requise.",
  ACCOUNT_STOPPED: "Compte LinkedIn suspendu ou arrêté.",
};

/**
 * Read first source status from a Unipile account response. Unipile typically
 * returns one source per account; if multiple, prefer the worst non-OK one so
 * we surface problems early.
 */
function pickWorstSourceStatus(account: UnipileAccount): string | null {
  const sources = account.sources ?? [];
  if (!sources.length) return null;
  const priority = (s: string): number => {
    const u = s.toUpperCase();
    if (u === "CREDENTIALS") return 0;
    if (u === "PERMISSIONS") return 1;
    if (u === "ERROR" || u === "DISCONNECTED") return 2;
    if (u === "STOPPED") return 3;
    if (u === "CONNECTING" || u === "OK_RESYNCING") return 4;
    return 5;
  };
  const sorted = [...sources].sort((a, b) => priority(a.status) - priority(b.status));
  return sorted[0]?.status ?? null;
}

/**
 * Align `user_unipile_accounts` with a freshly fetched Unipile account.
 * No-op when status matches what we already have, or when the source status
 * is unrecognized.
 *
 * Safe to call from any context; uses the provided supabase client (service
 * or user-scoped — the row already exists, so RLS doesn't block updates the
 * user owns).
 */
export async function reconcileUnipileAccountStatusFromAccount(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    accountType: "LINKEDIN" | "WHATSAPP";
    unipileAccount: UnipileAccount;
  }
): Promise<{ status: string; changed: boolean } | null> {
  const sourceStatus = pickWorstSourceStatus(params.unipileAccount);
  const mapped = mapUnipileSourceStatus(sourceStatus);
  if (!mapped) return null;

  const { data: existing } = await supabase
    .from("user_unipile_accounts")
    .select("status, error_code")
    .eq("user_id", params.userId)
    .eq("account_type", params.accountType)
    .maybeSingle();

  if (!existing) return null;

  const isError = mapped.status === "error" || mapped.status === "stopped";
  const errorMessage = isError && mapped.errorCode
    ? (ERROR_LABELS[mapped.errorCode] ?? null)
    : null;

  const unchanged =
    existing.status === mapped.status && existing.error_code === mapped.errorCode;
  if (unchanged) return { status: mapped.status, changed: false };

  const { error } = await supabase
    .from("user_unipile_accounts")
    .update({
      status: mapped.status,
      error_code: isError ? mapped.errorCode : null,
      error_message: errorMessage,
      last_status_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId)
    .eq("account_type", params.accountType);

  if (error) {
    console.error("[unipile] reconcile status update failed:", error);
    return { status: existing.status, changed: false };
  }

  return { status: mapped.status, changed: true };
}

/**
 * When a consumer (campaign send, workflow step, ad-hoc API call) gets a
 * UnipileApiError that screams "account is broken", flip the row to error so
 * the UI banner appears even if Unipile's webhook never arrived.
 *
 * Best-effort. Uses the service client internally because it's called from
 * deep in the call stack where the user-scoped supabase isn't always handy.
 * Never throws — failures are logged + sent to Sentry but don't surface.
 *
 * Returns true if a row was flipped, false otherwise.
 */
export async function markUnipileAccountErroredFromError(
  accountId: string | null | undefined,
  err: unknown
): Promise<boolean> {
  if (!accountId) return false;
  if (!(err instanceof UnipileApiError)) return false;

  const type = err.unipileType ?? "";
  if (!CREDENTIAL_ERROR_TYPES.has(type)) return false;

  // Map error type → error_code for symmetry with webhook events.
  const errorCode =
    type === "errors/insufficient_permissions"
      ? "ACCOUNT_PERMISSIONS"
      : type === "errors/disconnected_account" || type === "errors/missing_credentials"
        ? "ACCOUNT_CREDENTIALS"
        : type === "errors/invalid_credentials"
          ? "ACCOUNT_CREDENTIALS"
          : type === "errors/expired_credentials"
            ? "ACCOUNT_CREDENTIALS"
            : "ACCOUNT_ERROR";

  try {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("user_unipile_accounts")
      .select("user_id, status, error_code")
      .eq("unipile_account_id", accountId)
      .maybeSingle();

    if (!existing) return false;

    if (existing.status === "error" && existing.error_code === errorCode) {
      return false;
    }

    const { error } = await supabase
      .from("user_unipile_accounts")
      .update({
        status: "error",
        error_code: errorCode,
        error_message: ERROR_LABELS[errorCode] ?? err.message,
        last_status_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("unipile_account_id", accountId);

    if (error) {
      console.error("[unipile] markUnipileAccountErroredFromError update:", error);
      return false;
    }

    Sentry.captureMessage(
      `Unipile account flipped to error from consumer (${errorCode})`,
      { level: "warning", extra: { accountId, type } }
    );

    return true;
  } catch (e) {
    console.error("[unipile] markUnipileAccountErroredFromError:", e);
    return false;
  }
}

/** Local-status values that mean "the user must reconnect before we touch Unipile." */
const BROKEN_STATUSES = new Set(["error", "stopped", "disconnected"]);

/** Default reconcile staleness gate — see `ensureUnipileAccountUsable`. */
const DEFAULT_PREFLIGHT_MAX_AGE_MS = 10 * 60 * 1000;

export class UnipileAccountUnusableError extends Error {
  constructor(
    public reason:
      | "not_connected"
      | "broken_status"
      | "account_gone",
    public localizedMessage: string,
    public accountType: "LINKEDIN" | "WHATSAPP"
  ) {
    super(localizedMessage);
    this.name = "UnipileAccountUnusableError";
  }
}

function brokenStatusMessage(
  accountType: "LINKEDIN" | "WHATSAPP",
  errorMessage: string | null
): string {
  const channelLabel = accountType === "WHATSAPP" ? "WhatsApp" : "LinkedIn";
  // Prefer the persisted detail (e.g. "Identifiants LinkedIn invalides —
  // reconnexion requise.") since it tells the user exactly what's wrong.
  if (errorMessage?.trim()) {
    return `${errorMessage} Reconnectez votre compte ${channelLabel} depuis les paramètres.`;
  }
  return `Votre compte ${channelLabel} est en erreur. Reconnectez-le depuis les paramètres pour relancer.`;
}

/**
 * Pre-flight check before launching a campaign/workflow that uses a Unipile
 * account. Returns the `unipile_account_id` on success; throws
 * `UnipileAccountUnusableError` (callers should translate to a 400) when the
 * account is missing or known-broken.
 *
 * Cost: usually one DB read. We only hit Unipile when the local status is
 * 'connected' but `last_status_at` is older than `maxAgeMs` (default 10 min).
 * Inside that window we trust the cache — keeps the common case cheap.
 *
 * Note on the broken-status fast path: when the row is already 'error' /
 * 'stopped' / 'disconnected', we DO NOT bother calling Unipile. Hitting their
 * API would just confirm what we already know, and would block campaign
 * launch behind extra network latency.
 */
export async function ensureUnipileAccountUsable(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    accountType: "LINKEDIN" | "WHATSAPP";
    maxAgeMs?: number;
  }
): Promise<{ accountId: string; status: string }> {
  const accountType = params.accountType;
  const maxAgeMs = params.maxAgeMs ?? DEFAULT_PREFLIGHT_MAX_AGE_MS;
  const channelLabel = accountType === "WHATSAPP" ? "WhatsApp" : "LinkedIn";

  const { data: row } = await supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id, status, last_status_at, error_message")
    .eq("user_id", params.userId)
    .eq("account_type", accountType)
    .maybeSingle();

  if (!row?.unipile_account_id) {
    throw new UnipileAccountUnusableError(
      "not_connected",
      `Connectez votre compte ${channelLabel} depuis les paramètres avant de lancer.`,
      accountType
    );
  }

  if (BROKEN_STATUSES.has(row.status ?? "")) {
    throw new UnipileAccountUnusableError(
      "broken_status",
      brokenStatusMessage(accountType, row.error_message),
      accountType
    );
  }

  // Staleness gate: trust the cache if we checked recently.
  const lastAt = row.last_status_at ? new Date(row.last_status_at).getTime() : 0;
  if (Date.now() - lastAt < maxAgeMs) {
    return { accountId: row.unipile_account_id, status: row.status ?? "unknown" };
  }

  // Stale — confirm against Unipile and reconcile. On transient Unipile
  // failures, fall back to the cached "connected" status (better to let the
  // campaign run and hit the per-prospect credential error path than to
  // refuse launch over a 502).
  try {
    const account = await unipileFetch<UnipileAccount>(
      `/accounts/${encodeURIComponent(row.unipile_account_id)}`
    );
    const reconciled = await reconcileUnipileAccountStatusFromAccount(supabase, {
      userId: params.userId,
      accountType,
      unipileAccount: account,
    });
    const newStatus = reconciled?.status ?? row.status ?? "unknown";
    if (BROKEN_STATUSES.has(newStatus)) {
      // Re-fetch the row to surface the updated error_message in the user
      // message (the helper only persists the labelled message on transition).
      const { data: refreshed } = await supabase
        .from("user_unipile_accounts")
        .select("error_message")
        .eq("user_id", params.userId)
        .eq("account_type", accountType)
        .maybeSingle();
      throw new UnipileAccountUnusableError(
        "broken_status",
        brokenStatusMessage(accountType, refreshed?.error_message ?? null),
        accountType
      );
    }
    return { accountId: row.unipile_account_id, status: newStatus };
  } catch (err) {
    if (err instanceof UnipileAccountUnusableError) throw err;
    if (err instanceof UnipileApiError) {
      if (err.status === 404 || err.unipileType === "errors/resource_not_found") {
        // The account is gone Unipile-side. Drop our row so the user starts
        // fresh next time they hit Settings.
        await supabase
          .from("user_unipile_accounts")
          .delete()
          .eq("user_id", params.userId)
          .eq("account_type", accountType);
        throw new UnipileAccountUnusableError(
          "account_gone",
          `Votre compte ${channelLabel} n'est plus accessible. Reconnectez-le depuis les paramètres.`,
          accountType
        );
      }
    }
    // Transient — log and trust the cache.
    console.warn(
      "[unipile preflight] reconcile failed, trusting cache:",
      err instanceof Error ? err.message : err
    );
    return { accountId: row.unipile_account_id, status: row.status ?? "unknown" };
  }
}
