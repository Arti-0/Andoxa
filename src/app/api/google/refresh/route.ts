import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidGoogleAccessToken } from "@/lib/google/calendar";

/**
 * POST /api/google/refresh — refresh stored Google access token for the current user.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = await getValidGoogleAccessToken(supabase, user.id);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Aucun jeton Google ou rafraîchissement impossible" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: { ok: true } });
}
