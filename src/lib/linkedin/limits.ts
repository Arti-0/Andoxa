/** Limites LinkedIn par type d'action et niveau de compte */
export const LINKEDIN_LIMITS = {
  invite: {
    maxChars: {
      premium: 300,
      free: 200,
    },
    perWeek: {
      premium: "jusqu'à 100 / jour",
      free: "~15 / semaine (avec note) · ~150 / semaine (sans note)",
    },
  },
  contact: {
    maxChars: { premium: 2000, free: 2000 },
    perHour: { premium: "~30–50", free: "~20–30" },
  },
} as const;

export function getInviteMaxChars(isPremium: boolean): number {
  return isPremium
    ? LINKEDIN_LIMITS.invite.maxChars.premium
    : LINKEDIN_LIMITS.invite.maxChars.free;
}

export function getContactMaxChars(): number {
  return LINKEDIN_LIMITS.contact.maxChars.free;
}

export function getMaxCharsForMode(
  mode: "invite" | "contact",
  isPremium: boolean
): number {
  return mode === "invite" ? getInviteMaxChars(isPremium) : getContactMaxChars();
}

export function getInviteLimitLabel(isPremium: boolean): string {
  return isPremium
    ? LINKEDIN_LIMITS.invite.perWeek.premium
    : LINKEDIN_LIMITS.invite.perWeek.free;
}

export function getContactLimitLabel(isPremium: boolean): string {
  return isPremium
    ? `messages ~${LINKEDIN_LIMITS.contact.perHour.premium} / heure`
    : `messages ~${LINKEDIN_LIMITS.contact.perHour.free} / heure`;
}

/** Plafonds hebdo pour `usage_counters` (action `linkedin_invite`) — CRM + campagnes */
export const LINKEDIN_INVITE_WEEKLY_USAGE_CAP = {
  free: 15,
  premium: 200,
} as const;

export function getLinkedInInviteWeeklyUsageCap(isPremium: boolean): number {
  return isPremium
    ? LINKEDIN_INVITE_WEEKLY_USAGE_CAP.premium
    : LINKEDIN_INVITE_WEEKLY_USAGE_CAP.free;
}
