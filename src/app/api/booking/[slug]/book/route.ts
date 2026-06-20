import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateAndNormalizeLinkedIn } from "@/lib/utils/linkedin";
import { sendBookingOwnerConfirmationEmail } from "@/lib/email/send-booking-owner-confirmation";
import { sendBookingGuestConfirmationEmail } from "@/lib/email/send-booking-guest-confirmation";
import { captureRouteError } from "@/lib/sentry/route-error";
import { afterRdvCreated } from "@/lib/events/after-rdv-created";
import { createRdvCalendarEvent } from "@/lib/events/create-rdv-event";
import { normalizePhoneForWhatsApp } from "@/lib/utils/phone";
import { buildBookingInviteIcs } from "@/lib/booking/build-booking-invite-ics";
import { resolveMeetingDisplay, resolveAvailabilityDefaults } from "@/lib/booking/meeting-display";
import { validateBookingSlotRequest } from "@/lib/booking/validate-booking-slot";
import { resolveProspectMatch } from "@/lib/prospects/dedup-keys";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import type { AvailabilityConfig } from "@/lib/booking/slots";

function looksLikeEmail(s: string): boolean {
  const t = s.trim();
  if (t.length > 254 || !t.includes("@")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function guestPhoneLooksValid(normalizedDigits: string): boolean {
  return normalizedDigits.length >= 10;
}

/**
 * POST /api/booking/[slug]/book
 * Public - creates a booking (event) for the prospect.
 * Optionally creates a Google Meet link and notifies host + guest (email and/or WhatsApp).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Public + unauthenticated; each call can create a prospect, an event, send
    // emails and a calendar invite. Rate-limit by IP to cap abuse. Window is
    // generous so legit guests behind shared NAT aren't blocked; fails open if
    // Upstash is unconfigured.
    const rl = await checkRateLimit(getClientIp(request), "booking-public", 10, "1 m");
    if (rl && !rl.success) {
      return NextResponse.json(
        { success: false, error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    const { slug } = await params;
    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid slug" },
        { status: 400 }
      );
    }

    const route = "api/booking/[slug]/book";

    const body = await request.json().catch(() => ({}));
    const { slot_start, slot_end, guest_name, guest_email, guest_linkedin, guest_phone } = body;

    if (
      typeof slot_start !== "string" ||
      typeof slot_end !== "string" ||
      typeof guest_name !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "slot_start, slot_end et nom sont requis",
        },
        { status: 400 }
      );
    }

    if (
      guest_email !== undefined &&
      guest_email !== null &&
      typeof guest_email !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Format de l’adresse e-mail invalide" },
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
    const emailRaw =
      typeof guest_email === "string" ? guest_email.trim() : "";
    const linkedinRaw = typeof guest_linkedin === "string" ? guest_linkedin.trim() : "";
    const phoneRaw = typeof guest_phone === "string" ? guest_phone.trim() : "";
    const normalizedPhone = phoneRaw ? normalizePhoneForWhatsApp(phoneRaw) : "";

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Le nom est requis" },
        { status: 400 }
      );
    }

    if (emailRaw.length > 0 && !looksLikeEmail(emailRaw)) {
      return NextResponse.json(
        { success: false, error: "Adresse e-mail invalide" },
        { status: 400 }
      );
    }

    if (phoneRaw.length > 0 && !guestPhoneLooksValid(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: "Numéro de téléphone invalide" },
        { status: 400 }
      );
    }

    const hasEmail = emailRaw.length > 0 && looksLikeEmail(emailRaw);
    // Phone is purely optional — we just store it. It never gates the booking
    // and triggers nothing on its own (the post-RDV WhatsApp, when enabled, is
    // driven by an active on-booking WhatsApp workflow, not by this field).
    const hasPhone = phoneRaw.length > 0 && guestPhoneLooksValid(normalizedPhone);

    if (!hasEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Indiquez votre adresse e-mail pour recevoir l'invitation.",
        },
        { status: 400 }
      );
    }

    const emailForDb = hasEmail ? emailRaw : null;
    const phoneForDb = hasPhone ? phoneRaw : null;

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
      .select("id, full_name, active_organization_id, email, metadata")
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

    const meta = (profile.metadata ?? {}) as Record<string, unknown>;
    const availability = (meta.availability ?? {}) as AvailabilityConfig;
    const hostName = profile.full_name?.trim() || "Hôte";
    const meeting = resolveMeetingDisplay(meta, hostName);
    const eventTitle = meeting.title;

    const { daysAhead } = resolveAvailabilityDefaults(meta);
    const from = new Date();
    const endRange = new Date(from);
    endRange.setDate(endRange.getDate() + daysAhead);

    const { data: bookedEvents } = await supabase
      .from("events")
      .select("start_time, end_time")
      .eq("organization_id", orgId)
      .eq("created_by", profile.id)
      .gte("start_time", from.toISOString())
      .lte("end_time", endRange.toISOString());

    const slotCheck = validateBookingSlotRequest(
      slot_start,
      slot_end,
      availability,
      bookedEvents ?? []
    );
    if (!slotCheck.ok) {
      return NextResponse.json(
        { success: false, error: slotCheck.error },
        { status: slotCheck.error === "This slot is no longer available" ? 409 : 400 }
      );
    }

    // ── Prospect dedup + additive merge ────────────────────────────────────
    // Order of precedence: LinkedIn URL (most specific) → email → normalized
    // phone. On a hit, we UPDATE the existing row by filling NULL fields with
    // the values the guest just provided (additive merge — never overwrite
    // existing data). On no match, INSERT a new booking-source prospect.
    // Failures here are fatal: a missing prospect_id is a data-integrity bug
    // for downstream workflows + activity logs, so we 500 the whole booking.
    let prospectId: string | null = null;

    // Pull all candidate matches in one query so we can compare in JS without
    // multiple round-trips. Restrict to this user's prospects (same scope as
    // before).
    const orFilters: string[] = [];
    if (linkedin) orFilters.push(`linkedin.not.is.null`);
    if (hasEmail) orFilters.push(`email.ilike.${emailRaw}`);
    if (hasPhone) orFilters.push(`phone.not.is.null`);

    let candidates: Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      linkedin: string | null;
      phone: string | null;
    }> = [];
    if (orFilters.length > 0) {
      const { data, error: lookupErr } = await supabase
        .from("prospects")
        .select("id, full_name, email, linkedin, phone")
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .or(orFilters.join(","));
      if (lookupErr) {
        // Dedup failure is fatal — without it we might silently create dupes.
        captureRouteError(route, lookupErr, {
          extra: { slug, step: "prospect_dedup_lookup" },
        });
        return NextResponse.json(
          { success: false, error: "Impossible de vérifier les doublons" },
          { status: 500 }
        );
      }
      candidates = data ?? [];
    }

    const match = resolveProspectMatch(candidates, {
      linkedin,
      email: hasEmail ? emailRaw : null,
      phone: hasPhone ? phoneRaw : null,
      normalizedPhone: hasPhone ? normalizedPhone : undefined,
    });

    if (match) {
      // Additive merge — only set fields the existing row doesn't have.
      const merge: {
        full_name?: string;
        email?: string;
        linkedin?: string;
        phone?: string;
      } = {};
      if (!match.full_name && name) merge.full_name = name;
      if (!match.email && emailForDb) merge.email = emailForDb;
      if (!match.linkedin && linkedin) merge.linkedin = linkedin;
      if (!match.phone && phoneForDb) merge.phone = phoneForDb;
      if (Object.keys(merge).length > 0) {
        const { error: mergeErr } = await supabase
          .from("prospects")
          .update(merge)
          .eq("id", match.id)
          .eq("organization_id", orgId);
        if (mergeErr) {
          // Non-fatal: we still have a valid prospect_id; log so we notice.
          captureRouteError(route, mergeErr, {
            extra: { slug, step: "prospect_merge", prospectId: match.id },
          });
        }
      }
      prospectId = match.id;
    } else {
      const { data: newProspect, error: prospectError } = await supabase
        .from("prospects")
        .insert({
          organization_id: orgId,
          user_id: profile.id,
          full_name: name,
          email: emailForDb,
          linkedin: linkedin || null,
          phone: phoneForDb,
          source: "booking",
        })
        .select("id")
        .single();

      if (prospectError || !newProspect?.id) {
        captureRouteError(route, prospectError ?? new Error("missing_id"), {
          extra: { slug, step: "prospect_create_after_dedup" },
        });
        return NextResponse.json(
          { success: false, error: "Impossible de créer le prospect" },
          { status: 500 }
        );
      }
      prospectId = newProspect.id;
    }

    if (!prospectId) {
      // Belt-and-suspenders: every branch above sets prospectId or returns 500.
      // Reaching this means a logic bug — fail loudly instead of writing a
      // booking with a null prospect link.
      captureRouteError(route, new Error("prospect_id_resolution_failed"), {
        extra: { slug, step: "prospect_resolution_guard" },
      });
      return NextResponse.json(
        { success: false, error: "Erreur d'identification du prospect" },
        { status: 500 }
      );
    }

    let eventId: string;
    let meetUrl: string | null = null;
    let googleEventId: string | null = null;
    let description: string;

    try {
      const created = await createRdvCalendarEvent(supabase, {
        organizationId: orgId,
        userId: profile.id,
        ownerEmail: profile.email?.trim() ?? null,
        title: eventTitle,
        hostDescription: meeting.description,
        guestName: name,
        guestEmail: emailForDb,
        guestLinkedin: linkedin,
        guestPhone: phoneForDb,
        startIso: slot_start,
        endIso: slot_end,
        prospectId,
        source: "booking",
        withGoogleMeet: true,
      });
      eventId = created.eventId;
      meetUrl = created.meetUrl;
      googleEventId = created.googleEventId;
      description = created.description;
    } catch (eventError) {
      captureRouteError(route, eventError ?? new Error("missing_event_id"), {
        extra: { slug, step: "event_create" },
      });
      return NextResponse.json(
        { success: false, error: "Failed to create booking" },
        { status: 500 }
      );
    }

    const { data: event } = await supabase
      .from("events")
      .select("id, start_time, end_time, title")
      .eq("id", eventId)
      .single();

    if (!event?.id) {
      return NextResponse.json(
        { success: false, error: "Failed to create booking" },
        { status: 500 }
      );
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
          guestEmail: emailForDb,
          guestLinkedin: linkedin,
          guestPhone: phoneForDb,
          slotStartIso: slot_start,
          slotEndIso: slot_end,
          meetUrl,
          crmProspectUrl,
        });
      } catch (e) {
        captureRouteError(route, e, {
          extra: { slug, step: "owner_confirmation_email", eventId },
        });
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

    const googleCalendarInviteSent = Boolean(googleEventId && hasEmail);

    // When Google Calendar sent the invite, skip the custom guest email — it
    // would duplicate and show less detail (no attendees, truncated body).
    if (hasEmail && !googleCalendarInviteSent) {
      try {
        const host =
          process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "").split("/")[0] ??
          "andoxa.app";
        const hostDisplay = profile.full_name?.trim() || ownerEmail || "Hôte";
        const fallbackDescription = description;
        const guestIcs = buildBookingInviteIcs({
          uid: `${eventId}@${host}`,
          startUtc: slotStartDate,
          endUtc: slotEndDate,
          summary: eventTitle,
          description: fallbackDescription,
          organizerName: hostDisplay,
          organizerEmail: ownerEmail && ownerEmail.includes("@") ? ownerEmail : null,
        });
        await sendBookingGuestConfirmationEmail({
          to: emailRaw,
          hostName: profile.full_name?.trim() || ownerEmail || "Votre hôte",
          slotStartIso: slot_start,
          slotEndIso: slot_end,
          meetUrl,
          description: fallbackDescription,
          icsInvitation: guestIcs,
        });
      } catch (e) {
        captureRouteError(route, e, {
          extra: { slug, step: "guest_confirmation_email", eventId },
        });
      }
    }

    const ownerName = profile.full_name?.trim() || "vous";
    await afterRdvCreated(supabase, {
      organizationId: orgId,
      eventId,
      prospectId,
      hostUserId: profile.id,
      hostName: ownerName,
      guestOrProspectName: name,
      fromPublicBooking: true,
      meetUrl,
      slotStartIso: slot_start,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
        start_time: event.start_time,
        end_time: event.end_time,
        title: event.title,
        description,
        google_meet_url: meetUrl,
      },
    });
  } catch (error) {
    captureRouteError("api/booking/[slug]/book", error, {
      extra: { step: "unhandled" },
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
