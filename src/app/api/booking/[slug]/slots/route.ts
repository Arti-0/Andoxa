import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getDefaultSlotsForDateRange,
  excludeBookedSlots,
  type AvailabilityConfig,
} from "@/lib/booking/slots";
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
      captureRouteError(route, eventsError, {
        extra: { slug, step: "events_fetch" },
      });
      return NextResponse.json(
        { success: false, error: "Failed to load availability" },
        { status: 500 }
      );
    }

    const meta = (profile as { metadata?: Record<string, unknown> | null }).metadata;
    const availability = (meta?.availability ?? {}) as AvailabilityConfig;

    const allSlots = getDefaultSlotsForDateRange(from, availability);
    const availableSlots = excludeBookedSlots(allSlots, events ?? []);

    // Booking window / minimum notice — defaults to 4h so a prospect can't
    // book a slot that's about to start. Set `availability.minNoticeHours = 0`
    // explicitly to disable. The "fenêtre de réservation" setting in the
    // personnaliser modal writes here.
    const minNoticeHours =
      typeof availability.minNoticeHours === "number" && availability.minNoticeHours >= 0
        ? availability.minNoticeHours
        : 4;
    const now = new Date();
    const earliestStart = new Date(now.getTime() + minNoticeHours * 3_600_000);
    const futureSlots = availableSlots.filter(
      (s) => new Date(s.start) > earliestStart
    );

    // Meeting type — the personnaliser modal saves into `meta.booking.{title,
    // description}` via /api/booking/settings. The legacy path was
    // `meta.meetingType.*` and we still read it as a fallback for older
    // accounts (and for fields the new modal doesn't expose, like `mode`/
    // `role`).
    type MeetingTypeMeta = {
      title?: string;
      description?: string;
      duration?: number;
      mode?: string;
      role?: string;
    };
    const mt = (meta?.meetingType ?? {}) as MeetingTypeMeta;
    const booking = (meta?.booking ?? {}) as { title?: string; description?: string };
    const slotMinutes =
      typeof availability.slotMinutes === "number" ? availability.slotMinutes : 30;

    const meetingType = {
      title: booking.title ?? mt.title ?? "Échange découverte",
      description:
        booking.description ??
        mt.description ??
        "Un premier échange pour faire connaissance et voir comment je peux vous aider.",
      duration: mt.duration ?? slotMinutes,
      mode: mt.mode ?? "Visioconférence",
    };

    const host = {
      name: profile.full_name ?? slug,
      role: mt.role ?? "",
      avatar_url: profile.avatar_url ?? null,
    };

    return NextResponse.json({
      success: true,
      data: { slots: futureSlots, host, meetingType },
    });
  } catch (error) {
    captureRouteError(route, error, { extra: { step: "unhandled" } });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
