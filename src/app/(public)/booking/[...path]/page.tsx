// Catch-all booking route.
//
// Path semantics:
//   /booking/<path>     → 1–2 segments, resolved via booking_public_path (+ aliases)
//   Legacy URLs (booking_slug, org/user) still resolve via resolveBookingSlugFromPath.

import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveBookingSlugFromPath } from "@/lib/booking/public-path";
import { BookingPageClient } from "../_lib/booking-page-client";

interface PageProps {
  params: Promise<{ path: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { path } = await params;
  if (!Array.isArray(path) || path.length === 0 || path.length > 2) {
    return notFound();
  }

  const supabase = createServiceClient();
  const bookingSlug = await resolveBookingSlugFromPath(supabase, path);
  if (!bookingSlug) return notFound();

  return <BookingPageClient slug={bookingSlug} />;
}
