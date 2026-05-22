/** Segment slug: lowercase a-z0-9, hyphens, 2–40 chars. */
export const BOOKING_SEGMENT_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export const BOOKING_RESERVED_SEGMENTS = new Set([
  "api",
  "admin",
  "settings",
  "auth",
  "booking",
  "help",
  "dashboard",
  "crm",
  "calendar",
  "onboarding",
  "pricing",
  "contact",
  "privacy",
  "terms",
  "checkout",
  "extension",
  "unsubscribe",
]);

export type BookingPathValidation =
  | { ok: true; path: string }
  | { ok: false; message: string };

/** Normalize and validate a user-facing booking path (1–2 segments). */
export function normalizeBookingPublicPath(raw: string): BookingPathValidation {
  const trimmed = raw.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    return { ok: false, message: "Lien requis" };
  }

  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length === 0 || segments.length > 2) {
    return {
      ok: false,
      message: "Utilisez 1 ou 2 segments séparés par / (ex. rdv-marie ou acme/decouverte)",
    };
  }

  for (const seg of segments) {
    if (!BOOKING_SEGMENT_RE.test(seg)) {
      return {
        ok: false,
        message:
          "Chaque segment : 2 à 40 caractères, lettres minuscules, chiffres et tirets (pas en début/fin)",
      };
    }
    if (BOOKING_RESERVED_SEGMENTS.has(seg)) {
      return { ok: false, message: `« ${seg} » est réservé` };
    }
  }

  return { ok: true, path: segments.join("/") };
}

/** Build the public booking page path (includes /booking prefix). */
export function bookingPagePath(publicPath: string | null | undefined): string | null {
  if (!publicPath?.trim()) return null;
  return `/booking/${publicPath.trim().replace(/^\/+|\/+$/g, "")}`;
}

/** Full absolute URL for sharing. */
export function buildBookingPublicUrl(
  origin: string,
  publicPath: string | null | undefined,
): string | null {
  const pagePath = bookingPagePath(publicPath);
  if (!pagePath) return null;
  const base = origin.replace(/\/+$/, "");
  return `${base}${pagePath}`;
}

/** Resolve public path from profile row (falls back to legacy booking_slug). */
export function profileBookingPublicPath(profile: {
  booking_public_path?: string | null;
  booking_slug?: string | null;
} | null | undefined): string | null {
  return profile?.booking_public_path?.trim() || profile?.booking_slug?.trim() || null;
}

export function buildBookingPublicUrlForProfile(
  origin: string,
  profile: {
    booking_public_path?: string | null;
    booking_slug?: string | null;
  } | null | undefined,
): string | null {
  return buildBookingPublicUrl(origin, profileBookingPublicPath(profile));
}

export type BookingProfileResolve = {
  booking_slug: string;
};

/**
 * Resolve a /booking/<...> request to the internal booking_slug used by APIs.
 * Supports canonical public path, path aliases, and legacy slug URLs.
 */
export async function resolveBookingSlugFromPath(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  pathSegments: string[],
): Promise<string | null> {
  if (pathSegments.length === 0 || pathSegments.length > 2) return null;

  const publicPath = pathSegments.map((s) => s.toLowerCase()).join("/");

  // ── Canonical public path ──
  {
    const { data } = await supabase
      .from("profiles")
      .select("booking_slug")
      .eq("booking_public_path", publicPath)
      .maybeSingle();
    if (data?.booking_slug) return data.booking_slug as string;
  }

  // ── Archived public paths ──
  {
    const { data } = await supabase
      .from("profiles")
      .select("booking_slug")
      .contains("previous_booking_paths", [publicPath])
      .maybeSingle();
    if (data?.booking_slug) return data.booking_slug as string;
  }

  // ── Legacy: single segment = booking_slug or previous_booking_slugs ──
  if (pathSegments.length === 1) {
    const slug = pathSegments[0]!.toLowerCase();
    const { data } = await supabase
      .from("profiles")
      .select("booking_slug")
      .or(`booking_slug.eq.${slug},previous_booking_slugs.cs.{${slug}}`)
      .maybeSingle();
    if (data?.booking_slug) return data.booking_slug as string;
    return null;
  }

  // ── Legacy: /booking/<org>/<user> ──
  const [orgSlug, userSlug] = pathSegments.map((s) => s.toLowerCase());
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!orgRow?.id) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("booking_slug")
    .or(`booking_slug.eq.${userSlug},previous_booking_slugs.cs.{${userSlug}}`)
    .eq("active_organization_id", orgRow.id)
    .maybeSingle();

  return (profile?.booking_slug as string | undefined) ?? null;
}

/** Check whether a public path collides with another user's path or aliases. */
export async function bookingPublicPathCollides(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  path: string,
  excludeUserId: string,
): Promise<boolean> {
  const { data: byPath } = await supabase
    .from("profiles")
    .select("id")
    .eq("booking_public_path", path)
    .neq("id", excludeUserId)
    .maybeSingle();
  if (byPath) return true;

  const { data: byAlias } = await supabase
    .from("profiles")
    .select("id")
    .contains("previous_booking_paths", [path])
    .neq("id", excludeUserId)
    .maybeSingle();
  if (byAlias) return true;

  // Single-segment paths also collide with legacy booking_slug aliases.
  if (!path.includes("/")) {
    const { data: byLegacySlug } = await supabase
      .from("profiles")
      .select("id")
      .or(`booking_slug.eq.${path},previous_booking_slugs.cs.{${path}}`)
      .neq("id", excludeUserId)
      .maybeSingle();
    if (byLegacySlug) return true;
  }

  return false;
}
