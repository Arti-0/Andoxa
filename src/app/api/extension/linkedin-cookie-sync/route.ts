/**
 * POST /api/extension/linkedin-cookie-sync
 *
 * Receives LinkedIn cookies (li_at + optional li_a + user agent) captured by
 * the Andoxa browser extension while the user is on linkedin.com. Stores
 * them encrypted on `user_unipile_accounts.cookie_payload` so the
 * `unipile-accounts-reconcile` cron can silently reconnect the account on
 * ACCOUNT_CREDENTIALS without prompting the user.
 *
 * Race rule (matches plan): Hosted Auth always wins create. If the user has
 * no LINKEDIN row yet, we 412 — the extension backs off for 24h. Silent
 * first-connect via Unipile Custom Auth is a future iteration.
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";

import type { Database } from "@/lib/types/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import {
  encryptCookiePayload,
  isCookieEncryptionAvailable,
} from "@/lib/crypto/cookie-cipher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CookieSyncBody {
  li_at?: string;
  li_a?: string | null;
  user_agent?: string;
  linkedin_member_id?: string | null;
}

interface ErrorPayload {
  code: string;
  message: string;
}

function errorResponse(status: number, payload: ErrorPayload): Response {
  return new Response(
    JSON.stringify({ success: false, error: payload }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

function getBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

export async function POST(req: NextRequest): Promise<Response> {
  // Disabled in dev when no key is configured — extension backs off silently.
  if (!isCookieEncryptionAvailable()) {
    return errorResponse(503, {
      code: "COOKIE_ENCRYPTION_DISABLED",
      message: "Cookie sync indisponible sur ce déploiement.",
    });
  }

  const token = getBearer(req);
  if (!token) {
    return errorResponse(401, {
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    });
  }

  const userScoped = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data: authData, error: authError } = await userScoped.auth.getUser(token);
  if (authError || !authData?.user) {
    return errorResponse(401, {
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    });
  }
  const userId = authData.user.id;

  // Per-user limit: extension debounces to ~once an hour, this is the
  // backstop for misbehaving installs.
  const rl = await checkRateLimit(
    userId,
    "extension-linkedin-cookie-sync",
    12,
    "1 h"
  );
  if (rl && !rl.success) {
    return errorResponse(429, {
      code: "RATE_LIMITED",
      message: "Trop de synchronisations de cookie. Réessayez plus tard.",
    });
  }

  let body: CookieSyncBody;
  try {
    body = (await req.json()) as CookieSyncBody;
  } catch {
    return errorResponse(400, {
      code: "INVALID_BODY",
      message: "Invalid JSON",
    });
  }

  const liAt = body.li_at?.trim();
  if (!liAt) {
    return errorResponse(400, {
      code: "MISSING_LI_AT",
      message: "li_at requis",
    });
  }
  // li_a is optional (free LinkedIn accounts don't have it). Treat empty as null.
  const liA = body.li_a?.trim() ? body.li_a.trim() : null;
  const userAgent = body.user_agent?.trim() ?? "";
  if (!userAgent) {
    return errorResponse(400, {
      code: "MISSING_USER_AGENT",
      message: "user_agent requis",
    });
  }
  const memberId = body.linkedin_member_id?.toString().trim() || null;

  // Look up the existing LINKEDIN row. Use the service client so the
  // column-level revoke on cookie_payload doesn't trip the read of other
  // columns (we don't select cookie_payload here anyway).
  const service = createServiceClient();
  const { data: row, error: rowErr } = await service
    .from("user_unipile_accounts")
    .select("unipile_account_id, linkedin_member_id, status")
    .eq("user_id", userId)
    .eq("account_type", "LINKEDIN")
    .maybeSingle();

  if (rowErr) {
    Sentry.captureException(rowErr);
    return errorResponse(500, {
      code: "DB_ERROR",
      message: "Erreur interne",
    });
  }

  if (!row?.unipile_account_id) {
    // Hosted Auth must run first. Extension persists a noLinkedInAccount flag
    // and stops pushing for 24h to avoid hammering the backend.
    return errorResponse(412, {
      code: "NO_LINKEDIN_ACCOUNT",
      message: "Aucun compte LinkedIn connecté.",
    });
  }

  // Account-switching detection (best-effort): if we previously stored a
  // member_id and the new one differs, flag it but still update — the cookies
  // belong to whatever LinkedIn account is currently logged in, and the next
  // status webhook will surface any underlying account mismatch.
  if (
    memberId &&
    row.linkedin_member_id &&
    row.linkedin_member_id !== memberId
  ) {
    Sentry.captureMessage(
      "[cookie-sync] linkedin_member_id changed",
      {
        level: "warning",
        extra: {
          userId,
          previous: row.linkedin_member_id,
          incoming: memberId,
        },
      }
    );
  }

  const payload = encryptCookiePayload(
    { li_at: liAt, li_a: liA, user_agent: userAgent },
    { userId, unipileAccountId: row.unipile_account_id }
  );

  const { error: upErr } = await service
    .from("user_unipile_accounts")
    .update({
      // jsonb column; the generated type may not include the new columns yet
      // until SCHEMA.md is regenerated — cast at the row level.
      cookie_payload: payload,
      linkedin_member_id: memberId ?? row.linkedin_member_id ?? null,
      date_last_cookie: new Date().toISOString(),
      // Fresh cookies → reset the silent-reconnect failure counter so the
      // cron retries with the new material.
      reconnect_attempts_failed: 0,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("user_id", userId)
    .eq("account_type", "LINKEDIN");

  if (upErr) {
    Sentry.captureException(upErr);
    return errorResponse(500, {
      code: "DB_ERROR",
      message: "Erreur interne",
    });
  }

  return new Response(
    JSON.stringify({ success: true, data: { stored: true } }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
