export const DAILY_QUOTAS = {
  invitations: 80,
  messages: 100,
  profile_views: 80,
} as const;

/** Plafond hebdomadaire maximal côté LinkedIn (invitations) — référence produit */
export const WEEKLY_INVITATION_CAP = 200;

export type QuotaKey = keyof typeof DAILY_QUOTAS;

export function getQuotaColor(used: number, max: number): string {
  if (max <= 0) return "text-emerald-500";
  const pct = used / max;
  if (pct >= 0.9) return "text-red-500";
  if (pct >= 0.7) return "text-amber-500";
  return "text-emerald-500";
}

export function getQuotaBarColor(used: number, max: number): string {
  if (max <= 0) return "bg-emerald-500";
  const pct = used / max;
  if (pct >= 0.9) return "bg-red-500";
  if (pct >= 0.7) return "bg-amber-500";
  return "bg-emerald-500";
}
