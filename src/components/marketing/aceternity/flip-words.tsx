"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/** Cycles through words with a flip (y-translate + skew) animation. */
export function FlipWords({
  words,
  duration = 2500,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, duration);
    return () => clearInterval(id);
  }, [words.length, duration]);

  return (
    <span className="relative inline-block align-baseline">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: "0.45em", skewY: "6deg" }}
          animate={{ opacity: 1, y: 0, skewY: "0deg" }}
          exit={{ opacity: 0, y: "-0.4em", skewY: "-4deg" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "inline-block whitespace-nowrap text-[var(--brand-blue)]",
            className,
          )}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
