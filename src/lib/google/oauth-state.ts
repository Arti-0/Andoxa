import { createHmac, timingSafeEqual } from "crypto";
import {
  getGoogleClientSecret,
  getGoogleClientId,
} from "@/lib/google/oauth-config";

function stateSecret(): string {
  return (
    process.env.GOOGLE_OAUTH_STATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    getGoogleClientSecret() ||
    getGoogleClientId() ||
    "dev-only-insecure-state"
  );
}

/** CSRF + user binding: HMAC(uid|exp). */
export function encodeGoogleOAuthState(userId: string): string {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = `${userId}|${exp}`;
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`, "utf8").toString("base64url");
}

export function decodeGoogleOAuthState(state: string): { userId: string } | null {
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const parts = raw.split("|");
    if (parts.length !== 3) return null;
    const [userId, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;
    const payload = `${userId}|${exp}`;
    const expected = createHmac("sha256", stateSecret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { userId };
  } catch {
    return null;
  }
}
