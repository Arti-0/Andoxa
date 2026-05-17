"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AndoxaWordmark } from "@/components/marketing/icons/brand-icons";

/**
 * Homepage load animation. A branded overlay covers the viewport on first
 * paint, then fades out — the page (and its heavier client sections) render
 * underneath while it's up, so the reveal feels smooth rather than janky.
 * One-shot per mount; respects prefers-reduced-motion.
 */
export function HomeIntro() {
  const reduce = useReducedMotion();
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDone(true), reduce ? 0 : 900);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="home-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] grid place-items-center bg-background"
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96, y: 6 }}
            animate={reduce ? undefined : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4"
          >
            <AndoxaWordmark height={34} />
            <span className="h-0.5 w-24 overflow-hidden rounded-full bg-[var(--neutral-200)]">
              <motion.span
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: reduce ? 0 : 0.85, ease: [0.16, 1, 0.3, 1] }}
                className="block h-full w-full bg-[var(--brand-blue)]"
              />
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
