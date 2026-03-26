/**
 * Read LinkedIn identity fields from Supabase Auth user_metadata (linkedin_oidc / OpenID claims).
 * Provider keys vary; we scan common string fields and optional vanity slugs.
 *
 * Note: LinkedIn's documented OIDC userinfo schema has no public profile URL — only sub, name,
 * picture, locale, email. We still deep-scan metadata and identity_data for nested URLs.
 */

const LINKEDIN_IN_URL_RE =
  /https?:\/\/(?:[a-z0-9.]+\.)?linkedin\.com\/in\/[^/?#\s]+/i;

export type LinkedInAuthUserLike = {
  user_metadata?: Record<string, unknown> | null;
  identities?: Array<{
    provider?: string;
    identity_data?: Record<string, unknown> | null;
  }> | null;
};

/** Merge primary user_metadata with linkedin* identity rows (Supabase stores provider claims there too). */
export function mergeLinkedInAuthMetadata(user: LinkedInAuthUserLike): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ...(typeof user.user_metadata === "object" && user.user_metadata
      ? user.user_metadata
      : {}),
  };
  for (const id of user.identities ?? []) {
    const p = (id.provider ?? "").toLowerCase();
    if (!p.includes("linkedin")) continue;
    const d = id.identity_data;
    if (d && typeof d === "object") {
      Object.assign(base, d);
    }
  }
  return base;
}

/** Any nested string containing a linkedin.com/in/… URL (bounded depth, cycle-safe). */
export function extractLinkedInInUrlFromDeepScan(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") {
    const m = value.match(LINKEDIN_IN_URL_RE);
    return m ? m[0] : null;
  }
  if (typeof value !== "object") return null;
  if (seen.has(value as object)) return null;
  seen.add(value as object);
  if (Array.isArray(value)) {
    for (const item of value) {
      const r = extractLinkedInInUrlFromDeepScan(item, depth + 1, seen);
      if (r) return r;
    }
    return null;
  }
  for (const v of Object.values(value)) {
    const r = extractLinkedInInUrlFromDeepScan(v, depth + 1, seen);
    if (r) return r;
  }
  return null;
}

const PROFILE_URL_KEYS = [
  "profile_url",
  "linkedin_url",
  "profile",
  "public_profile_url",
  "profileUrl",
  "linkedinProfile",
] as const;

const VANITY_KEYS = [
  "vanityName",
  "vanity_name",
  "public_identifier",
  "slug",
] as const;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * First LinkedIn profile URL string found in metadata (not yet canonicalized).
 */
export function extractLinkedInProfileUrlFromMetadata(
  meta: Record<string, unknown> | null | undefined
): string | null {
  if (!meta || typeof meta !== "object") return null;

  for (const key of PROFILE_URL_KEYS) {
    const v = meta[key];
    if (isNonEmptyString(v) && v.toLowerCase().includes("linkedin.com")) {
      return v.trim();
    }
  }

  const website = meta.website;
  if (isNonEmptyString(website) && website.toLowerCase().includes("linkedin.com/in/")) {
    return website.trim();
  }

  for (const key of VANITY_KEYS) {
    const v = meta[key];
    if (!isNonEmptyString(v)) continue;
    const slug = v.trim().replace(/^\/+|\/+$/g, "");
    if (slug.length === 0 || slug.length > 200) continue;
    if (/[/?#]/.test(slug)) continue;
    return `https://www.linkedin.com/in/${slug}`;
  }

  return extractLinkedInInUrlFromDeepScan(meta);
}

/** OIDC `sub` or explicit linkedin_id claim — stable per LinkedIn account. */
export function extractLinkedInSubFromMetadata(
  meta: Record<string, unknown> | null | undefined
): string | null {
  if (!meta || typeof meta !== "object") return null;
  const sub = meta.sub ?? meta.linkedin_id;
  if (typeof sub === "string" && sub.trim().length > 0) return sub.trim();
  if (typeof sub === "number") return String(sub);
  return null;
}
