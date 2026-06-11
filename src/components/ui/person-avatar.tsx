"use client";

import { useState } from "react";

/**
 * Small round avatar for a person (prospect, contact…).
 *
 * Deliberately a plain <img>, NOT next/image: the source URLs are LinkedIn
 * `media.licdn.com` links that are signed/expiring and hotlink-protected.
 * Routing them through Vercel's image optimizer would both cost per-transform
 * and break (the optimizer caches expiring URLs and can't send a no-referrer
 * request). A plain <img> with `referrerPolicy="no-referrer"` loads them
 * client-side at zero optimization cost, lazily, and falls back to initials
 * when the URL is missing, expired, or blocked.
 */

function initialsFrom(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "?";
  return (
    n
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/** Deterministic background colour from the name, so the fallback is stable. */
const FALLBACK_COLORS = [
  "#0052D9",
  "#FF6700",
  "#5B2EBF",
  "#0E7A3A",
  "#B91C1C",
  "#0891B2",
  "#9333EA",
  "#65A30D",
];
function colorFrom(name: string | null | undefined): string {
  const n = (name ?? "").trim() || "?";
  let hash = 0;
  for (const c of n) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]!;
}

export function PersonAvatar({
  name,
  src,
  size = 28,
  className = "",
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = !!src && !broken;

  if (showImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src!}
        alt={name ?? ""}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        background: colorFrom(name),
        fontSize: size * 0.4,
      }}
    >
      {initialsFrom(name)}
    </span>
  );
}
