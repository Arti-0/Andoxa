import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decodeGoogleOAuthState } from "@/lib/google/oauth-state";
import {
  exchangeAuthorizationCode,
  fetchGoogleUserInfoEmail,
} from "@/lib/google/exchange-authorization-code";
import { GOOGLE_BOOKING_SCOPES } from "@/lib/google/oauth-config";

function redirectResult(request: NextRequest, ok: boolean) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const path = ok
    ? "/settings?tab=integrations&google_connected=1"
    : "/settings?tab=integrations&google_connected=0";
  return NextResponse.redirect(new URL(path, base).toString());
}

/**
 * GET /api/google/callback — OAuth redirect handler.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err || !code || !state) {
    return redirectResult(request, false);
  }

  const decoded = decodeGoogleOAuthState(state);
  if (!decoded) {
    return redirectResult(request, false);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.id !== decoded.userId) {
    return redirectResult(request, false);
  }

  try {
    const tokens = await exchangeAuthorizationCode(code);
    const email = await fetchGoogleUserInfoEmail(tokens.access_token);
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase.from("user_google_tokens").upsert(
      {
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expiry: tokenExpiry,
        scope: tokens.scope ?? GOOGLE_BOOKING_SCOPES,
        google_account_email: email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      console.error("[google/callback] upsert", upsertError);
      return redirectResult(request, false);
    }
  } catch (e) {
    console.error("[google/callback]", e);
    return redirectResult(request, false);
  }

  return redirectResult(request, true);
}
