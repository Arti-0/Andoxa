"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "messagerie-attachments";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export interface UploadedAttachment {
  url: string;
  name: string;
  size: number;
}

/**
 * Uploads a single file to the `messagerie-attachments` bucket and
 * returns its public URL. Files live under
 * `<organization_id>/<timestamp>_<filename>` so RLS (migration 046)
 * scopes uploads to org members.
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

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) return null;

  return { url: data.publicUrl, name: file.name, size: file.size };
}
