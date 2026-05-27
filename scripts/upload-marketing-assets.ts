/**
 * Upload every marketing asset under public/screenshots/ and public/logos/
 * to the public `homepage-assets` Supabase bucket. Files keep their relative
 * path inside the bucket (e.g. `screenshots/02-dashboard.png`).
 *
 * Usage:
 *   bun run scripts/upload-marketing-assets.ts
 *
 * The bucket itself is provisioned by migration
 *   20260519140000_homepage_assets_storage.sql
 * which makes it public-read; uploads here run with the service role so RLS
 * is bypassed.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { loadEnv } from "./lib/load-env";
import { HOMEPAGE_ASSETS_BUCKET } from "./lib/screenshot-config";

loadEnv();

const PROJECT_ROOT = process.cwd();

/** Directories under public/ whose contents we mirror into the bucket. */
const ASSET_DIRS = ["screenshots", "logos"] as const;

const SKIP_FILES = new Set([".gitkeep", ".DS_Store"]);

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";
}

function walk(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_FILES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, base));
    } else if (entry.isFile()) {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY in env",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Uploading to bucket "${HOMEPAGE_ASSETS_BUCKET}" at ${supabaseUrl}\n`);

  let uploaded = 0;
  let failed = 0;

  for (const dirName of ASSET_DIRS) {
    const localDir = path.join(PROJECT_ROOT, "public", dirName);
    if (!fs.existsSync(localDir)) {
      console.log(`Skipping ${dirName}/ — not found`);
      continue;
    }

    const files = walk(localDir);
    console.log(`${dirName}/  (${files.length} file${files.length === 1 ? "" : "s"})`);

    for (const relative of files) {
      const localPath = path.join(localDir, relative);
      // Forward-slashes for the storage key — Windows separators would
      // produce weird URLs like `screenshots\\02-…`.
      const storageKey = `${dirName}/${relative.split(path.sep).join("/")}`;
      const buffer = fs.readFileSync(localPath);

      const { error } = await supabase.storage
        .from(HOMEPAGE_ASSETS_BUCKET)
        .upload(storageKey, buffer, {
          upsert: true,
          contentType: contentTypeFor(localPath),
          cacheControl: "31536000",
        });

      if (error) {
        console.error(`  ✗ ${storageKey} — ${error.message}`);
        failed += 1;
        continue;
      }
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${HOMEPAGE_ASSETS_BUCKET}/${storageKey}`;
      console.log(`  ✓ ${storageKey}`);
      console.log(`     ${publicUrl}`);
      uploaded += 1;
    }
    console.log();
  }

  console.log(`Done. uploaded=${uploaded} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
