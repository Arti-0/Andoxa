import type { SupabaseClient } from "@supabase/supabase-js";
import { dailyPeriodKey, weeklyPeriodKey } from "@/lib/campaigns/throttle";
import {
  computeLinkedInBudget,
  daysSince,
  CREDIBLE_MIN_CONNECTIONS,
  MATURE_PROFILE_MIN_CONNECTIONS,
  type LinkedInBudget,
} from "@/lib/linkedin/pacing";
import { inferLinkedInAccountTier } from "@/lib/linkedin/tier";
import {
  fetchOwnLinkedInProfileSnapshot,
  fetchPendingInvitationsCount,
  type OwnLinkedInProfileSnapshot,
} from "@/lib/unipile/linkedin-own-profile";
import type { Database } from "@/lib/types/supabase";

/** Minimum invites sent (last 30 days) before an acceptance rate is trusted. */
const ACCEPTANCE_MIN_SAMPLE = 10;
const ACCEPTANCE_WINDOW_MS = 30 * 24 * 3_600_000;

/**
 * Thrown when an invite can't be reserved because a pacing cap is reached.
 * Name kept as `LinkedInInviteWeeklyQuotaError` for existing `instanceof` checks;
 * `scope` distinguishes the daily warm-up cap from the weekly ceiling and
 * `retryAfter` is the UTC instant the relevant counter next resets.
 */
export class LinkedInInviteWeeklyQuotaError extends Error {
  readonly code = "LINKEDIN_INVITE_QUOTA" as const;

  constructor(
    readonly cap: number,
    readonly used: number,
    readonly scope: "daily" | "weekly" = "weekly",
    readonly retryAfter: string = nextUtcInstantWhenWeeklyInviteCounterResets(),
    message?: string,
  ) {
    super(
      message ??
        (scope === "daily"
          ? `Budget quotidien d'invitations LinkedIn atteint (${cap}). Andoxa reprendra demain.`
          : `Limite hebdomadaire d'invitations LinkedIn atteinte (${cap}). Réessayez la semaine prochaine.`),
    );
    this.name = "LinkedInInviteWeeklyQuotaError";
  }
}

function toPremiumFeatureStrings(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features.map((x) => String(x));
}

/**
 * Recent invite acceptance over the last 30 days for the user. `rate` is
 * accepted / sent, or `null` when there isn't enough data to trust it; `accepted`
 * is the absolute accepted count. Together they feed the warm-up fast lane (rate
 * + volume floor) and the acceptance brake.
 */
async function fetchRecentAcceptance(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ rate: number | null; accepted: number }> {
  const since = new Date(Date.now() - ACCEPTANCE_WINDOW_MS).toISOString();
  const [sentRes, acceptedRes] = await Promise.all([
    supabase
      .from("prospect_activity")
      .select("*", { count: "exact", head: true })
      .eq("actor_id", userId)
      .eq("action", "linkedin_invite_sent")
      .gte("created_at", since),
    supabase
      .from("prospect_activity")
      .select("*", { count: "exact", head: true })
      .eq("actor_id", userId)
      .eq("action", "linkedin_invite_accepted")
      .gte("created_at", since),
  ]);
  const sent = sentRes.count ?? 0;
  const accepted = acceptedRes.count ?? 0;
  if (sent < ACCEPTANCE_MIN_SAMPLE) return { rate: null, accepted };
  return { rate: Math.min(1, accepted / sent), accepted };
}

export type InviteBudgetState = {
  budget: LinkedInBudget;
  dayKey: string;
  weekKey: string;
};

/** Invites reserved over the rolling last 7 UTC days (all Andoxa paths): the
 *  sum of the daily `linkedin_invite` counters, which `reserve_linkedin_invite`
 *  increments on every send. Feeds the sliding-window weekly budget (LinkedIn
 *  counts a rolling 7 days, not a calendar week). */
async function fetchInvitesUsedLast7Days(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const keys = Array.from({ length: 7 }, (_, i) =>
    dailyPeriodKey(new Date(Date.now() - i * 86_400_000)),
  );
  const { data } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("user_id", userId)
    .eq("action", "linkedin_invite")
    .in("period_key", keys);
  return (data ?? []).reduce((sum, r) => sum + (r.count ?? 0), 0);
}

/** Credibility entry gate: photo + headline + minimum connections. `null`
 *  (unknown profile data) never blocks — the conservative caps protect. */
function isCredibleProfile(
  snapshot: OwnLinkedInProfileSnapshot | null,
): boolean | null {
  if (!snapshot) return null;
  if (!snapshot.hasPhoto || !snapshot.hasHeadline) return false;
  if (
    snapshot.connectionsCount !== null &&
    snapshot.connectionsCount < CREDIBLE_MIN_CONNECTIONS
  ) {
    return false;
  }
  return true;
}

