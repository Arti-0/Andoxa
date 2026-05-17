"use client";

import * as React from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";

type Card = {
  title: string;
  description: string;
  content: React.ReactNode;
};

/** Left column scrolls; right column stays sticky, swapping to the active card. */
export function StickyScrollReveal({
  content,
  className,
}: {
  content: Card[];
  className?: string;
}) {
  const [active, setActive] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(content.length - 1, Math.floor(v * content.length * 0.999));
    if (idx !== active) setActive(idx);
  });

  return (
    <div ref={ref} className={cn("relative mx-auto flex w-full max-w-6xl gap-8 px-4", className)}>
      <div className="relative flex-1 py-20">
        {content.map((item, i) => (
          <div key={item.title + i} className="my-24 min-h-[40vh] sm:my-32 lg:min-h-[50vh]">
            <motion.h3
              animate={{ opacity: active === i ? 1 : 0.3 }}
              transition={{ duration: 0.4 }}
              className="font-display text-3xl text-foreground sm:text-4xl"
            >
              {item.title}
            </motion.h3>
            <motion.p
              animate={{ opacity: active === i ? 1 : 0.3 }}
              transition={{ duration: 0.4 }}
              className="mt-4 max-w-md text-base leading-7 text-muted-foreground sm:text-lg"
            >
              {item.description}
            </motion.p>
          </div>
        ))}
      </div>

      <div className="hidden flex-1 lg:block">
        <div className="sticky top-24 h-[60vh]">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-card shadow-sm"
          >
            {content[active].content}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
