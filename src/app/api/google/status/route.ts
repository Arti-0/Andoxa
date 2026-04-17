import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleClientId, isGoogleOAuthConfigured } from "@/lib/google/oauth-config";

/**
 * GET /api/google/status — whether the current user has Google Calendar connected.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isGoogleOAuthConfigured() || !getGoogleClientId()) {
    return NextResponse.json({
      success: true,
      data: { connected: false, email: null as string | null, configured: false },
    });
  }

  const { data: row } = await supabase
    .from("user_google_tokens")
    .select("access_token, token_expiry, google_account_email")
    .eq("user_id", user.id)
    .maybeSingle();

  const expiry = row?.token_expiry ? new Date(row.token_expiry).getTime() : 0;
  const hasToken = Boolean(row?.access_token);
  const connected = hasToken && (!expiry || expiry > Date.now());

  return NextResponse.json({
    success: true,
    data: {
      connected,
      email: row?.google_account_email ?? null,
      configured: true,
    },
  });
}
