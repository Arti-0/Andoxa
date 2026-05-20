"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * EmbeddedPage — renders a self-contained Andoxa mockup (HTML + React via
 * Babel standalone) inside a non-interactive, style-isolated iframe.
 *
 *  - Style isolation : guaranteed by the iframe document boundary, no CSS
 *    from the embedded mockup can leak into the marketing site.
 *  - Non-interactive : pointer-events disabled on the iframe, tabIndex -1,
 *    aria-hidden. The visual remains "alive" (intrinsic animations like
 *    pulsing dots still play), but the visitor can't click anything inside.
 *  - Lazy-mount     : iframe is only injected once the wrapper enters
 *    the viewport, to avoid pulling 600 KB of CDN scripts (React + Babel +
 *    Tailwind) for every mockup before they are actually visible.
 *  - Auto-scaling   : the wrapper has its own aspect ratio and width ; the
 *    iframe content renders at its native design size (1440 × 900 by default)
 *    and is scaled down via CSS transform so it fits the wrapper exactly.
 */
export function EmbeddedPage({
  src,
  title,
  className,
  designWidth = 1440,
  designHeight = 900,
  eager = false,
}: {
  src: string;
  title: string;
  className?: string;
  designWidth?: number;
  designHeight?: number;
  /** Mount the iframe immediately without waiting for it to enter the viewport. */
  eager?: boolean;
}) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [mounted, setMounted] = React.useState(eager);

  React.useEffect(() => {
    if (mounted) return;
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setMounted(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mounted]);

  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / designWidth);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);

  return (
    <div
      ref={wrapperRef}
      className={cn("relative w-full overflow-hidden bg-white", className)}
      style={{ aspectRatio: `${designWidth} / ${designHeight}` }}
    >
      {mounted && (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{
            width: designWidth,
            height: designHeight,
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  );
}
