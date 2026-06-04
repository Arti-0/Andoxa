/**
 * optimize-image.js — Compress + format an existing image into the hero PNG.
 *
 * Use this to turn YOUR own screenshot file into the optimised hero asset
 * (same Sharp pipeline used elsewhere): downscale to a sensible width and
 * palette-compress to a small, crisp PNG at public/dashboard-hero.png.
 *
 * Usage:
 *   node optimize-image.js <chemin-vers-ton-image>
 *   node optimize-image.js ./mon-dashboard.png
 *
 * Env:
 *   OUT          output path   (default public/dashboard-hero.png)
 *   WIDTH        target width  (default 1920)
 */
const sharp = require("sharp");

const INPUT = process.argv[2] || process.env.INPUT;
const OUT = process.env.OUT || "public/dashboard-hero.png";
const WIDTH = Number(process.env.WIDTH || 1920);

if (!INPUT) {
  console.error(
    "\n❌ Indique le chemin de ton image :\n   node optimize-image.js ./ton-image.png\n",
  );
  process.exit(1);
}

(async () => {
  const before = (await sharp(INPUT).metadata());
  await sharp(INPUT)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .png({ quality: 90, compressionLevel: 9, effort: 10, palette: true })
    .toFile(OUT);
  const after = await sharp(OUT).metadata();
  const fs = require("fs");
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(
    `\n📸 ${OUT} — ${after.width}×${after.height}px, ${kb} Ko` +
      `  (source: ${before.width}×${before.height}px)\n`,
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
