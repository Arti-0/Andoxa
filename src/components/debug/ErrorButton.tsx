"use client";

import * as Sentry from "@sentry/nextjs";

/**
 * Test button to verify Sentry error tracking.
 * Remove or hide in production after verification.
 */
export function ErrorButton() {
  return (
    <button
      type="button"
      onClick={() => {
        throw new Error("This is your first error!");
      }}
      className="fixed bottom-4 right-4 z-50 rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-400"
      title="Test Sentry (remove after verification)"
    >
      Test Sentry
    </button>
  );
}
