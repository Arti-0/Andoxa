import { getGoogleClientId, getGoogleClientSecret } from "@/lib/google/oauth-config";

export type GoogleTokenRefreshResult = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

/**
 * OAuth2 token refresh (Google).
 */
export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<GoogleTokenRefreshResult> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof json.error_description === "string"
        ? json.error_description
        : typeof json.error === "string"
          ? json.error
          : "Token refresh failed";
    throw new Error(msg);
  }
  const access_token = json.access_token as string | undefined;
  const expires_in = Number(json.expires_in ?? 3600);
  if (!access_token) throw new Error("Missing access_token in refresh response");
  return {
    access_token,
    refresh_token: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    expires_in,
    scope: typeof json.scope === "string" ? json.scope : undefined,
  };
}
