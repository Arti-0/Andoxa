import type { SupabaseClient } from "@supabase/supabase-js";
import { weeklyPeriodKey } from "@/lib/campaigns/throttle";
import { getLinkedInInviteWeeklyUsageCap } from "@/lib/linkedin/limits";
import { inferLinkedInAccountTier, type LinkedInAccountTier } from "@/lib/linkedin/tier";
import type { Database } from "@/lib/types/supabase";

export type LinkedInInviteWeeklyQuotaState = {
  tier: LinkedInAccountTier;
  cap: number;
  used: number;
  week: string;
};

export class LinkedInInviteWeeklyQuotaError extends Error {
  readonly code = "LINKEDIN_INVITE_WEEKLY_QUOTA" as const;

  constructor(
    readonly cap: number,
    readonly used: number,
    message?: string
  ) {
    super(
      message ??
        `Limite hebdomadaire d'invitations LinkedIn atteinte (${cap}). Réessayez la semaine prochaine.`
    );
    this.name = "LinkedInInviteWeeklyQuotaError";
  }
}

function toPremiumFeatureStrings(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features.map((x) => String(x));
}

/**
 * Weekly LinkedIn invite usage for `usage_counters.action = linkedin_invite`
 * (campagnes + workflows + plafond partagé avec la limite CRM).
 */
export async function fetchLinkedInInviteWeeklyQuotaState(
  supabase: SupabaseClient<Database>,
  userId: string,
  week: string = weeklyPeriodKey()
): Promise<LinkedInInviteWeeklyQuotaState> {
  const { data: acct } = await supabase
    .from("user_unipile_accounts")
    .select("is_premium, premium_features")
    .eq("user_id", userId)
    .eq("account_type", "LINKEDIN")
    .maybeSingle();

  const tier = inferLinkedInAccountTier(
    acct?.is_premium ?? false,
    toPremiumFeatureStrings(acct?.premium_features)
  );
  const cap = getLinkedInInviteWeeklyUsageCap(tier);

  const { data: counterRow } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("user_id", userId)
    .eq("action", "linkedin_invite")
    .eq("period_key", week)
    .maybeSingle();

  const used = counterRow?.count ?? 0;
  return { tier, cap, used, week };
}

/**
 * Atomically reserves one LinkedIn invite against the weekly cap.
 *
 * Race-free replacement for "fetch quota → check cap in memory → fire-and-forget
 * increment" — backed by the `consume_linkedin_invite_quota` SQL function which
 * does an UPDATE ... WHERE count < cap RETURNING count under a row lock.
 *
 * Returns `{ ok: true, used }` after the increment, or `{ ok: false, used, cap }`
 * if the cap was already reached (no write performed). On a transport/DB error
 * (rare), returns `{ ok: false, used: 0, cap }` and logs to console — callers
 * should treat that as "denied" so we never over-send.
 */
export async function consumeLinkedInInviteQuota(
  supabase: SupabaseClient<Database>,
  userId: string,
  cap: number,
  periodKey: string = weeklyPeriodKey()
): Promise<{ ok: true; used: number } | { ok: false; used: number; cap: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "consume_linkedin_invite_quota",
    {
      p_user_id: userId,
      p_period_key: periodKey,
      p_cap: cap,
    }
  );

  if (error) {
    console.error("[linkedin quota] consume_linkedin_invite_quota rpc error", error);
    return { ok: false, used: 0, cap };
  }

  if (typeof data === "number") {
    return { ok: true, used: data };
  }

  // RPC returned NULL → cap already reached. Re-read the current count for the
  // error message so the user sees the real value (= cap).
  return { ok: false, used: cap, cap };
}

/** Prochain instant UTC où `weeklyPeriodKey(date)` change (compteur hebdo). */
export function nextUtcInstantWhenWeeklyInviteCounterResets(
  from: Date = new Date()
): string {
  const key = weeklyPeriodKey(from);
  let probe = new Date(from.getTime() + 3_600_000);
  const horizon = from.getTime() + 21 * 24 * 3_600_000;
  while (probe.getTime() < horizon) {
    if (weeklyPeriodKey(probe) !== key) {
      return probe.toISOString();
    }
    probe = new Date(probe.getTime() + 3_600_000);
  }
  return new Date(from.getTime() + 7 * 24 * 3_600_000).toISOString();
}
