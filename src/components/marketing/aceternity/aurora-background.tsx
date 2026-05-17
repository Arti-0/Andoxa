"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Aurora Background — animated gradient bands. Andoxa brand-blue palette,
 * soft radial mask so the effect fades into the section edges.
 */
export function AuroraBackground({
  className,
  showRadialGradient = true,
}: {
  className?: string;
  showRadialGradient?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className={cn(
          "absolute -inset-[10px] opacity-50 blur-[10px]",
          "[--white-gradient:repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)]",
          "[--brand-gradient:repeating-linear-gradient(100deg,#003EA3_10%,#0052D9_15%,#1A6AFF_20%,#003EA3_30%,#0052D9_45%)]",
          "[background-image:var(--white-gradient),var(--brand-gradient)]",
          "[background-size:300%_,_200%]",
          "[background-position:50%_50%,_50%_50%]",
          "after:absolute after:inset-0",
          "after:[background-image:var(--white-gradient),var(--brand-gradient)]",
          "after:[background-size:200%_,_100%]",
          "after:mix-blend-difference after:animate-aurora",
          "after:[background-attachment:fixed]",
          showRadialGradient &&
            "[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]",
        )}
      />
    </div>
  );
}
