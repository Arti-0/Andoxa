import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGoogleClientId,
  getGoogleRedirectUri,
  isGoogleOAuthConfigured,
  GOOGLE_BOOKING_SCOPES,
} from "@/lib/google/oauth-config";
import { encodeGoogleOAuthState } from "@/lib/google/oauth-state";

/**
 * GET /api/google/auth — start Google OAuth (Calendar + Meet for bookings).
 */
export async function GET(_request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: "Google Calendar n'est pas configuré sur ce serveur." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const clientId = getGoogleClientId();
  const redirectUri = getGoogleRedirectUri();
  const state = encodeGoogleOAuthState(user.id);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_BOOKING_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}

/**
 * DELETE /api/google/auth — disconnect Google Calendar (remove stored tokens).
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("user_google_tokens").delete().eq("user_id", user.id);
  if (error) {
    console.error("[google/auth DELETE]", error);
    return NextResponse.json({ success: false, error: "Suppression impossible" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
