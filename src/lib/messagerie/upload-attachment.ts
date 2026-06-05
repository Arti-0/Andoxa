"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "messagerie-attachments";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export interface UploadedAttachment {
  url: string;
  name: string;
  size: number;
}

/** Signed-URL lifetime for outbound attachments (1 year). Long enough for the
 *  recipient's provider (LinkedIn / WhatsApp) to fetch and re-fetch, while the
 *  bucket itself stays private (objects aren't publicly listable/guessable). */
const SIGNED_URL_TTL_S = 60 * 60 * 24 * 365;

/**
 * Uploads a single file to the (private) `messagerie-attachments` bucket and
 * returns a signed URL. Files live under
 * `<organization_id>/<timestamp>_<filename>` so RLS (migration 046)
 * scopes uploads + reads to org members.
 *
 * The bucket is NOT public — we hand a time-limited signed URL to the message
 * draft so the recipient's provider can still download the file without the
 * whole bucket being world-readable.
 *
 * Returns null on failure — the composer surfaces a toast and
 * doesn't insert anything into the draft.
 */
export async function uploadMessagerieAttachment(
  file: File,
  organizationId: string,
): Promise<UploadedAttachment | null> {
  if (!file || file.size <= 0) return null;
  if (file.size > MAX_BYTES) return null;

  const supabase = createClient();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const path = `${organizationId}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.error("[messagerie] upload failed", error.message);
    return null;
  }

  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_S);
  if (signErr || !data?.signedUrl) {
    console.error("[messagerie] sign failed", signErr?.message);
    return null;
  }

  return { url: data.signedUrl, name: file.name, size: file.size };
}
