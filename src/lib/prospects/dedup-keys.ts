import { validateAndNormalizeLinkedIn } from "@/lib/utils/linkedin";
import { normalizePhoneForWhatsApp } from "@/lib/utils/phone";

export function emailDedupKey(raw: string | null | undefined): string | null {
  const t = raw?.trim().toLowerCase();
  return t && t.includes("@") ? t : null;
}

export function phoneDedupKey(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const normalized = normalizePhoneForWhatsApp(raw);
  return normalized.length >= 10 ? normalized : null;
}

export function linkedinDedupKey(raw: string | null | undefined): string | null {
  const norm = validateAndNormalizeLinkedIn(raw);
  return norm ? norm.toLowerCase() : null;
}

export function allDedupKeysForProspect(row: {
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
}): string[] {
  const keys: string[] = [];
  const email = emailDedupKey(row.email);
  const phone = phoneDedupKey(row.phone);
  const linkedin = linkedinDedupKey(row.linkedin);
  if (email) keys.push(`email:${email}`);
  if (phone) keys.push(`phone:${phone}`);
  if (linkedin) keys.push(`linkedin:${linkedin}`);
  return keys;
}

export type ProspectMatchInput = {
  linkedin?: string | null;
  email?: string | null;
  phone?: string | null;
  normalizedPhone?: string;
};

export type ProspectCandidate = {
  id: string;
  full_name: string | null;
  email: string | null;
  linkedin: string | null;
  phone: string | null;
};

/** LinkedIn → email → phone (same order as public booking). */
export function resolveProspectMatch<T extends ProspectCandidate>(
  candidates: T[],
  input: ProspectMatchInput
): T | null {
  const linkedinKey = input.linkedin
    ? linkedinDedupKey(input.linkedin)
    : null;
  if (linkedinKey) {
    const hit = candidates.find((p) => linkedinDedupKey(p.linkedin) === linkedinKey);
    if (hit) return hit;
  }

  const emailKey = input.email ? emailDedupKey(input.email) : null;
  if (emailKey) {
    const hit = candidates.find((p) => emailDedupKey(p.email) === emailKey);
    if (hit) return hit;
  }

  const phoneKey =
    input.normalizedPhone ??
    (input.phone ? phoneDedupKey(input.phone) : null);
  if (phoneKey) {
    const hit = candidates.find((p) => phoneDedupKey(p.phone) === phoneKey);
    if (hit) return hit;
  }

  return null;
}

export function buildImportKeyMaps(
  existingRows: Array<{
    id: string;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    deleted_at: string | null;
  }>
): {
  existingLiveKeys: Set<string>;
  trashedByKey: Map<string, string>;
} {
  const existingLiveKeys = new Set<string>();
  const trashedByKey = new Map<string, string>();

  for (const row of existingRows) {
    const keys = allDedupKeysForProspect(row);
    if (row.deleted_at) {
      for (const k of keys) {
        if (!existingLiveKeys.has(k) && !trashedByKey.has(k)) {
          trashedByKey.set(k, row.id);
        }
      }
    } else {
      for (const k of keys) {
        existingLiveKeys.add(k);
        trashedByKey.delete(k);
      }
    }
  }

  return { existingLiveKeys, trashedByKey };
}

export function dedupKeysForImportRow(row: {
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
}): string[] {
  return allDedupKeysForProspect(row);
}
