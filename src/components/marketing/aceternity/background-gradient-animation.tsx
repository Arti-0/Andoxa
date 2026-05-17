"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Slowly drifting radial gradients blurred together. Andoxa brand colors. */
export function BackgroundGradientAnimation({
  children,
  containerClassName,
  className,
  size = "80%",
  blendingValue = "hard-light",
}: {
  children?: React.ReactNode;
  containerClassName?: string;
  className?: string;
  size?: string;
  blendingValue?: React.CSSProperties["mixBlendMode"];
}) {
  return (
    <div
      className={cn(
        "relative isolate h-full w-full overflow-hidden rounded-[inherit]",
        containerClassName,
      )}
      style={{
        ["--first" as string]: "0, 82, 217",
        ["--second" as string]: "26, 106, 255",
        ["--third" as string]: "255, 103, 0",
        ["--fourth" as string]: "0, 82, 217",
        ["--blob-size" as string]: size,
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 [filter:url(#blob-blur)_blur(40px)]",
          className,
        )}
        style={{ mixBlendMode: blendingValue }}
      >
        <Blob color="var(--first)" duration="20s" x="10%" y="10%" opacity={0.55} />
        <Blob color="var(--second)" duration="32s" x="70%" y="20%" opacity={0.4} reverse />
        <Blob color="var(--third)" duration="42s" x="60%" y="80%" opacity={0.35} />
        <Blob color="var(--fourth)" duration="28s" x="20%" y="65%" opacity={0.45} reverse />
      </div>

      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id="blob-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

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
}: {
  color: string;
  duration: string;
  x: string;
  y: string;
  opacity: number;
  reverse?: boolean;
}) {
  const styleId = React.useId().replace(/[:]/g, "");
  return (
    <>
      <style>{`
        @keyframes drift-${styleId} {
          0% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          25% { transform: translate(-50%, -50%) translate(40px, -30px) scale(1.05); }
          50% { transform: translate(-50%, -50%) translate(10px, 60px) scale(0.95); }
          75% { transform: translate(-50%, -50%) translate(-30px, 20px) scale(1.08); }
          100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
        }
      `}</style>
      <div
        className="absolute h-[var(--blob-size)] w-[var(--blob-size)] rounded-full"
        style={{
          left: x,
          top: y,
          background: `radial-gradient(circle at center, rgba(${color}, ${opacity}) 0%, rgba(${color}, 0) 60%)`,
          animation: `drift-${styleId} ${duration} ${
            reverse ? "ease-in-out reverse" : "ease-in-out"
          } infinite`,
          willChange: "transform",
        }}
      />
    </>
  );
}
