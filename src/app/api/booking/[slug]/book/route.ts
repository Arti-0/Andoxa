import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateAndNormalizeLinkedIn } from "@/lib/utils/linkedin";
import { getValidGoogleAccessToken, createGoogleMeetEvent } from "@/lib/google/calendar";
import { sendBookingOwnerConfirmationEmail } from "@/lib/email/send-booking-owner-confirmation";
import { sendBookingGuestConfirmationEmail } from "@/lib/email/send-booking-guest-confirmation";

function looksLikeEmail(s: string): boolean {
  const t = s.trim();
  if (t.length > 254 || !t.includes("@")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

/**
 * POST /api/booking/[slug]/book
 * Public - creates a booking (event) for the prospect.
 * Optionally creates a Google Meet link and emails the host and guest (Resend).
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
    const { slot_start, slot_end, guest_name, guest_email, guest_linkedin, guest_phone } = body;

    if (
      typeof slot_start !== "string" ||
      typeof slot_end !== "string" ||
      typeof guest_name !== "string" ||
      typeof guest_email !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "slot_start, slot_end, nom et adresse e-mail sont requis",
        },
        { status: 400 }
      );
    }

    if (guest_linkedin !== null && guest_linkedin !== undefined && typeof guest_linkedin !== "string") {
      return NextResponse.json(
        { success: false, error: "Format du profil LinkedIn invalide" },
        { status: 400 }
      );
    }
    if (guest_phone !== null && guest_phone !== undefined && typeof guest_phone !== "string") {
      return NextResponse.json(
        { success: false, error: "Format du numéro de téléphone invalide" },
        { status: 400 }
      );
    }

    const name = guest_name.trim();
    const email = guest_email.trim();
    const linkedinRaw = typeof guest_linkedin === "string" ? guest_linkedin.trim() : "";
    const phone = typeof guest_phone === "string" ? guest_phone.trim() : "";

    if (!name || !email || !looksLikeEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Nom et adresse e-mail valides sont requis" },
        { status: 400 }
      );
    }

    const linkedin = linkedinRaw ? validateAndNormalizeLinkedIn(linkedinRaw) : null;
    if (linkedinRaw && !linkedin) {
      return NextResponse.json(
        { success: false, error: "Adresse ou identifiant LinkedIn invalide" },
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
      .select("id, full_name, active_organization_id, email")
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

    if (linkedin) {
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
            email,
            linkedin,
            phone: phone || null,
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
    } else {
      const { data: existingByEmail } = await supabase
        .from("prospects")
        .select("id")
        .eq("organization_id", orgId)
        .eq("user_id", profile.id)
        .ilike("email", email)
        .maybeSingle();

      if (existingByEmail?.id) {
        prospectId = existingByEmail.id;
      } else {
        const { data: newProspect, error: prospectError } = await supabase
          .from("prospects")
          .insert({
            organization_id: orgId,
            user_id: profile.id,
            full_name: name,
            email,
            linkedin: null,
            phone: phone || null,
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
    }

    const descriptionLines = [
      "Rendez-vous réservé via le lien de prise de RDV.",
      "",
      `Invité : ${name}`,
      `E-mail : ${email}`,
    ];
    if (linkedin) descriptionLines.push(`LinkedIn : ${linkedin}`);
    if (phone) descriptionLines.push(`Téléphone : ${phone}`);
    const description = descriptionLines.join("\n");

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        organization_id: orgId,
        title: `RDV avec ${name}`,
        description,
        start_time: slot_start,
        end_time: slot_end,
        prospect_id: prospectId,
        created_by: profile.id,
        is_all_day: false,
        source: "booking",
        guest_name: name,
        guest_email: email,
        guest_linkedin: linkedin,
        guest_phone: phone || null,
      })
      .select("id, start_time, end_time, title")
      .single();

    if (eventError || !event?.id) {
      console.error("[booking/book] Event create error:", eventError);
      return NextResponse.json(
        { success: false, error: "Failed to create booking" },
        { status: 500 }
      );
    }

    const eventId = event.id;
    let meetUrl: string | null = null;
    let googleEventId: string | null = null;

    try {
      const accessToken = await getValidGoogleAccessToken(supabase, profile.id);
      if (accessToken) {
        const ownerEmail = profile.email?.trim();
        const attendeeRaw = [ownerEmail, email].filter(
          (e): e is string => !!e && e.includes("@")
        );
        const seen = new Set<string>();
        const uniqueAttendees: string[] = [];
        for (const e of attendeeRaw) {
          const low = e.toLowerCase();
          if (!seen.has(low)) {
            seen.add(low);
            uniqueAttendees.push(e);
          }
        }

        const cal = await createGoogleMeetEvent(accessToken, {
          summary: `RDV Andoxa — ${name}`,
          description,
          startIso: slot_start,
          endIso: slot_end,
          attendeeEmails: uniqueAttendees.length > 0 ? uniqueAttendees : undefined,
        });
        meetUrl = cal.meetUrl;
        googleEventId = cal.eventId || null;
        await supabase
          .from("events")
          .update({
            google_meet_url: meetUrl,
            google_event_id: googleEventId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", eventId);
      }
    } catch (e) {
      console.warn("[booking/book] Google Meet non généré (continuation sans lien):", e);
    }

    const appBase = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const crmProspectUrl =
      prospectId && appBase ? `${appBase}/prospect/${prospectId}` : null;

    let confirmationSent = false;
    const ownerEmail = profile.email?.trim();
    if (ownerEmail && ownerEmail.includes("@")) {
      try {
        confirmationSent = await sendBookingOwnerConfirmationEmail({
          to: ownerEmail,
          guestName: name,
          guestEmail: email,
          guestLinkedin: linkedin,
          guestPhone: phone || null,
          slotStartIso: slot_start,
          slotEndIso: slot_end,
          meetUrl,
          crmProspectUrl,
        });
      } catch (e) {
        console.error("[booking/book] Confirmation email error:", e);
      }
    }

    if (confirmationSent) {
      await supabase
        .from("events")
        .update({
          confirmation_email_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    }

    try {
      await sendBookingGuestConfirmationEmail({
        to: email,
        hostName: profile.full_name?.trim() || ownerEmail || "Votre hôte",
        slotStartIso: slot_start,
        slotEndIso: slot_end,
        meetUrl,
      });
    } catch (e) {
      console.error("[booking/book] Guest confirmation email error:", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
        start_time: event.start_time,
        end_time: event.end_time,
        title: event.title,
        google_meet_url: meetUrl,
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
