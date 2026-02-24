import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

/**
 * POST /api/booking/setup
 * Generate booking_slug for current user if null.
 * Requires auth.
 */
export async function POST(request: NextRequest) {
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
      .select("booking_slug")
      .eq("id", user.id)
      .single();

    if (profile?.booking_slug) {
      return NextResponse.json({ success: true, data: { booking_slug: profile.booking_slug } });
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
        .eq("booking_slug", slug)
        .single();
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: "Failed to generate unique slug" },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        booking_slug: slug,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[booking/setup] Update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to save booking slug" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { booking_slug: slug } });
  } catch (error) {
    console.error("[booking/setup] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
