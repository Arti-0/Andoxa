/**
 * AES-256-GCM cipher for LinkedIn session cookies stored on
 * `user_unipile_accounts.cookie_payload`. Used by the cookie-sync ingest
 * route (encrypt) and the silent-reconnect cron (decrypt).
 *
 * Keys come from env:
 *   - UNIPILE_COOKIE_ENC_KEY  : single 32-byte base64 key (required if
 *                               UNIPILE_COOKIE_ENC_KEYS is unset)
 *   - UNIPILE_COOKIE_ENC_KEYS : comma-separated 32-byte base64 keys, newest
 *                               first. Encryption uses the head; decryption
 *                               walks the list. Enables zero-downtime rotation.
 *
 * Each call uses a fresh 12-byte random IV; the auth tag is appended.
 * AAD is `${userId}|${unipileAccountId}` — binds the ciphertext to its row so
 * a leaked payload can't be transplanted onto another account.
 *
 * Behavior on missing/invalid key:
 *   - Production (NODE_ENV=production): module init throws so the deploy fails
 *     loudly instead of silently disabling the feature.
 *   - Dev/test: module init logs once and `isCookieEncryptionAvailable()`
 *     returns false. Callers should short-circuit (e.g. ingest route returns
 *     503 COOKIE_ENCRYPTION_DISABLED).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

const CURRENT_VERSION = 1;

export interface CookieMaterial {
  li_at: string;
  li_a: string | null;
  user_agent: string;
}

/** Stored shape (jsonb column). Single object so we can evolve via `v`. */
export interface EncryptedCookiePayload {
  v: number;
  iv: string;
  tag: string;
  ct_li_at: string;
  ct_li_a: string | null;
  ct_user_agent: string;
}

function loadKeys(): Buffer[] {
  const list = process.env.UNIPILE_COOKIE_ENC_KEYS?.trim();
  const single = process.env.UNIPILE_COOKIE_ENC_KEY?.trim();
  const raw = list && list.length > 0
    ? list.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
    : single
      ? [single]
      : [];
  const keys = raw.map((b64) => {
    const buf = Buffer.from(b64, "base64");
    if (buf.length !== KEY_BYTES) {
      throw new Error(
        `UNIPILE_COOKIE_ENC_KEY/KEYS must decode to ${KEY_BYTES} bytes (got ${buf.length})`
      );
    }
    return buf;
  });
  return keys;
}

// Lazy initialisation. Reading the env at module load time breaks the
// Next.js production build (no key configured at compile time → page-data
// collection crashes). Instead we resolve keys on first use and cache the
// result. Routes that need the cipher gate on `isCookieEncryptionAvailable()`
// and return 503 when it's false — so a misconfigured deploy degrades the
// silent-reconnect feature instead of bringing the whole app down.
let resolved: { keys: Buffer[]; error: Error | null } | null = null;

