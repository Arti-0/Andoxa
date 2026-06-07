"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Soft radial brand gradients blurred together (Andoxa colors).
 *
 * Static by default: a large blurred layer is cheap to composite as long as it
 * does NOT repaint every frame. The previous version animated 4 blobs through
 * an SVG "goo" filter (feGaussianBlur + feColorMatrix) + blur(40px) + mix-blend,
 * which forced a full re-rasterization each frame and stuttered badly while
 * Lenis was driving the scroll. We dropped the SVG filter (kept a cheap CSS
 * blur) and made the drift opt-in via `animate` (off by default).
 */
export function BackgroundGradientAnimation({
  children,
  containerClassName,
  className,
  size = "80%",
  blendingValue = "normal",
  animate = false,
}: {
  children?: React.ReactNode;
  containerClassName?: string;
  className?: string;
  size?: string;
  blendingValue?: React.CSSProperties["mixBlendMode"];
  animate?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative isolate h-full w-full overflow-hidden rounded-[inherit]",
        containerClassName,
      )}
      style={{ ["--blob-size" as string]: size }}
    >
      <div
        className={cn("pointer-events-none absolute inset-0 [filter:blur(44px)]", className)}
        style={{
          ...(blendingValue && blendingValue !== "normal" ? { mixBlendMode: blendingValue } : null),
          transform: "translateZ(0)",
        }}
      >
        <Blob color="0, 82, 217" x="10%" y="10%" opacity={0.6} duration="20s" animate={animate} />
        <Blob color="26, 106, 255" x="70%" y="20%" opacity={0.52} duration="32s" reverse animate={animate} />
        <Blob color="255, 103, 0" x="60%" y="80%" opacity={0.42} duration="42s" animate={animate} />
        <Blob color="0, 82, 217" x="20%" y="65%" opacity={0.55} duration="28s" reverse animate={animate} />
      </div>

      {children}
    </div>
  );
}

function Blob({
  color,
  duration,
  x,
  y,
  opacity,
  reverse,
  animate,
}: {
  color: string;
  duration: string;
  x: string;
  y: string;
  opacity: number;
  reverse?: boolean;
  animate?: boolean;
}) {
  const styleId = React.useId().replace(/[:]/g, "");
  return (
    <>
      {animate && (
        <style>{`
          @keyframes drift-${styleId} {
            0% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
            25% { transform: translate(-50%, -50%) translate(40px, -30px) scale(1.05); }
            50% { transform: translate(-50%, -50%) translate(10px, 60px) scale(0.95); }
            75% { transform: translate(-50%, -50%) translate(-30px, 20px) scale(1.08); }
            100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            .blob-${styleId} { animation: none !important; }
          }
        `}</style>
      )}
      <div
        className={cn("absolute h-[var(--blob-size)] w-[var(--blob-size)] rounded-full", `blob-${styleId}`)}
        style={{
          left: x,
          top: y,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle at center, rgba(${color}, ${opacity}) 0%, rgba(${color}, 0) 60%)`,
          ...(animate
            ? {
                animation: `drift-${styleId} ${duration} ${
                  reverse ? "ease-in-out reverse" : "ease-in-out"
                } infinite`,
                willChange: "transform",
              }
            : null),
        }}
      />
    </>
  );
}
