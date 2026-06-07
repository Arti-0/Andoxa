"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Scales a fixed-width relief stage to exactly fill its parent column.
 * Sets the CSS var `--rs` (clientWidth / designWidth) on the returned ref,
 * which the module's `.fit` consumes via `transform: scale(var(--rs))`.
 */
export function useReliefScale(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => el.style.setProperty("--rs", String(el.clientWidth / designWidth));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);
  return ref;
}
