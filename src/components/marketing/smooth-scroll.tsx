"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * Route-change scroll reset for the marketing site.
 *
 * The original site-andoxa used Lenis for inertial smooth-scroll, but `lenis`
 * isn't a dependency here. Rather than add a package, this keeps the part that
 * actually matters for correctness — snapping to top on navigation — and lets
 * the browser's native `scroll-behavior: smooth` (already set in globals.css)
 * handle anchor scrolling. If you later `bun add lenis`, swap this for the
 * full provider.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}
