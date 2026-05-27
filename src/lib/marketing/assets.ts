/**
 * URL builder for marketing-page assets stored in the public `homepage-assets`
 * Supabase Storage bucket.
 *
 * Why Supabase Storage instead of /public:
 *   • Vercel deploys had intermittent issues serving the multi-megabyte
 *     screenshot PNGs from /public.
 *   • Storage gives us a CDN with proper caching headers, server-side
 *     versioning via upsert, and removes the need to bloat git with binary.
 *
 * The bucket is provisioned by:
 *   supabase/migrations/20260519140000_homepage_assets_storage.sql
 * Uploads are driven by:
 *   scripts/upload-marketing-assets.ts
 *
 * `assetPath` is the path INSIDE the bucket, e.g.
 *   marketingAsset("screenshots/02-dashboard.png")
 *   marketingAsset("logos/LinkedIn_Symbol_0.svg")
 *
 * The helper falls back to the local `/<path>` if no Supabase URL is wired —
 * so local dev keeps working without env config when files are present in
 * /public.
 */

const BUCKET = "homepage-assets";

function publicBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}`;
}

export function marketingAsset(assetPath: string): string {
  const clean = assetPath.replace(/^\/+/, "");
  const base = publicBaseUrl();
  if (!base) return `/${clean}`;
  return `${base}/${clean}`;
}
