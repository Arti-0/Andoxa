import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { createNotification } from "@/lib/notifications/create-notification";
import { enrollOnBooking } from "@/lib/workflows/enroll-on-booking";
import { insertProspectActivity } from "@/lib/prospect-activity";

/**
 * Shared side effects after any RDV/event is created with a linked prospect —
 * in-app notification + `rdv_scheduled` activity + on_booking workflow enrollment.
 *
 * The `rdv_scheduled` activity log is what feeds the campaigns "RDV bookés"
 * KPI and the dashboard funnel — without it those counters stay at zero even
 * when bookings land.
 */
export async function afterRdvCreated(
  supabase: SupabaseClient<Database>,
  params: {
    organizationId: string;
    eventId: string;
    prospectId: string;
    hostUserId: string;
    hostName: string;
    guestOrProspectName: string;
    /** When true, message says the guest booked via public link. */
    fromPublicBooking?: boolean;
    meetUrl?: string | null;
    slotStartIso?: string | null;
  }
): Promise<void> {
  const message = params.fromPublicBooking
    ? `${params.guestOrProspectName} a réservé un créneau avec ${params.hostName}`
    : `Rendez-vous planifié avec ${params.guestOrProspectName}`;

  await createNotification(supabase, {
    title: "Nouveau rendez-vous",
    message,
    category: "event",
    action_type: "event_created",
    actor_id: null,
    organization_id: params.organizationId,
    target_url: "/calendar",
    dedupe_key: `booking:new:${params.eventId}`,
  });

  // Resolve the campaign attribution by looking at the prospect's most recent
  // outbound activity. If the booking came shortly after a campaign-driven
  // touch, we tag the activity with that campaign_job_id so the per-campaign
  // performance column (and the campaigns "RDV bookés" KPI) credit the right
  // job. Falls back to NULL when no recent campaign touch exists.
  let campaignJobId: string | null = null;
  try {
    const { data: lastOutbound } = await supabase
      .from("prospect_activity")
      .select("campaign_job_id")
      .eq("prospect_id", params.prospectId)
      .eq("organization_id", params.organizationId)
      .in("action", [
        "linkedin_invite_sent",
        "linkedin_invite_accepted",
        "linkedin_message_outbound",
        "whatsapp_message_outbound",
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    campaignJobId = lastOutbound?.campaign_job_id ?? null;
  } catch {
    // Best-effort attribution — the rdv_scheduled write below still lands.
  }

  try {
    await insertProspectActivity(supabase, {
      organization_id: params.organizationId,
      prospect_id: params.prospectId,
      actor_id: params.hostUserId,
      campaign_job_id: campaignJobId,
      action: "rdv_scheduled",
      details: {
        event_id: params.eventId,
        when: params.slotStartIso ?? null,
        from_public_booking: Boolean(params.fromPublicBooking),
      },
    });
  } catch (err) {
    // Activity write failure is non-fatal — the booking + notification still
    // landed; only the KPI counters miss this one. Logged via the activity
    // helper's own Sentry instrumentation.
    console.error("[afterRdvCreated] rdv_scheduled activity:", err);
  }

  await enrollOnBooking(supabase, {
    organizationId: params.organizationId,
    prospectId: params.prospectId,
    eventId: params.eventId,
    startedByUserId: params.hostUserId,
    meetUrl: params.meetUrl,
    slotStartIso: params.slotStartIso,
  });
}
