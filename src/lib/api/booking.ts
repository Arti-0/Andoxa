/**
 * Booking API client - public booking flow (no auth)
 */

export interface Slot {
  start: string;
  end: string;
}

export async function fetchBookingSlots(slug: string): Promise<Slot[]> {
  const res = await fetch(`/api/booking/${slug}/slots`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? "Impossible de charger les créneaux");
  }
  const data = json?.data ?? json;
  return data?.slots ?? [];
}

export async function bookSlot(
  slug: string,
  params: {
    slot_start: string;
    slot_end: string;
    guest_name: string;
    guest_email: string;
    guest_linkedin?: string | null;
    guest_phone?: string | null;
  }
): Promise<{ id: string; start_time: string; end_time: string; title: string }> {
  const res = await fetch(`/api/booking/${slug}/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? "Erreur lors de la réservation");
  }
  return json?.data;
}
