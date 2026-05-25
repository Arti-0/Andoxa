import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getDefaultSlotsForDateRange,
  excludeBookedSlots,
  type AvailabilityConfig,
} from "@/lib/booking/slots";
import {
  resolveMeetingDisplay,
  resolveAvailabilityDefaults,
} from "@/lib/booking/meeting-display";
import { orgHasActiveOnBookingWhatsAppWorkflow } from "@/lib/workflows/on-booking-whatsapp";
import { captureRouteError } from "@/lib/sentry/route-error";

/**
 * GET /api/booking/[slug]/slots
 * Public - returns available slots for the user identified by booking_slug.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const route = "api/booking/[slug]/slots";
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
      .select(
        "id, active_organization_id, metadata, full_name, email, avatar_url"
      )
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

    const meta = (profile as { metadata?: Record<string, unknown> | null }).metadata;
    const availability = (meta?.availability ?? {}) as AvailabilityConfig;
    const { daysAhead, minNoticeHours, slotMinutes } = resolveAvailabilityDefaults(meta);

    const from = new Date();
    const endRange = new Date(from);
    endRange.setDate(endRange.getDate() + daysAhead);

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("start_time, end_time")
      .eq("organization_id", orgId)
      .eq("created_by", profile.id)
      .gte("start_time", from.toISOString())
      .lte("end_time", endRange.toISOString());

    if (eventsError) {
      captureRouteError(route, eventsError, {
        extra: { slug, step: "events_fetch" },
      });
      return NextResponse.json(
        { success: false, error: "Failed to load availability" },
        { status: 500 }
      );
    }

    const allSlots = getDefaultSlotsForDateRange(from, {
      ...availability,
      slotMinutes,
      daysAhead,
      minNoticeHours,
    });
    const availableSlots = excludeBookedSlots(allSlots, events ?? []);

    const now = new Date();
    const earliestStart = new Date(now.getTime() + minNoticeHours * 3_600_000);
    const futureSlots = availableSlots.filter(
      (s) => new Date(s.start) > earliestStart
    );

    const hostName = profile.full_name ?? slug;
    const meeting = resolveMeetingDisplay(meta, hostName);

    const meetingType = {
      title: meeting.title,
      description: meeting.description,
      duration: meeting.duration,
      mode: meeting.mode,
    };

    const host = {
      name: hostName,
      role: meeting.role,
      avatar_url: profile.avatar_url ?? null,
    };

    const hasOnBookingWaWorkflow = await orgHasActiveOnBookingWhatsAppWorkflow(
      supabase,
      orgId
    );

    return NextResponse.json({
      success: true,
      data: {
        slots: futureSlots,
        host,
        meetingType,
        show_post_booking_wa_notice: meeting.showPostBookingWaNotice,
        has_on_booking_wa_workflow: hasOnBookingWaWorkflow,
      },
    });
  } catch (error) {
    captureRouteError(route, error, { extra: { step: "unhandled" } });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
