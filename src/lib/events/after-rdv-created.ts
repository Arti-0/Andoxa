import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { createNotification } from "@/lib/notifications/create-notification";
import { enrollOnBooking } from "@/lib/workflows/enroll-on-booking";

/**
 * Shared side effects after any RDV/event is created with a linked prospect —
 * in-app notification + on_booking workflow enrollment.
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

  await enrollOnBooking(supabase, {
    organizationId: params.organizationId,
    prospectId: params.prospectId,
    eventId: params.eventId,
    startedByUserId: params.hostUserId,
    meetUrl: params.meetUrl,
    slotStartIso: params.slotStartIso,
  });
}
