/**
 * Google OAuth + Calendar env (booking Meet links).
 * Prefer GOOGLE_*; fall back to existing CALENDAR_GOOGLE_* / GOOGLE_OAUTH_* where present.
 */
export function getGoogleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.CALENDAR_GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    ""
  );
}

export function getGoogleClientSecret(): string {
  return (
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.CALENDAR_GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    ""
  );
}

export function getGoogleRedirectUri(): string {
  const explicit =
    process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ||
    process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!base) return "";
  return `${base.replace(/\/$/, "")}/api/google/callback`;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(getGoogleClientId() && getGoogleRedirectUri());
}

export const GOOGLE_BOOKING_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");
