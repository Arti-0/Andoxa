import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateAndNormalizeLinkedIn } from "@/lib/utils/linkedin";
import { getValidGoogleAccessToken, createGoogleMeetEvent } from "@/lib/google/calendar";
import { sendBookingOwnerConfirmationEmail } from "@/lib/email/send-booking-owner-confirmation";
import { sendBookingGuestConfirmationEmail } from "@/lib/email/send-booking-guest-confirmation";
import { captureRouteError } from "@/lib/sentry/route-error";
import { createNotification } from "@/lib/notifications/create-notification";
import { normalizePhoneForWhatsApp } from "@/lib/utils/phone";
import { getWhatsAppAccountIdForUserId } from "@/lib/unipile/account";
import { unipileFetch } from "@/lib/unipile/client";
import { buildBookingInviteIcs } from "@/lib/booking/build-booking-invite-ics";
import { enrollOnBooking } from "@/lib/workflows/enroll-on-booking";

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
    const hasPhone = phoneRaw.length > 0 && guestPhoneLooksValid(normalizedPhone);

    if (!hasEmail && !hasPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Indiquez au moins une adresse e-mail ou un numéro WhatsApp",
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
        .eq("user_id", profile.id)
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

    let match: (typeof candidates)[number] | null = null;
    if (linkedin) {
      match =
        candidates.find((p) => {
          const norm = validateAndNormalizeLinkedIn(p.linkedin);
          return norm && norm.toLowerCase() === linkedin.toLowerCase();
        }) ?? null;
    }
    if (!match && hasEmail) {
      match =
        candidates.find((p) => p.email?.toLowerCase() === emailRaw.toLowerCase()) ??
        null;
    }
    if (!match && hasPhone) {
      match =
        candidates.find((p) => {
          const ph = p.phone?.trim();
          return ph && normalizePhoneForWhatsApp(ph) === normalizedPhone;
        }) ?? null;
    }

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

    const descriptionLines = [
      "Rendez-vous réservé via le lien de prise de RDV.",
      "",
      `Invité : ${name}`,
    ];
    if (emailForDb) descriptionLines.push(`E-mail : ${emailForDb}`);
    if (linkedin) descriptionLines.push(`LinkedIn : ${linkedin}`);
    if (phoneForDb) descriptionLines.push(`Téléphone : ${phoneForDb}`);
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
        guest_email: emailForDb,
        guest_linkedin: linkedin,
        guest_phone: phoneForDb,
      })
      .select("id, start_time, end_time, title")
      .single();

    if (eventError || !event?.id) {
      captureRouteError(route, eventError ?? new Error("missing_event_id"), {
        extra: { slug, step: "event_create" },
      });
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
        const attendeeRaw = [
          ownerEmail,
          ...(hasEmail ? [emailRaw] : []),
        ].filter((e): e is string => !!e && e.includes("@"));
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
      captureRouteError(
        route,
        e,
        { extra: { slug, step: "google_meet" } },
        "warn"
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

    // Guest WhatsApp first when applicable (priority channel), then optional email.
    if (hasPhone) {
      try {
        const waAccountId = await getWhatsAppAccountIdForUserId(supabase, profile.id);
        if (waAccountId && normalizedPhone) {
          const dateStr = new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Paris",
          }).format(slotStartDate);
          const hostName = profile.full_name?.trim() || "votre interlocuteur";
          const waLines = [
            `✅ Votre rendez-vous avec ${hostName} est confirmé !`,
            `📅 ${dateStr}`,
          ];
          if (meetUrl) waLines.push(`🔗 Lien de visio : ${meetUrl}`);
          await unipileFetch("/chats", {
            method: "POST",
            body: JSON.stringify({
              account_id: waAccountId,
              attendees_ids: [normalizedPhone],
              text: waLines.join("\n"),
            }),
          });
        }
      } catch (e) {
        captureRouteError(route, e, {
          extra: { slug, step: "whatsapp_confirmation", eventId },
        }, "warn");
      }
    }

    if (hasEmail) {
      try {
        const host =
          process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "").split("/")[0] ??
          "andoxa.app";
        const hostDisplay = profile.full_name?.trim() || ownerEmail || "Hôte";
        const guestIcsLines = [
          `Rendez-vous avec ${hostDisplay}`,
          meetUrl ? `Visioconférence : ${meetUrl}` : "",
        ].filter(Boolean);
        const guestIcs = buildBookingInviteIcs({
          uid: `${eventId}@${host}`,
          startUtc: slotStartDate,
          endUtc: slotEndDate,
          summary: `RDV — ${hostDisplay}`,
          description: guestIcsLines.join("\n"),
          organizerName: hostDisplay,
          organizerEmail: ownerEmail && ownerEmail.includes("@") ? ownerEmail : null,
        });
        await sendBookingGuestConfirmationEmail({
          to: emailRaw,
          hostName: profile.full_name?.trim() || ownerEmail || "Votre hôte",
          slotStartIso: slot_start,
          slotEndIso: slot_end,
          meetUrl,
          icsInvitation: guestIcs,
        });
      } catch (e) {
        captureRouteError(route, e, {
          extra: { slug, step: "guest_confirmation_email", eventId },
        });
      }
    }

    const ownerName = profile.full_name?.trim() || "vous";
    await createNotification(supabase, {
      title: "Nouveau rendez-vous",
      message: `${name} a réservé un créneau avec ${ownerName}`,
      category: "event",
      action_type: "event_created",
      actor_id: null,
      organization_id: orgId,
      target_url: "/calendar",
      dedupe_key: `booking:new:${eventId}`,
    });

    // Fire `on_booking` workflows for the host. One run per
    // (workflow, prospect, event) tuple — enforced by the unique partial
    // index added in migration 20260517170000. Rebookings get a new event
    // → new run, per product spec. Failures are non-fatal (the booking
    // already succeeded by this point and the user got their confirmation).
    if (prospectId) {
      await enrollOnBooking(supabase, {
        organizationId: orgId,
        prospectId,
        eventId,
        startedByUserId: profile.id,
      });
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
    captureRouteError("api/booking/[slug]/book", error, {
      extra: { step: "unhandled" },
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
