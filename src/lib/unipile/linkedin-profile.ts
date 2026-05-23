/**
 * Fetch a single LinkedIn profile via Unipile and map it to the prospect
 * payload shape that /api/prospects/import accepts.
 *
 * Used by /api/extension/capture for the "profile" URL context.
 */

import { UnipileApiError, unipileFetch } from "./client";
import { extractLinkedInSlug } from "./campaign";

/**
 * Subset of the Unipile `GET /users/{publicIdentifier}` response we care about.
 * Unipile returns a richer object; we only pluck what we map onto a prospect.
 */
interface UnipileLinkedInProfile {
  provider_id?: string;
  public_identifier?: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  headline?: string | null;
  occupation?: string | null;
  current_position?: {
    company?: string | null;
    title?: string | null;
  } | null;
  location?: string | null;
  is_relationship?: boolean;
}

export interface ExtensionProspectPayload {
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  linkedin: string;
}

function buildFullName(p: UnipileLinkedInProfile): string | null {
  if (p.full_name?.trim()) return p.full_name.trim();
  const first = (p.first_name ?? "").trim();
  const last = (p.last_name ?? "").trim();
  const joined = [first, last].filter(Boolean).join(" ").trim();
  return joined.length > 0 ? joined : null;
}

function buildJobTitle(p: UnipileLinkedInProfile): string | null {
  const pos = p.current_position?.title?.trim();
  if (pos) return pos;
  const head = p.headline?.trim() ?? p.occupation?.trim() ?? "";
  return head.length > 0 ? head : null;
}

function canonicalLinkedInUrl(slug: string): string {
  return `https://www.linkedin.com/in/${slug}/`;
}

/**
 * Fetch one LinkedIn profile and return the prospect payload to feed into
 * /api/prospects/import. Falls back to a name-from-slug guess if Unipile is
 * unavailable so the extension can still create a stub row.
 */
export async function fetchLinkedInProfile(
  unipileAccountId: string,
  profileUrl: string
): Promise<ExtensionProspectPayload | null> {
  const slug = extractLinkedInSlug(profileUrl);
  if (!slug) return null;

  let prof: UnipileLinkedInProfile | null = null;
  try {
    prof = await unipileFetch<UnipileLinkedInProfile>(
      `/users/${encodeURIComponent(slug)}?account_id=${encodeURIComponent(
        unipileAccountId
      )}`
    );
  } catch (e) {
    if (!(e instanceof UnipileApiError)) throw e;
    // Profile not visible / not connectable etc. — keep a stub so the
    // server-side enrichment job can retry later.
    prof = null;
  }

  return {
    full_name: prof ? buildFullName(prof) : nameFromSlug(slug),
    company: prof?.current_position?.company?.trim() ?? null,
    job_title: prof ? buildJobTitle(prof) : null,
    linkedin: canonicalLinkedInUrl(slug),
  };
}

function nameFromSlug(slug: string): string | null {
  const cleaned = slug
    .split("-")
    .filter((s) => !/^[a-z0-9]{5,}$/.test(s))
    .join(" ")
    .trim();
  if (!cleaned) return null;
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
