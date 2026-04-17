import { getGoogleClientId, getGoogleClientSecret, getGoogleRedirectUri } from "@/lib/google/oauth-config";

export type GoogleCodeExchangeResult = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

export async function exchangeAuthorizationCode(
  code: string
): Promise<GoogleCodeExchangeResult> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getGoogleRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured");
  }
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
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
          : "Code exchange failed";
    throw new Error(msg);
  }
  const access_token = json.access_token as string | undefined;
  const expires_in = Number(json.expires_in ?? 3600);
  if (!access_token) throw new Error("Missing access_token");
  return {
    access_token,
    refresh_token: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    expires_in,
    scope: typeof json.scope === "string" ? json.scope : undefined,
  };
}

export async function fetchGoogleUserInfoEmail(
  accessToken: string
): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => ({}))) as { email?: string };
  if (!res.ok || !json.email) return null;
  return json.email;
}
