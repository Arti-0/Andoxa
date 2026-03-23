import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getDefaultSlotsForDateRange,
  excludeBookedSlots,
  type AvailabilityConfig,
} from "@/lib/booking/slots";

/**
 * GET /api/booking/[slug]/slots
 * Public - returns available slots for the user identified by booking_slug.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid slug" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, active_organization_id, metadata")
      .eq("booking_slug", slug)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "Booking link not found" },
        { status: 404 }
      );
    }

    const orgId = profile.active_organization_id;
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "User has no organization" },
        { status: 404 }
      );
    }

    const from = new Date();
    const endRange = new Date(from);
    endRange.setDate(endRange.getDate() + 14);

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("start_time, end_time")
      .eq("organization_id", orgId)
      .eq("created_by", profile.id)
      .gte("start_time", from.toISOString())
      .lte("end_time", endRange.toISOString());

    if (eventsError) {
      console.error("[booking/slots] Events fetch error:", eventsError);
      return NextResponse.json(
        { success: false, error: "Failed to load availability" },
        { status: 500 }
      );
    }

    const meta = (profile as { metadata?: Record<string, unknown> | null }).metadata;
    const availability = (meta?.availability ?? {}) as AvailabilityConfig;

    const allSlots = getDefaultSlotsForDateRange(from, availability);
    const availableSlots = excludeBookedSlots(allSlots, events ?? []);

    const now = new Date();
    const futureSlots = availableSlots.filter(
      (s) => new Date(s.start) > now
    );

    return NextResponse.json({
      success: true,
      data: { slots: futureSlots },
    });
  } catch (error) {
    console.error("[booking/slots] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
