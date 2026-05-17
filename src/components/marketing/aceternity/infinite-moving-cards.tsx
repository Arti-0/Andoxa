"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Item = { quote?: string; name?: string; title?: string };

/** Horizontal track of cards looping seamlessly via a CSS keyframe. */
export function InfiniteMovingCards({
  items,
  direction = "left",
  speed = "normal",
  pauseOnHover = true,
  variant = "light",
  className,
}: {
  items: Item[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  variant?: "light" | "dark";
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);
  const [start, setStart] = React.useState(false);

  React.useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return;
    const scrollerContent = Array.from(scrollerRef.current.children);
    scrollerContent.forEach((item) => {
      const dup = item.cloneNode(true);
      scrollerRef.current?.appendChild(dup);
    });
    containerRef.current.style.setProperty(
      "--animation-direction",
      direction === "left" ? "forwards" : "reverse",
    );
    const dur = speed === "fast" ? "30s" : speed === "slow" ? "100s" : "55s";
    containerRef.current.style.setProperty("--animation-duration", dur);
    setStart(true);
  }, [direction, speed]);

  const isDark = variant === "dark";

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-10 max-w-full overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,white_5%,white_95%,transparent)]",
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap gap-5 py-4",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
      >
        {items.map((item, i) => (
          <li
            key={i}
            className={cn(
              "relative w-[300px] shrink-0 rounded-xl px-6 py-5 sm:w-[400px]",
              isDark
                ? "border border-white/15 bg-white/5 backdrop-blur-sm"
                : "border border-[var(--border)] bg-card",
            )}
          >
            {item.quote && (
              <p className={cn("text-sm leading-6", isDark ? "text-white/90" : "text-foreground")}>
                {item.quote}
              </p>
            )}
            {(item.name || item.title) && (
              <div className="mt-4 flex items-center gap-2">
                {item.name && (
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isDark ? "text-white" : "text-foreground",
                    )}
                  >
                    {item.name}
                  </span>
                )}
                {item.title && (
                  <span
                    className={cn(
                      "text-xs",
                      isDark ? "text-white/55" : "text-muted-foreground",
                    )}
                  >
                    · {item.title}
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
