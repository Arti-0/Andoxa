import crypto from "node:crypto";

/**
 * Constant-time string comparison for secrets (CRON_SECRET, shared webhook
 * tokens, etc.). Hashing both sides to a fixed 32-byte digest before comparing
 * avoids leaking length via early-exit and sidesteps timingSafeEqual's
 * equal-length requirement. Use instead of `a === b` whenever `b` is a secret.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ah = crypto.createHash("sha256").update(a).digest();
  const bh = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ah, bh);
}
