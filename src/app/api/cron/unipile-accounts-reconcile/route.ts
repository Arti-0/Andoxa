import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { createServiceClient } from "@/lib/supabase/service";
import { captureRouteError } from "@/lib/sentry/route-error";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import {
  reconcileUnipileAccountStatusFromAccount,
  syncLinkedInMemberIdFromAccount,
} from "@/lib/unipile/account-status";
import type { UnipileAccount } from "@/lib/unipile/types";
import {
  decryptCookiePayload,
  isCookieEncryptionAvailable,
  type EncryptedCookiePayload,
} from "@/lib/crypto/cookie-cipher";
import { reconnectLinkedInAccountWithCookies } from "@/lib/unipile/custom-auth";

/**
 * POST /api/cron/unipile-accounts-reconcile  (Vercel Cron, hourly)
 *
 * Two jobs per tick:
 *
 * 1. **Silent reconnect (LinkedIn only)**: for rows that flipped to
 *    status='error' with error_code='ACCOUNT_CREDENTIALS' and have fresh
 *    cookies from the browser extension, call Unipile's reconnect endpoint
 *    using the stored cookies. On success the webhook will fire RECONNECTED
 *    and reset the row to connected. Capped at 3 failures before falling
 *    back to the user-driven Hosted Auth banner.
 *
 * 2. **Status reconcile (LinkedIn + WhatsApp)**: safety net for missed
 *    status webhooks. GET /accounts/{id}; 404 deletes the row, 2xx
 *    reconciles `status` from `sources[].status`.
 *
 * Concurrency is intentionally serial with a small inter-call delay.
 * Secured with CRON_SECRET (same pattern as other cron routes).
 */

const MAX_ACCOUNTS_PER_TICK = 40;
const INTER_ACCOUNT_DELAY_MS = 200;

const COOKIE_FRESHNESS_DAYS = 7;
const RECONNECT_RETRY_COOLDOWN_HOURS = 1;
const MAX_RECONNECT_ATTEMPTS = 3;

