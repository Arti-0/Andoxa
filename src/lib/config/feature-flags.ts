/**
 * Feature flags — two families, one registry.
 *
 * 1. Legacy infra flags (`ENABLE_*`): client-visible `NEXT_PUBLIC_*` toggles.
 *    Each honours a legacy `NEXT_PUBLIC_ENABLE_V2_*` alias so existing
 *    deployments keep working. Prefer the canonical `NEXT_PUBLIC_ENABLE_*`.
 *
 * 2. Experiment flags ("#FF"): lightweight, ZERO-runtime-cost toggles for
 *    features we may want to revert quickly. When you build an experimental
 *    feature, mark it in code with a `// #FF: <flagName>` comment and gate it
 *    behind a flag here. To revert, flip the `default` below (or set the env
 *    var) — no code surgery.
 *
 * Why this is free at runtime: every flag resolves to a plain boolean at
 * *module load*. The only dynamic input is `NEXT_PUBLIC_*`, which Next inlines
 * at build time — no network/DB call, no React state, no effect. Reading a flag
 * is a single property access; gating a component adds no render pass.
 *
 * Toggling an experiment flag:
 *  - Default (fastest): edit its `default` in EXPERIMENT_FLAGS below.
 *  - Per-env without code change: set NEXT_PUBLIC_FEATURE_<FLAG>=true|false
 *    (e.g. NEXT_PUBLIC_FEATURE_WORKFLOWS=true). Requires a rebuild/redeploy.
 */

function boolFromEnv(primary: string, legacy?: string): boolean {
  return (
    process.env[primary] === "true" ||
    (legacy != null ? process.env[legacy] === "true" : false)
  );
}

/**
 * Resolve an experiment flag: env override wins, otherwise the baked default.
 * `NEXT_PUBLIC_FEATURE_*` is statically replaced by the bundler, so this
 * collapses to a constant in the client bundle.
 */
function experimentFromEnv(flagKey: string, defaultValue: boolean): boolean {
  const envValue =
    process.env[`NEXT_PUBLIC_FEATURE_${flagKey.toUpperCase()}`];
  if (envValue === "true") return true;
  if (envValue === "false") return false;
  return defaultValue;
}

/**
 * Experiment (#FF) defaults. The `default` reflects the *current intended
 * production state*; flip it to revert an experiment.
 */
const EXPERIMENT_FLAGS = {
  /**
   * Workflows / sequences. Not enterprise-ready yet — held off for launch.
   * Gates: CRM "Workflows" column, workflow nav entries, add-to-workflow
   * actions, and dashboard references to workflows.
   */
  workflows: experimentFromEnv("workflows", false),

  /** #FF — org avatar next to the dashboard "Bonjour <name>" greeting. */
  dashboardAvatarGreeting: experimentFromEnv("dashboardAvatarGreeting", true),

  /** #FF — "Top deals en cours" + "Deals à risque" cards (removed for now). */
  dashboardDealCards: experimentFromEnv("dashboardDealCards", false),

  /**
   * Prospect tags. Main use was workflows (held off) and there's no way to
   * apply a tag to a prospect yet — hidden until both exist. Gates: CRM filter
   * tag section + tag management in pipeline settings.
   */
  tags: experimentFromEnv("tags", false),

  /**
   * #FF — CSV export on the campaign DETAIL page's prospects datatable.
   * Held off for now (the list-level export covers the main need).
   */
  campaignDetailExport: experimentFromEnv("campaignDetailExport", false),

  /**
   * #FF — "Aperçu instantané" on the campaign detail message card: a
   * per-prospect dropdown that interpolates the template against a chosen
   * prospect (with avatars). Nice but heavy — gated until optimised.
   */
  campaignInstantPreview: experimentFromEnv("campaignInstantPreview", false),

  /**
   * WhatsApp. Held off (separate from workflows). Gates the WhatsApp channel
   * UI in Messagerie (filter + marks), the WhatsApp template channel option,
   * and the no-show / follow-up-message solution.
   */
  whatsapp: experimentFromEnv("whatsapp", false),

  /**
   * #FF — "Hors CRM" filter in Messagerie (conversations with no linked
   * prospect). Kept off until the unlinked-chat experience is fleshed out.
   */
  messagerieHorsCrm: experimentFromEnv("messagerieHorsCrm", false),
} as const;

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

  // --- Experiment (#FF) flags ---
  ...EXPERIMENT_FLAGS,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

/** Experiment (#FF) flag names only — narrower type for the <Flag> gate. */
export type ExperimentFlag = keyof typeof EXPERIMENT_FLAGS;

/**
 * Check whether a named flag is enabled. Constant-time, no side effects.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}

/**
 * Ergonomic hook for client components. It does not subscribe to anything
 * (flags are static), so it never triggers a re-render — it just reads the
 * resolved constant. Kept as a hook purely for call-site readability.
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
