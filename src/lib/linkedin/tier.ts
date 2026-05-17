/**
 * LinkedIn product tier for quotas and UX (distinct from Stripe plan).
 *
 * Sales Navigator detection is heuristic on Unipile `premium_features` until Phase 9+ list-import.
 * Tune `looksLikeSalesNavigator` when real feature strings from production are confirmed.
 */

export type LinkedInAccountTier = "standard" | "premium" | "sales_navigator";

const SN_SUBSTRINGS = [
  "sales_navigator",
  "salesnavigator",
  "sales navigator",
  "linkedin sales navigator",
  "ln_sales_nav",
];

/**
 * Infer tier from persisted Unipile account fields (`user_unipile_accounts`).
 */
export function inferLinkedInAccountTier(
  isPremium: boolean | null | undefined,
  premiumFeatures?: string[] | null
): LinkedInAccountTier {
  const features = Array.isArray(premiumFeatures) ? premiumFeatures : [];
  const blob = features.map((t) => String(t).trim().toLowerCase()).join(" ");

  if (looksLikeSalesNavigator(features, blob)) {
    return "sales_navigator";
  }
  if (isPremium) {
    return "premium";
  }
  return "standard";
}

function looksLikeSalesNavigator(
  rawFeatures: string[],
  lowercaseBlob: string
): boolean {
  for (const s of SN_SUBSTRINGS) {
    if (lowercaseBlob.includes(s)) return true;
  }
  const joinedSlash = lowercaseBlob.replace(/\s+/g, "");
  return rawFeatures.some((f) => /\bsales\s*navigator\b/i.test(String(f)));
}

/** Invite + note style actions that require a paid LinkedIn product (Premium or Navigator). */
export function tierSupportsPremiumInviteFeatures(tier: LinkedInAccountTier): boolean {
  return tier === "premium" || tier === "sales_navigator";
}