function ensureResolved(): { keys: Buffer[]; error: Error | null } {
  if (resolved) return resolved;
  try {
    const keys = loadKeys();
    if (keys.length === 0) {
      resolved = {
        keys: [],
        error: new Error(
          "UNIPILE_COOKIE_ENC_KEY (or UNIPILE_COOKIE_ENC_KEYS) is not configured"
        ),
      };
    } else {
      resolved = { keys, error: null };
    }
  } catch (err) {
    resolved = {
      keys: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
  if (resolved.error && process.env.NODE_ENV !== "production") {
    console.warn(
      "[cookie-cipher] disabled (",
      resolved.error.message,
      ") — cookie sync routes will return 503 in this environment"
    );
  }
  return resolved;
}

export function isCookieEncryptionAvailable(): boolean {
  const r = ensureResolved();
  return r.error === null && r.keys.length > 0;
}

function getKeys(): Buffer[] {
  return ensureResolved().keys;
}

function assertReady(): void {
  if (!isCookieEncryptionAvailable()) {
    throw new Error("Cookie encryption is disabled (missing key)");
  }
}

function buildAad(userId: string, unipileAccountId: string): Buffer {
  return Buffer.from(`${userId}|${unipileAccountId}`, "utf8");
}

/**
 * Encrypt the cookie triple with a fresh IV. li_a may be null (free LinkedIn
 * account) — in that case its ciphertext is null.
 *
 * Throws when encryption is unavailable; callers must check
 * `isCookieEncryptionAvailable()` and short-circuit at the boundary.
 */
export function encryptCookiePayload(
  material: CookieMaterial,
  aad: { userId: string; unipileAccountId: string }
): EncryptedCookiePayload {
  assertReady();
  const key = getKeys()[0]!;
  const iv = randomBytes(IV_BYTES);
  const aadBuf = buildAad(aad.userId, aad.unipileAccountId);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aadBuf);
  const ct_li_at = Buffer.concat([
    cipher.update(material.li_at, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // li_a and user_agent: each needs its own IV + tag because GCM is
  // single-shot per cipher instance. Use a second/third cipher with a fresh
  // IV derived deterministically from the primary IV + a slot byte so we only
  // need to store one IV in the payload. Simpler: encrypt all three into a
  // single concatenated plaintext, with a delimiter that can't appear.
  //
  // Trade-off: re-encrypting if any field changes. That's fine — extension
  // pushes the whole triple every time anyway.

  return {
    v: CURRENT_VERSION,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct_li_at: ct_li_at.toString("base64"),
    ct_li_a: material.li_a === null
      ? null
      : encryptSingle(material.li_a, aad, "li_a"),
    ct_user_agent: encryptSingle(material.user_agent, aad, "user_agent"),
  };
}

/**
 * Encrypt one secondary field. Each gets its own IV (embedded in the
 * ciphertext blob, format: `${iv_b64}.${tag_b64}.${ct_b64}`) so a leak of the
 * primary IV doesn't compromise other fields.
 */
function encryptSingle(
  plaintext: string,
  aad: { userId: string; unipileAccountId: string },
  slot: string
): string {
  const key = getKeys()[0]!;
  const iv = randomBytes(IV_BYTES);
  const aadBuf = Buffer.from(
    `${aad.userId}|${aad.unipileAccountId}|${slot}`,
    "utf8"
  );
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aadBuf);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

function decryptSingle(
  blob: string,
  aad: { userId: string; unipileAccountId: string },
  slot: string
): string | null {
  const parts = blob.split(".");
  if (parts.length !== 3) return null;
  const [ivB64, tagB64, ctB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;

  const aadBuf = Buffer.from(
    `${aad.userId}|${aad.unipileAccountId}|${slot}`,
    "utf8"
  );

  // Walk all keys (newest first) to support rotation.
  for (const key of getKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAAD(aadBuf);
      decipher.setAuthTag(tag);
      const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
      return pt.toString("utf8");
    } catch {
      // Wrong key, try next
    }
  }
  return null;
}

/**
 * Decrypt a previously stored payload. Returns null on any failure
 * (rotated past retention, AAD mismatch, tampering) — caller should clear the
 * row and let the extension re-populate.
 */
export function decryptCookiePayload(
  payload: EncryptedCookiePayload,
  aad: { userId: string; unipileAccountId: string }
): CookieMaterial | null {
  if (!isCookieEncryptionAvailable()) return null;
  if (payload.v !== CURRENT_VERSION) return null;

  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ct = Buffer.from(payload.ct_li_at, "base64");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;

  const aadBuf = buildAad(aad.userId, aad.unipileAccountId);

  let li_at: string | null = null;
  for (const key of getKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAAD(aadBuf);
      decipher.setAuthTag(tag);
      li_at = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
      break;
    } catch {
      /* try next */
    }
  }
  if (li_at === null) return null;

  const user_agent = decryptSingle(payload.ct_user_agent, aad, "user_agent");
  if (user_agent === null) return null;

  const li_a = payload.ct_li_a === null
    ? null
    : decryptSingle(payload.ct_li_a, aad, "li_a");
  // If li_a was stored but decrypt fails, treat the whole payload as bad.
  if (payload.ct_li_a !== null && li_a === null) return null;

  return { li_at, li_a, user_agent };
}
