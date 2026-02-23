/**
 * Feature Flags for v2.0.0
 * 
 * Control the rollout of new features independently.
 * Set to true to enable, false to disable.
 * 
 * Usage:
 *   import { featureFlags } from '@/lib/config/feature-flags';
 *   if (featureFlags.ENABLE_V2_HOMEPAGE) { ... }
 */

export const featureFlags = {
  /**
   * Enable the new unified homepage with sections #tarifs and #a-propos
   * Default: false (use old separate pages)
   */
  ENABLE_V2_HOMEPAGE: process.env.NEXT_PUBLIC_ENABLE_V2_HOMEPAGE === 'true',

  /**
   * Enable the new notification system with clickable logo
   * Default: false (use Sonner toasts)
   */
  ENABLE_V2_NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_V2_NOTIFICATIONS === 'true',

  /**
   * Enable the reorganized dashboard sidebar structure
   * Default: false (use old sidebar)
   */
  ENABLE_V2_DASHBOARD: process.env.NEXT_PUBLIC_ENABLE_V2_DASHBOARD === 'true',

  /**
   * Enable lazy loading for /bdd page stats
   * Default: false (load all stats at once)
   */
  ENABLE_V2_BDD_LAZY: process.env.NEXT_PUBLIC_ENABLE_V2_BDD_LAZY === 'true',

  /**
   * Enable Google OAuth authentication
   * Default: false
   */
  ENABLE_GOOGLE_AUTH: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true',
} as const;

export type FeatureFlag = keyof typeof featureFlags;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}

