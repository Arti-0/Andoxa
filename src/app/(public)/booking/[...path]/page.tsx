// Catch-all booking route. Replaces the previous `[slug]` + `[org]/[user]`
// folders — Next.js refuses two siblings with different dynamic-segment names
// at the same depth, which is what produced the runtime error:
//   "You cannot use different slug names for the same dynamic path
//   ('org' !== 'slug')."
//
// Path semantics:
//   /booking/<slug>          → 1 segment, legacy URL — resolve by booking_slug
//   /booking/<org>/<user>    → 2 segments, new long form — org slug + user slug
//   anything else            → 404

import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
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

  // ── 1-segment: legacy short URL. The segment IS the booking_slug.
  if (path.length === 1) {
    const slug = path[0];
    // Sanity-check existence so we can 404 instead of rendering an empty
    // page when the slug is bogus. The downstream slots/book APIs would
    // also fail, but a server 404 reads better.
    const { data: profile } = await supabase
      .from("profiles")
      .select("booking_slug")
      .eq("booking_slug", slug)
      .maybeSingle();
    if (!profile?.booking_slug) return notFound();
    return <BookingPageClient slug={profile.booking_slug} />;
  }

  // ── 2-segment: /booking/<org>/<user> — resolve via org slug + user slug.
  const [orgSlug, userSlug] = path;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orgRow } = await (supabase as any)
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!orgRow?.id) return notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("booking_slug")
    .eq("booking_slug", userSlug)
    .eq("active_organization_id", orgRow.id)
    .maybeSingle();
  if (!profile?.booking_slug) return notFound();

  return <BookingPageClient slug={profile.booking_slug} />;
}
