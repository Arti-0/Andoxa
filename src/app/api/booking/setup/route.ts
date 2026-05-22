import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

/**
 * POST /api/booking/setup
 * Generate booking_slug + booking_public_path for current user if null.
 * Requires auth.
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("booking_slug, booking_public_path")
      .eq("id", user.id)
      .single();

    if (profile?.booking_slug && profile?.booking_public_path) {
      return NextResponse.json({
        success: true,
        data: {
          booking_slug: profile.booking_slug,
          booking_public_path: profile.booking_public_path,
        },
      });
    }

    // Generate unique 8-char slug (hex)
    let slug: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      slug = randomBytes(4).toString("hex");
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .or(`booking_slug.eq.${slug},booking_public_path.eq.${slug}`)
        .maybeSingle();
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: "Failed to generate unique slug" },
        { status: 500 },
      );
    }

    const publicPath = profile?.booking_public_path ?? slug;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        booking_slug: profile?.booking_slug ?? slug,
        booking_public_path: publicPath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[booking/setup] Update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to save booking slug" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { booking_slug: profile?.booking_slug ?? slug, booking_public_path: publicPath },
    });
  } catch (error) {
    console.error("[booking/setup] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
