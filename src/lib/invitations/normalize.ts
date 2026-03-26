/**
 * Shared normalization for invitation matching (email + LinkedIn URL).
 * Keep in sync with invite creation in /api/invitations.
 */

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Canonical LinkedIn profile URL for stable matching across hosts (fr., www.) and trailing slashes.
 */
export function normalizeInvitationLinkedInUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (
      u.hostname === "linkedin.com" ||
      u.hostname === "www.linkedin.com" ||
      u.hostname.endsWith(".linkedin.com")
    ) {
      const path = u.pathname.replace(/\/+$/, "");
      return `https://www.linkedin.com${path.startsWith("/") ? path : `/${path}`}`;
    }
  } catch {
    /* ignore */
  }
  return trimmed;
}
