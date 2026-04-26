"use client";

import { useEffect } from "react";

export function SentryClientInit() {
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      void import("../../sentry.client.config");
    };
    if (
      typeof window !== "undefined" &&
      "requestIdleCallback" in window
    ) {
      const handle = (
        window as Window & {
          requestIdleCallback: (cb: () => void) => number;
          cancelIdleCallback: (h: number) => void;
        }
      ).requestIdleCallback(load);
      return () => {
        cancelled = true;
        (
          window as Window & {
            cancelIdleCallback: (h: number) => void;
          }
        ).cancelIdleCallback(handle);
      };
    }
    const handle = (window as Window).setTimeout(load, 0);
    return () => {
      cancelled = true;
      (window as Window).clearTimeout(handle);
    };
  }, []);
  return null;
}
