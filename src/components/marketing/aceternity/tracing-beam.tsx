"use client";

import * as React from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { cn } from "@/lib/utils";

/** Vertical line that traces scroll progress along the section content. */
export function TracingBeam({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const contentRef = React.useRef<HTMLDivElement>(null);
  const [svgHeight, setSvgHeight] = React.useState(0);

  React.useEffect(() => {
    if (contentRef.current) {
      const update = () => setSvgHeight(contentRef.current?.offsetHeight ?? 0);
      update();
      const ro = new ResizeObserver(update);
      ro.observe(contentRef.current);
      return () => ro.disconnect();
    }
  }, []);

  const y1 = useSpring(useTransform(scrollYProgress, [0, 0.8], [50, svgHeight]), {
    stiffness: 500,
    damping: 90,
  });
  const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [50, svgHeight - 200]), {
    stiffness: 500,
    damping: 90,
  });

  const dotY = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    dotY.set(v * (svgHeight - 50) + 50);
  });

  return (
    <div ref={ref} className={cn("relative mx-auto h-full w-full max-w-4xl", className)}>
      <div className="absolute -left-4 top-3 md:-left-20">
        <motion.div
          transition={{ duration: 0.2, delay: 0.5 }}
          animate={{ boxShadow: "rgba(0, 82, 217, 0.55) 0px 0px 0px 0px" }}
          className="ml-[27px] flex h-4 w-4 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-card shadow-sm"
        >
          <motion.div
            animate={{
              backgroundColor: "var(--brand-blue)",
              borderColor: "var(--brand-blue-dark)",
            }}
            className="h-2 w-2 rounded-full border border-[var(--brand-blue-dark)] bg-[var(--brand-blue)]"
          />
        </motion.div>
        <svg
          viewBox={`0 0 20 ${svgHeight}`}
          width="20"
          height={svgHeight}
          aria-hidden="true"
          className="ml-4 block"
        >
          <motion.path
            d={`M 1 0 V ${svgHeight}`}
            fill="none"
            stroke="var(--neutral-200)"
            strokeOpacity="0.7"
            transition={{ duration: 10 }}
          />
          <motion.path
            d={`M 1 0 V ${svgHeight}`}
            fill="none"
            stroke="url(#beam-gradient)"
            strokeWidth="2"
            transition={{ duration: 10 }}
          />
          <defs>
            <motion.linearGradient
              id="beam-gradient"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={y1}
              y2={y2}
            >
              <stop stopColor="var(--brand-blue)" stopOpacity="0" />
              <stop stopColor="var(--brand-blue)" />
              <stop offset="0.325" stopColor="var(--brand-blue-light)" />
              <stop offset="1" stopColor="var(--brand-orange)" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </svg>
      </div>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
