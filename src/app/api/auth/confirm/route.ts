import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { redeemOrganizationInvitation } from "@/lib/invitations/redeem-invite";
import type { Database } from "@/lib/types/supabase";

export const runtime = "nodejs";

type CookieOptions = Parameters<NextResponse["cookies"]["set"]>[2];

const INVITE_TOKEN_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function maybeRedirectAfterFailedInviteRedeem(
  supabase: SupabaseClient<Database>,
  baseUrl: string,
  inviteToken: string | null
): Promise<URL | null> {
  if (!inviteToken) return null;
  if (!INVITE_TOKEN_UUID_RE.test(inviteToken)) {
    return new URL(
      `/auth/login?error=${encodeURIComponent("invite_failed")}`,
      baseUrl
    );
  }
  const { result, rpcError } = await redeemOrganizationInvitation(
    supabase,
    inviteToken
  );
  if (rpcError || !result.success) {
    return new URL(
      `/auth/login?error=${encodeURIComponent("invite_failed")}`,
      baseUrl
    );
  }
  return null;
}

function getRedirectBase(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto === "https" ? "https" : "http"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

/**
 * GET /api/auth/confirm
 * Completes email invite / magic-link: sets session cookies then redirects to `next` (default password setup).
 */
export async function GET(request: NextRequest) {
  const baseUrl = getRedirectBase(request);
  const { searchParams } = new URL(request.url);
  const nextRaw = searchParams.get("next") ?? "/auth/update-password";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/auth/update-password";

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const inviteToken = searchParams.get("invite_token");

  let response = NextResponse.redirect(new URL(next, baseUrl));

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.redirect(new URL(next, baseUrl));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(error.message)}`,
          baseUrl
        )
      );
    }
    const inviteFail = await maybeRedirectAfterFailedInviteRedeem(
      supabase as unknown as SupabaseClient<Database>,
      baseUrl,
      inviteToken
    );
    if (inviteFail) return NextResponse.redirect(inviteFail);
    return response;
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(error.message)}`,
          baseUrl
        )
      );
    }
    const inviteFailOtp = await maybeRedirectAfterFailedInviteRedeem(
      supabase as unknown as SupabaseClient<Database>,
      baseUrl,
      inviteToken
    );
    if (inviteFailOtp) return NextResponse.redirect(inviteFailOtp);
    return response;
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=missing_confirmation", baseUrl)
  );
}