/** Profile-based maturity: 150+ connections and a filled bio. */
function isMatureProfile(snapshot: OwnLinkedInProfileSnapshot | null): boolean {
  return (
    snapshot !== null &&
    snapshot.connectionsCount !== null &&
    snapshot.connectionsCount >= MATURE_PROFILE_MIN_CONNECTIONS &&
    snapshot.hasSummary
  );
}

/**
 * Compute the effective invite budget for a user once (per batch / per send).
 * Reads tier + connection age + account health from `user_unipile_accounts` and
 * a recent acceptance rate, then runs the pure pacing model.
 */
export async function computeInviteBudget(
  supabase: SupabaseClient<Database>,
  userId: string,
  dayKey: string = dailyPeriodKey(),
  weekKey: string = weeklyPeriodKey(),
): Promise<InviteBudgetState> {
  const { data: acct } = await supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id, is_premium, premium_features, created_at, status")
    .eq("user_id", userId)
    .eq("account_type", "LINKEDIN")
    .maybeSingle();

  const tier = inferLinkedInAccountTier(
    acct?.is_premium ?? false,
    toPremiumFeatureStrings(acct?.premium_features),
  );

  // Own-account state via Unipile (Redis-cached: profile 24h, pending 6h).
  // All best-effort: `null` means unknown and the engine degrades safely
  // (gate stays open, breaker stays disarmed, conservative caps protect).
  const accountId = acct?.unipile_account_id ?? null;
  const [acceptance, used7d, snapshot, pendingInvitations] = await Promise.all([
    fetchRecentAcceptance(supabase, userId),
    fetchInvitesUsedLast7Days(supabase, userId),
    accountId ? fetchOwnLinkedInProfileSnapshot(accountId) : Promise.resolve(null),
    accountId ? fetchPendingInvitationsCount(accountId) : Promise.resolve(null),
  ]);

  const budget = computeLinkedInBudget({
    tier,
    daysSinceConnected: daysSince(acct?.created_at),
    acceptanceRate: acceptance.rate,
    acceptedCount: acceptance.accepted,
    healthy: (acct?.status ?? "connected") !== "error",
    invitesUsedLast7Days: used7d,
    pendingInvitations,
    matureProfile: isMatureProfile(snapshot),
    credibleProfile: isCredibleProfile(snapshot),
    verified: snapshot?.isVerified ?? null,
    jitterSeed: `${userId}:${dayKey}`,
  });

  return { budget, dayKey, weekKey };
}

export type ReserveInviteResult =
  | { ok: true; daily: number; weekly: number }
  | { ok: false; scope: "daily" | "weekly"; cap: number; used: number };

/**
 * Atomically reserve one invite slot against the daily + weekly caps in `budget`.
 * Race-free: backed by the `reserve_linkedin_invite` SQL function, which checks
 * and increments both counters under row locks. On any transport/DB error we
 * return `{ ok: false }` so callers treat it as "denied" and never over-send.
 */
export async function reserveInviteSlot(
  supabase: SupabaseClient<Database>,
  userId: string,
  state: InviteBudgetState,
): Promise<ReserveInviteResult> {
  const { budget, dayKey, weekKey } = state;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("reserve_linkedin_invite", {
    p_user_id: userId,
    p_daily_key: dayKey,
    p_daily_cap: budget.inviteDailyCap,
    p_weekly_key: weekKey,
    p_weekly_cap: budget.inviteWeeklyCap,
  });

  if (error) {
    console.error("[linkedin pacing] reserve_linkedin_invite rpc error", error);
    return { ok: false, scope: "weekly", cap: budget.inviteWeeklyCap, used: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.allowed) {
    return { ok: true, daily: row.daily_used, weekly: row.weekly_used };
  }

  // Denied: surface whichever ceiling is responsible (weekly takes precedence).
  const weeklyUsed = row?.weekly_used ?? budget.inviteWeeklyCap;
  if (weeklyUsed >= budget.inviteWeeklyCap) {
    return { ok: false, scope: "weekly", cap: budget.inviteWeeklyCap, used: weeklyUsed };
  }
  return {
    ok: false,
    scope: "daily",
    cap: budget.inviteDailyCap,
    used: row?.daily_used ?? budget.inviteDailyCap,
  };
}

/** Build the typed error for a denied reservation, with the right retry instant. */
export function inviteQuotaErrorFor(
  denied: Extract<ReserveInviteResult, { ok: false }>,
): LinkedInInviteWeeklyQuotaError {
  const retryAfter =
    denied.scope === "daily"
      ? nextUtcMidnight()
      : nextUtcInstantWhenWeeklyInviteCounterResets();
  return new LinkedInInviteWeeklyQuotaError(
    denied.cap,
    denied.used,
    denied.scope,
    retryAfter,
  );
}

/** Next UTC midnight — when the daily counter resets. */
export function nextUtcMidnight(from: Date = new Date()): string {
  const d = new Date(from);
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

/** Prochain instant UTC où `weeklyPeriodKey(date)` change (compteur hebdo). */
export function nextUtcInstantWhenWeeklyInviteCounterResets(
  from: Date = new Date(),
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
