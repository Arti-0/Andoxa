import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateAndNormalizeLinkedIn } from "@/lib/utils/linkedin";

/**
 * POST /api/booking/[slug]/book
 * Public - creates a booking (event) for the prospect.
 * Uses LinkedIn profile as primary contact (Andoxa is LinkedIn-first).
 */
export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const { slot_start, slot_end, guest_name, guest_linkedin } = body;

    if (
      typeof slot_start !== "string" ||
      typeof slot_end !== "string" ||
      typeof guest_name !== "string" ||
      typeof guest_linkedin !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "slot_start, slot_end, guest_name et profil LinkedIn sont requis" },
        { status: 400 }
      );
    }

    const name = guest_name.trim();
    const linkedin = validateAndNormalizeLinkedIn(guest_linkedin.trim());
    if (!name || !linkedin) {
      return NextResponse.json(
        { success: false, error: "Nom et profil LinkedIn (URL ou identifiant) sont requis" },
        { status: 400 }
      );
    }

    const slotStartDate = new Date(slot_start);
    const slotEndDate = new Date(slot_end);
    if (isNaN(slotStartDate.getTime()) || isNaN(slotEndDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid slot dates" },
        { status: 400 }
      );
    }

    if (slotStartDate >= slotEndDate) {
      return NextResponse.json(
        { success: false, error: "Invalid slot" },
        { status: 400 }
      );
    }

    if (slotStartDate < new Date()) {
      return NextResponse.json(
        { success: false, error: "Slot is in the past" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, active_organization_id")
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

    const { data: events } = await supabase
      .from("events")
      .select("id")
      .eq("organization_id", orgId)
      .eq("created_by", profile.id)
      .lt("start_time", slot_end)
      .gt("end_time", slot_start);

    if (events && events.length > 0) {
      return NextResponse.json(
        { success: false, error: "This slot is no longer available" },
        { status: 409 }
      );
    }

    let prospectId: string | null = null;

    const { data: prospectsWithLinkedin } = await supabase
      .from("prospects")
      .select("id, linkedin")
      .eq("organization_id", orgId)
      .eq("user_id", profile.id)
      .not("linkedin", "is", null);

    const existingProspect = (prospectsWithLinkedin ?? []).find((p) => {
      const normalized = validateAndNormalizeLinkedIn(p.linkedin);
      return normalized && normalized.toLowerCase() === linkedin.toLowerCase();
    });

    if (existingProspect) {
      prospectId = existingProspect.id;
    } else {
      const { data: newProspect, error: prospectError } = await supabase
        .from("prospects")
        .insert({
          organization_id: orgId,
          user_id: profile.id,
          full_name: name,
          linkedin,
          source: "booking",
        })
        .select("id")
        .single();

      if (prospectError) {
        console.error("[booking/book] Prospect create error:", prospectError);
        return NextResponse.json(
          { success: false, error: "Impossible de créer le prospect" },
          { status: 500 }
        );
      }
      prospectId = newProspect?.id ?? null;
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        organization_id: orgId,
        title: `RDV avec ${name}`,
        description: `Rendez-vous réservé via le lien de prise de RDV.\n\nInvité : ${name}\nLinkedIn : ${linkedin}`,
        start_time: slot_start,
        end_time: slot_end,
        prospect_id: prospectId,
        created_by: profile.id,
        is_all_day: false,
        source: "booking",
        guest_name: name,
        guest_linkedin: linkedin,
      })
      .select("id, start_time, end_time, title")
      .single();

    if (eventError) {
      console.error("[booking/book] Event create error:", eventError);
      return NextResponse.json(
        { success: false, error: "Failed to create booking" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: event?.id,
        start_time: event?.start_time,
        end_time: event?.end_time,
        title: event?.title,
      },
    });
  } catch (error) {
    console.error("[booking/book] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
