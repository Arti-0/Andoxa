/**
 * Read LinkedIn identity fields from Supabase Auth user_metadata (linkedin_oidc / OpenID claims).
 * Provider keys vary; we scan common string fields and optional vanity slugs.
 */

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

  return null;
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
