/**
 * Feature flags (client-visible `NEXT_PUBLIC_*`).
 *
 * TS keys use descriptive names; each flag still honours the legacy
 * `NEXT_PUBLIC_ENABLE_V2_*` env name so existing deployments keep working.
 * Prefer setting the canonical `NEXT_PUBLIC_ENABLE_*` name in new configs.
 */

function boolFromEnv(primary: string, legacy?: string): boolean {
  return (
    process.env[primary] === "true" ||
    (legacy != null ? process.env[legacy] === "true" : false)
  );
}

export const featureFlags = {
  /**
   * Unified marketing homepage sections (#tarifs, etc.).
   * Canonical: NEXT_PUBLIC_ENABLE_MARKETING_HOMEPAGE — legacy alias: …_V2_HOMEPAGE.
   */
  ENABLE_MARKETING_HOMEPAGE: boolFromEnv(
    "NEXT_PUBLIC_ENABLE_MARKETING_HOMEPAGE",
    "NEXT_PUBLIC_ENABLE_V2_HOMEPAGE",
  ),

  /**
   * Notification surface with clickable logo (vs toast-only UX).
   * Canonical: NEXT_PUBLIC_ENABLE_NOTIFICATION_SURFACE — legacy: …_V2_NOTIFICATIONS.
   */
  ENABLE_NOTIFICATION_SURFACE: boolFromEnv(
    "NEXT_PUBLIC_ENABLE_NOTIFICATION_SURFACE",
    "NEXT_PUBLIC_ENABLE_V2_NOTIFICATIONS",
  ),

  /**
   * Reorganized dashboard / app sidebar navigation.
   * Canonical: NEXT_PUBLIC_ENABLE_APP_SIDEBAR_REDESIGN — legacy: …_V2_DASHBOARD.
   */
  ENABLE_APP_SIDEBAR_REDESIGN: boolFromEnv(
    "NEXT_PUBLIC_ENABLE_APP_SIDEBAR_REDESIGN",
    "NEXT_PUBLIC_ENABLE_V2_DASHBOARD",
  ),

  /**
   * Lazy-loaded stats on the `/bdd` page.
   * Canonical: NEXT_PUBLIC_ENABLE_BDD_LAZY_STATS — legacy: …_V2_BDD_LAZY.
   */
  ENABLE_BDD_LAZY_STATS: boolFromEnv(
    "NEXT_PUBLIC_ENABLE_BDD_LAZY_STATS",
    "NEXT_PUBLIC_ENABLE_V2_BDD_LAZY",
  ),

  /**
   * Google OAuth (calendar booking, etc.).
   */
  ENABLE_GOOGLE_AUTH: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true",
} as const;

export type FeatureFlag = keyof typeof featureFlags;

/**
 * Check whether a named flag is enabled.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
