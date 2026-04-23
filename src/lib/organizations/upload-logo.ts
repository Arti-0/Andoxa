"use client";

import { createClient } from "@/lib/supabase/client";
import { optimizeImage, validateImageFile } from "@/lib/utils/image-optimization";

/**
 * Upload an org logo file to Supabase Storage and return the public URL.
 * Does NOT update the database — callers are responsible for persisting the URL.
 *
 * Returns null on any error (over-limit, upload failure, etc.) — errors are
 * swallowed so upload failure doesn't break the calling UI.
 */
export async function uploadOrgLogo(
  file: File,
  orgId: string
): Promise<string | null> {
  if (!file || file.size <= 0) return null;

  let uploadBody: File = file;
  if (file.type !== "image/svg+xml") {
    const optimized = await optimizeImage(file, 512, 512, 0.85);
    if (optimized) uploadBody = optimized;
  }

  const sizeErr = validateImageFile(uploadBody, 2);
  if (sizeErr) return null;

  const supabase = createClient();
  const ext = uploadBody.name.split(".").pop() || "png";
  const storagePath = `${orgId}/logo.${ext}`;
  const contentType =
    uploadBody.type?.startsWith("image/") ? uploadBody.type : "image/png";

  const { error: upErr } = await supabase.storage
    .from("org-logos")
    .upload(storagePath, uploadBody, { upsert: true, contentType });

  if (upErr) {
    console.error("uploadOrgLogo: storage upload failed", upErr);
    return null;
  }

  const { data: pub } = supabase.storage
    .from("org-logos")
    .getPublicUrl(storagePath);

  if (!pub?.publicUrl) return null;
  // Append cache-buster so the browser fetches the latest version after re-upload
  return `${pub.publicUrl}?t=${Date.now()}`;
}
