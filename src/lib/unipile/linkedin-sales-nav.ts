/**
 * Fetch members of a LinkedIn Sales Navigator (standard) list via Unipile.
 *
 * Wraps the unified Unipile LinkedIn search endpoint:
 *   POST /api/v1/linkedin/search?account_id=...&cursor=...&limit=...
 *   body: { url: "<full sales-nav list or search URL>" }
 * Response:
 *   { items: LSNListMember[], cursor: string | null, paging: { total_count?: number } }
 *
 * Used by /api/extension/capture for the "lsn_list" URL context. Recruiter /
 * Sales Insights tiers are out of scope for v2.
 */

import { unipileFetch } from "./client";
import type { ExtensionProspectPayload } from "./linkedin-profile";

const LSN_LIST_URL_RX =
  /linkedin\.com\/sales\/lists\/people\/([A-Za-z0-9_-]+)/i;

/** Shape of a result item from POST /linkedin/search (Sales Nav · People). */
export interface LSNListMember {
  type?: string;
  name?: string | null;
  public_identifier?: string;
  headline?: string | null;
  current_positions?: Array<{
    company?: string | null;
    role?: string | null;
  }>;
  profile_url?: string | null;
  location?: string | null;
  network_distance?: string | null;
}

export interface LSNListPage {
  members: ExtensionProspectPayload[];
  /** Cursor for the next page; null when the list is exhausted. */
  nextCursor: string | null;
  /** Total result count as reported by `paging.total_count`, when present. */
  estimatedTotal: number | null;
}

/**
 * Extracts the Sales Navigator list id from a URL. Returns null for any URL
 * that is not a standard LSN people list.
 */
export function extractLSNListId(url: string): string | null {
  if (!url?.trim()) return null;
  const match = url.match(LSN_LIST_URL_RX);
  return match?.[1] ?? null;
}

function canonicalLinkedInUrlFromMember(m: LSNListMember): string {
  if (m.public_identifier?.trim()) {
    return `https://www.linkedin.com/in/${m.public_identifier.trim()}/`;
  }
  // Provider-only fallback: keep the Sales Navigator profile URL so the
  // import dedup (which keys on `linkedin` + email + phone) still has a
  // stable identifier.
  return m.profile_url?.trim() || "https://www.linkedin.com/";
}

function memberToProspect(m: LSNListMember): ExtensionProspectPayload {
  const fullName = m.name?.trim() || null;
  const company =
    m.current_positions?.[0]?.company?.trim() || null;
  const jobTitle =
    m.current_positions?.[0]?.role?.trim() ||
    m.headline?.trim() ||
    null;
  return {
    full_name: fullName,
    company,
    job_title: jobTitle,
    linkedin: canonicalLinkedInUrlFromMember(m),
  };
}

/**
 * Fetch one page of members for a Sales Navigator URL (list, search, etc.).
 * Pass the *full* URL from the browser — Unipile parses it server-side.
 *
 * Returns prospects ready for batch import plus the cursor to feed back in
 * on the next call.
 */
export async function fetchLSNListMembers(
  unipileAccountId: string,
  salesNavUrl: string,
  cursor: string | null
): Promise<LSNListPage> {
  const params = new URLSearchParams();
  params.set("account_id", unipileAccountId);
  // LinkedIn classic caps at 50, Sales Nav allows up to 100. We pick 50 to
  // stay within the lowest common limit and avoid a partial-list edge case.
  params.set("limit", "50");
  if (cursor) params.set("cursor", cursor);

  const data = await unipileFetch<{
    items?: LSNListMember[];
    cursor?: string | null;
    paging?: { total_count?: number };
  }>(`/linkedin/search?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify({ url: salesNavUrl }),
  });

  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    members: items
      .map(memberToProspect)
      .filter((p) => p.full_name || p.linkedin),
    nextCursor: data?.cursor?.trim() || null,
    estimatedTotal: data?.paging?.total_count ?? null,
  };
}
