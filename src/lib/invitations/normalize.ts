/**
 * Canonical LinkedIn profile URL for stable matching across hosts (fr., www.) and trailing slashes.
 * Used for LinkedIn profile URL normalization (OAuth / profile routes).
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
