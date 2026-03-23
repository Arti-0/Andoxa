"use client";

// Force Sentry client SDK to load in the browser (fixes window.Sentry undefined)
import "../../sentry.client.config";

export function SentryClientInit({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
