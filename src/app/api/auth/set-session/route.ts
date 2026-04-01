import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { ONBOARDING_PROFILE_STEP } from "@/app/onboarding/config";
import { redeemInvitation } from "@/lib/invitations";
import type { Database } from "@/lib/types/supabase";

export const runtime = "nodejs";

type CookieOptions = Parameters<NextResponse["cookies"]["set"]>[2];

function jsonPreservingSessionCookies(
  from: NextResponse,
  data: unknown,
  init?: ResponseInit
): NextResponse {
  const out = NextResponse.json(data, init);
  for (const line of from.headers.getSetCookie?.() ?? []) {
    out.headers.append("Set-Cookie", line);
  }
  return out;
}

function logCookieCarrierBeforeCopy(cookieCarrier: NextResponse) {
  console.log(
    "[set-session] cookieCarrier cookies:",
    cookieCarrier.cookies.getAll()
  );
  console.log(
    "[set-session] cookieCarrier Set-Cookie headers:",
    cookieCarrier.headers.getSetCookie?.() ?? []
  );
}

const INVITE_TOKEN_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/auth/set-session
 * Pose la session Supabase côté serveur (cookies) à partir des jetons fournis,
 * optionnellement redeem une invitation org. Évite setSession côté navigateur (AbortError).
 */
export async function POST(request: NextRequest) {
  const cookieCarrier = NextResponse.json({});

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Configuration Supabase manquante." },
      { status: 500 }
    );
  }

  let body: {
    access_token?: string;
    refresh_token?: string;
    invite_token?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps JSON invalide." },
      { status: 400 }
    );
  }

  const access_token = body.access_token?.trim();
  const refresh_token = body.refresh_token?.trim();
  const invite_token = body.invite_token?.trim() ?? null;

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { error: "Tokens manquants." },
      { status: 400 }
    );
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: CookieOptions;
        }>
      ) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieCarrier.cookies.set(name, value, options)
        );
      },
    },
  });

  const sb = supabase as unknown as SupabaseClient<Database>;

  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (sessionError) {
    return NextResponse.json(
      { error: "Session invalide : " + sessionError.message },
      { status: 401 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Utilisateur introuvable." },
      { status: 401 }
    );
  }

  const userEmail = user.email ?? "";

  if (invite_token) {
    if (!INVITE_TOKEN_UUID_RE.test(invite_token)) {
      return NextResponse.json(
        { error: "Token d'invitation invalide." },
        { status: 400 }
      );
    }
    const result = await redeemInvitation(sb, invite_token, user);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { error: updateError } = await sb
      .from("profiles")
      .update({
        onboarding_step: ONBOARDING_PROFILE_STEP.INVITED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    console.log("[set-session] onboarding_step update error:", updateError);

    logCookieCarrierBeforeCopy(cookieCarrier);
    return jsonPreservingSessionCookies(cookieCarrier, {
      success: true,
      redirect: `/auth/login?mode=set-password&email=${encodeURIComponent(userEmail)}&next=/onboarding`,
    });
  }

  logCookieCarrierBeforeCopy(cookieCarrier);
  return jsonPreservingSessionCookies(cookieCarrier, {
    success: true,
    redirect: "/dashboard",
  });
}