function isAccountGone(err: unknown): boolean {
  if (err instanceof UnipileApiError) {
    return err.status === 404 || err.unipileType === "errors/resource_not_found";
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ReconnectCandidateRow {
  user_id: string;
  unipile_account_id: string;
  status: string | null;
  error_code: string | null;
  cookie_payload: EncryptedCookiePayload | null;
  date_last_cookie: string | null;
  date_last_reconnect_attempt: string | null;
  reconnect_attempts_failed: number | null;
}

/**
 * Try a silent reconnect using the most-recent cookies pushed by the
 * extension. Returns:
 *  - "reconnected": we called Unipile successfully; webhook will flip status.
 *  - "skipped"    : nothing to do for this row (no candidate, or guards failed).
 *  - "failed"     : we tried and Unipile rejected; failure counter incremented.
 */
async function trySilentReconnect(
  supabase: ReturnType<typeof createServiceClient>,
  row: {
    user_id: string;
    unipile_account_id: string;
    account_type: string | null;
    status: string | null;
  }
): Promise<"reconnected" | "skipped" | "failed"> {
  if ((row.account_type ?? "LINKEDIN").toUpperCase() !== "LINKEDIN") {
    return "skipped";
  }
  if (!isCookieEncryptionAvailable()) return "skipped";

  // Re-fetch with cookie_payload + cookie metadata. We could keep this column
  // in the main listing, but selecting it requires the service role anyway
  // and pulling it row-by-row makes the privilege boundary obvious.
  const { data, error } = await supabase
    .from("user_unipile_accounts")
    .select(
      "user_id, unipile_account_id, status, error_code, cookie_payload, date_last_cookie, date_last_reconnect_attempt, reconnect_attempts_failed"
    )
    .eq("user_id", row.user_id)
    .eq("account_type", "LINKEDIN")
    .maybeSingle();

  if (error || !data) return "skipped";
  const candidate = data as unknown as ReconnectCandidateRow;

  if (candidate.status !== "error") return "skipped";
  if (candidate.error_code !== "ACCOUNT_CREDENTIALS") return "skipped";
  if (!candidate.cookie_payload) return "skipped";
  if (!candidate.date_last_cookie) return "skipped";

  const cookieAgeMs = Date.now() - new Date(candidate.date_last_cookie).getTime();
  if (cookieAgeMs > COOKIE_FRESHNESS_DAYS * 86_400_000) return "skipped";

  if ((candidate.reconnect_attempts_failed ?? 0) >= MAX_RECONNECT_ATTEMPTS) {
    return "skipped";
  }

  if (candidate.date_last_reconnect_attempt) {
    const since =
      Date.now() - new Date(candidate.date_last_reconnect_attempt).getTime();
    if (since < RECONNECT_RETRY_COOLDOWN_HOURS * 3_600_000) return "skipped";
  }

  // Claim the slot first to avoid two concurrent ticks racing through the
  // same row's cooldown window. Touching date_last_reconnect_attempt
  // immediately means a parallel tick will see the recent timestamp and skip.
  const attemptedAt = new Date().toISOString();
  await supabase
    .from("user_unipile_accounts")
    .update({
      date_last_reconnect_attempt: attemptedAt,
      updated_at: attemptedAt,
    } as never)
    .eq("user_id", candidate.user_id)
    .eq("account_type", "LINKEDIN");

  const decrypted = decryptCookiePayload(candidate.cookie_payload, {
    userId: candidate.user_id,
    unipileAccountId: candidate.unipile_account_id,
  });
  if (!decrypted) {
    // Key rotated past retention or tampering — clear the payload and let the
    // extension repopulate on the next LinkedIn visit.
    await supabase
      .from("user_unipile_accounts")
      .update({ cookie_payload: null } as never)
      .eq("user_id", candidate.user_id)
      .eq("account_type", "LINKEDIN");
    Sentry.captureMessage("[unipile reconcile] cookie decrypt failed", {
      level: "warning",
      extra: { userId: candidate.user_id },
    });
    return "skipped";
  }

  try {
    await reconnectLinkedInAccountWithCookies(candidate.unipile_account_id, {
      accessToken: decrypted.li_at,
      premiumToken: decrypted.li_a,
      userAgent: decrypted.user_agent,
    });
    // Success — leave the row alone. The webhook will fire RECONNECTED and
    // flip status back to connected (storeUnipileAccount handles the reset
    // of reconnect_attempts_failed).
    return "reconnected";
  } catch (err) {
    await supabase
      .from("user_unipile_accounts")
      .update({
        reconnect_attempts_failed:
          (candidate.reconnect_attempts_failed ?? 0) + 1,
      } as never)
      .eq("user_id", candidate.user_id)
      .eq("account_type", "LINKEDIN");
    Sentry.captureMessage("[unipile reconcile] silent reconnect failed", {
      level: "warning",
      extra: {
        userId: candidate.user_id,
        accountId: candidate.unipile_account_id,
        type: err instanceof UnipileApiError ? err.unipileType : null,
        status: err instanceof UnipileApiError ? err.status : null,
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return "failed";
  }
}

export async function POST(req: Request) {
  const route = "api/cron/unipile-accounts-reconcile";
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      captureRouteError(route, new Error("CRON_SECRET not configured"), {
        extra: { step: "auth" },
      });
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (auth !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: rows, error: listError } = await supabase
      .from("user_unipile_accounts")
      .select("user_id, unipile_account_id, account_type, status, last_status_at")
      .order("last_status_at", { ascending: true, nullsFirst: true })
      .limit(MAX_ACCOUNTS_PER_TICK);

    if (listError) {
      captureRouteError(route, listError, { extra: { step: "list" } });
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    let reconciled = 0;
    let cleared = 0;
    let unchanged = 0;
    let errors = 0;
    let silentReconnects = 0;
    let silentReconnectFailures = 0;

    for (const row of rows ?? []) {
      if (!row.unipile_account_id) continue;
      const accountType =
        (row.account_type ?? "LINKEDIN").toUpperCase() === "WHATSAPP"
          ? ("WHATSAPP" as const)
          : ("LINKEDIN" as const);

      // (1) Silent reconnect path for credentials-errored LinkedIn rows.
      if (accountType === "LINKEDIN" && row.status === "error") {
        const outcome = await trySilentReconnect(supabase, row);
        if (outcome === "reconnected") {
          silentReconnects++;
          // Skip the normal reconcile this tick — the webhook is about to
          // arrive and will move the row out of 'error'. Next tick handles
          // the steady state.
          if (INTER_ACCOUNT_DELAY_MS > 0) await sleep(INTER_ACCOUNT_DELAY_MS);
          continue;
        }
        if (outcome === "failed") silentReconnectFailures++;
        // "skipped" / "failed" both fall through to the normal status fetch
        // so we still touch last_status_at and notice if Unipile reports the
        // account has moved on its own.
      }

      // (2) Standard status reconcile.
      try {
        const account = await unipileFetch<UnipileAccount>(
          `/accounts/${encodeURIComponent(row.unipile_account_id)}`
        );

        // Keep linkedin_member_id fresh from Unipile (replaces the old
        // extension-side Voyager scrape). Independent of status changes.
        if (accountType === "LINKEDIN") {
          await syncLinkedInMemberIdFromAccount(supabase, {
            userId: row.user_id,
            unipileAccount: account,
          });
        }

        const result = await reconcileUnipileAccountStatusFromAccount(
          supabase,
          {
            userId: row.user_id,
            accountType,
            unipileAccount: account,
          }
        );

        if (result?.changed) {
          reconciled++;
        } else {
          unchanged++;
          await supabase
            .from("user_unipile_accounts")
            .update({ last_status_at: new Date().toISOString() })
            .eq("user_id", row.user_id)
            .eq("account_type", accountType);
        }
      } catch (err) {
        if (isAccountGone(err)) {
          const { error: delErr } = await supabase
            .from("user_unipile_accounts")
            .delete()
            .eq("user_id", row.user_id)
            .eq("account_type", accountType);
          if (delErr) {
            console.error("[unipile reconcile] delete stale row:", delErr);
            Sentry.captureException(delErr);
            errors++;
          } else {
            cleared++;
          }
        } else {
          console.warn(
            "[unipile reconcile] fetch failed (transient):",
            err instanceof Error ? err.message : err
          );
          errors++;
        }
      }

      if (INTER_ACCOUNT_DELAY_MS > 0) {
        await sleep(INTER_ACCOUNT_DELAY_MS);
      }
    }

    return NextResponse.json({
      ok: true,
      checked: rows?.length ?? 0,
      reconciled,
      cleared,
      unchanged,
      errors,
      silentReconnects,
      silentReconnectFailures,
    });
  } catch (err) {
    captureRouteError(route, err, { extra: { step: "fatal" } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
