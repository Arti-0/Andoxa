/**
 * Limites LinkedIn par type d'action et par palier produit LinkedIn (Standard / Premium / Sales Navigator).
 * Les valeurs restent indicatives ; Phase 9+ affinera (import listes Navigator, quotas réels observés).
 */
import type { LinkedInAccountTier } from "@/lib/linkedin/tier";

export const LINKEDIN_LIMITS = {
  invite: {
    maxChars: {
      standard: 200,
      premium: 300,
      sales_navigator: 300,
    },
    perWeek: {
      standard: "~15 / semaine (avec note) · ~150 / semaine (sans note)",
      premium: "jusqu'à 100 / jour",
      sales_navigator: "pools Navigator (voir docs produit)",
    },
  },
  contact: {
    maxChars: {
      standard: 2000,
      premium: 2000,
      sales_navigator: 2000,
    },
    perHour: {
      standard: "~20–30",
      premium: "~30–50",
      sales_navigator: "~35–55",
    },
  },
} as const;

/** Plafonds hebdo pour `usage_counters` (action `linkedin_invite`) — CRM + campagnes */
export const LINKEDIN_INVITE_WEEKLY_USAGE_CAP: Record<
  LinkedInAccountTier,
  number
> = {
  standard: 200,
  premium: 200,
  sales_navigator: 200,
} as const;

export function getInviteMaxChars(tier: LinkedInAccountTier): number {
  return LINKEDIN_LIMITS.invite.maxChars[tier];
}

export function getContactMaxChars(tier: LinkedInAccountTier): number {
  return LINKEDIN_LIMITS.contact.maxChars[tier];
}

export function getMaxCharsForMode(
  mode: "invite" | "contact",
  tier: LinkedInAccountTier
): number {
  return mode === "invite" ? getInviteMaxChars(tier) : getContactMaxChars(tier);
}

export function getInviteLimitLabel(tier: LinkedInAccountTier): string {
  return LINKEDIN_LIMITS.invite.perWeek[tier];
}

export function getContactLimitLabel(tier: LinkedInAccountTier): string {
  const pace = LINKEDIN_LIMITS.contact.perHour[tier];
  return `messages ~${pace} / heure`;
}

export function getLinkedInInviteWeeklyUsageCap(
  tier: LinkedInAccountTier
): number {
  return LINKEDIN_INVITE_WEEKLY_USAGE_CAP[tier];
}
