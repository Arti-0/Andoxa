/**
 * Single source of truth for LinkedIn action pacing.
 *
 * Combines per-tier hard ceilings with a warm-up ramp that grows the daily
 * invite budget as the *connected* account ages, plus a "mature-account fast
 * lane" that skips the ramp for established, healthy, well-accepted accounts and
 * an acceptance brake that dials the budget down when invites aren't landing.
 *
 * Both the enforcement gate (`reserveLinkedInInvite`) and the dashboard card
 * read the budget produced here, so what we show is exactly what we enforce.
 *
 * The warm-up anchor is `user_unipile_accounts.created_at` (when the account was
 * connected to Andoxa) — the right anchor for ramping *our* automation
 * footprint, independent of the LinkedIn account's true age.
 */
import type { LinkedInAccountTier } from "@/lib/linkedin/tier";
import { getTimeZoneOffsetMs } from "@/lib/dashboard/timezone";

/** Hard per-tier backstops. `inviteWeekly` is the ceiling the acceptance-rate
 *  health cap can never exceed for the tier; the *effective* weekly cap is
 *  min(this, acceptance band). LinkedIn's real ceiling is ~200/week for mature,
 *  high-acceptance accounts: we keep a safety margin below it because Unipile
 *  cannot tell our sends apart from the user's manual sends. */
export const LINKEDIN_CEILINGS: Record<
  LinkedInAccountTier,
  { inviteDaily: number; inviteWeekly: number; messageDaily: number }
> = {
  standard: { inviteDaily: 35, inviteWeekly: 180, messageDaily: 40 },
  premium: { inviteDaily: 38, inviteWeekly: 190, messageDaily: 50 },
  sales_navigator: { inviteDaily: 40, inviteWeekly: 200, messageDaily: 55 },
} as const;

/** Warm-up ramp: daily invite cap while `day < untilDay`. 5/day on the first
 *  three days, then climbing one step per week until the health cap takes over
 *  at {@link WARMUP_PLATEAU_DAY}. */
const WARMUP_RAMP: readonly { untilDay: number; dailyInvites: number }[] = [
  { untilDay: 3, dailyInvites: 5 },
  { untilDay: 10, dailyInvites: 10 },
  { untilDay: 17, dailyInvites: 15 },
  { untilDay: 24, dailyInvites: 20 },
  { untilDay: 31, dailyInvites: 25 },
] as const;

/** Day index (since connection) at/after which the account is fully warmed. */
export const WARMUP_PLATEAU_DAY = 31;

/* -------------------------------------------------------------------------- */
/*  Acceptance-rate health cap (weekly, rolling 7 days)                        */
/* -------------------------------------------------------------------------- */

/** Weekly invite cap by rolling acceptance rate. The acceptance rate is the
 *  lever between LinkedIn's ~100/week floor and ~200/week ceiling: profiles
 *  whose invites land get more room, profiles that spray get throttled. The
 *  top band targets 180 (not the absolute 200) as the manual-sends safety
 *  margin, see {@link LINKEDIN_CEILINGS}. */
export const ACCEPTANCE_WEEKLY_BANDS: readonly {
  minRate: number;
  weeklyCap: number;
}[] = [
  { minRate: 0.6, weeklyCap: 180 },
  { minRate: 0.4, weeklyCap: 140 },
  { minRate: 0.25, weeklyCap: 100 },
  { minRate: 0, weeklyCap: 70 },
] as const;

/** Below this rolling acceptance rate the account needs a human review:
 *  bottom band applies and a review alert is raised. */
export const CRITICAL_ACCEPTANCE_THRESHOLD = 0.25;

/** Weekly cap while the acceptance rate is still unmeasurable (not enough
 *  sends): LinkedIn's floor for unproven accounts. */
export const UNPROVEN_WEEKLY_CAP = 100;

/** The weekly budget is smeared over this many send days (Mon to Fri), so one
 *  day can never burn a disproportionate share of the rolling budget. */
const SMOOTHING_SEND_DAYS = 5;

/** Pending sent-invitations count at/above which invites pause until the user
 *  withdraws old ones (a large pending pile is a strong spam signal). */
export const PENDING_INVITES_PAUSE_THRESHOLD = 500;

/** Daily-cap randomization span: the cap is scaled by a deterministic factor
 *  in [1 - span, 1] derived from `jitterSeed`, so the enforced number varies
 *  day to day (no robot signature) yet stays stable within a day (what the
 *  dashboard shows is exactly what the gate enforces). */
const DAILY_CAP_JITTER_SPAN = 0.15;
/** No jitter below this cap: the warm-up's small steps stay as designed. */
const DAILY_CAP_JITTER_MIN_CAP = 6;

function acceptanceBandWeeklyCap(rate: number | null): number {
  if (rate === null) return UNPROVEN_WEEKLY_CAP;
  for (const band of ACCEPTANCE_WEEKLY_BANDS) {
    if (rate >= band.minRate) return band.weeklyCap;
  }
  return ACCEPTANCE_WEEKLY_BANDS[ACCEPTANCE_WEEKLY_BANDS.length - 1]!.weeklyCap;
}

/** FNV-1a 32-bit hash of a string mapped to [0, 1). Deterministic jitter. */
function hash01(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

/** Mature-account fast lane: a healthy account that has *proven* itself — a high
 *  acceptance rate over a meaningful volume of accepted invites — skips the rest
 *  of the warm-up ramp and jumps straight to its full tier ceiling.
 *
 *  The volume floor is the real "established account" signal: because the ramp
 *  caps invites at 5–15/day, an account physically can't accumulate this many
 *  accepted invites until it's been actively, successfully sending for several
 *  days. So we only need a small age floor (enough to gather a sample); the
 *  volume + acceptance gates do the rest. Connection age alone is not enough. */
export const FAST_LANE_MIN_AGE_DAYS = 7;
export const FAST_LANE_MIN_ACCEPTANCE = 0.4;
export const FAST_LANE_MIN_ACCEPTED = 15;

/** Profile credibility gate (photo + headline + this many connections): an
 *  account below it gets restricted by LinkedIn almost immediately (observed:
 *  ~1-connection profile throttled after ~26 invites), so sends are blocked
 *  until the profile is fixed. Unknown profile data never blocks. */
export const CREDIBLE_MIN_CONNECTIONS = 20;
/** Profile-based maturity: 150+ connections with a filled bio is a de facto
 *  established profile (you cannot accumulate that overnight), so it skips the
 *  remaining warm-up ramp like the performance fast lane. */
export const MATURE_PROFILE_MIN_CONNECTIONS = 150;

export type LinkedInPacingInput = {
  tier: LinkedInAccountTier;
  /** Whole days since `user_unipile_accounts.created_at`. */
  daysSinceConnected: number;
  /** accepted / sent over the rolling acceptance window; `null` when there
   *  isn't enough data. */
  acceptanceRate: number | null;
  /** Absolute count of accepted invites over the same window — the fast-lane
   *  volume floor, proving sustained healthy activity (not just a thin ratio). */
  acceptedCount: number;
  /** Account currently connected and not in an error state. */
  healthy: boolean;
  /** Invites sent over the rolling last 7 days (all Andoxa paths). */
  invitesUsedLast7Days?: number;
  /** Live pending sent-invitations count; `null` when Unipile can't tell us
   *  (the breaker stays disarmed). */
  pendingInvitations?: number | null;
  /** Profile-based maturity (6+ weeks, 150+ connections, bio filled): skips
   *  the remaining warm-up ramp like the performance fast lane does. */
  matureProfile?: boolean;
  /** Credibility entry gate (photo + headline + minimum connections).
   *  `false` blocks sends until the profile is fixed; `null`/omitted =
   *  unknown, never blocks. */
  credibleProfile?: boolean | null;
  /** LinkedIn identity verification, when the provider exposes it. `true`
   *  bumps trust: passes the credibility gate and the maturity fast lane. */
  verified?: boolean | null;
  /** Seed for the deterministic daily-cap jitter (e.g. `userId:dayKey`).
   *  Omitted (tests, mocks): no jitter. */
  jitterSeed?: string;
};

export type LinkedInBudget = {
  /** The one honest daily number: invites Andoxa may send today. */
  inviteDailyCap: number;
  /** Effective weekly cap (acceptance band, tier backstop) on a rolling 7 days. */
  inviteWeeklyCap: number;
  messageDailyCap: number;
  warmup: {
    day: number;
    plateauDay: number;
    isPlateau: boolean;
    fastLane: boolean;
  };
  acceptanceRate: number | null;
  /** "ok" = warmed/healthy, "warming" = still ramping, "poor" = critical acceptance. */
  health: "ok" | "warming" | "poor";
  /** Why today's number is what it is, one line, user-facing French. */
  reason: string;
  /** True when the account carries LinkedIn identity verification (badge). */
  verified: boolean;
  /** Engine state, finer-grained than `health` (drives breakers + UI). */
  status:
    | "ok"
    | "warming"
    | "poor"
    | "weekly_spent"
    | "paused_pending_invites"
    | "blocked_account"
    | "low_credibility";
  /** Invites already counted against the rolling 7 day budget. */
  usedLast7Days: number;
  pendingInvitations: number | null;
  /** True when acceptance fell under {@link CRITICAL_ACCEPTANCE_THRESHOLD}:
   *  the caller should raise a (deduped) review alert. */
  reviewAlert: boolean;
};

function rampDailyInvites(day: number): number {
  for (const step of WARMUP_RAMP) {
    if (day < step.untilDay) return step.dailyInvites;
  }
  return Number.POSITIVE_INFINITY; // plateau handled by the health cap
}

function frPercent(rate: number): string {
  return `${Math.round(rate * 100)} %`;
}

/** Compute the effective LinkedIn budget for an account. Pure. */
export function computeLinkedInBudget(input: LinkedInPacingInput): LinkedInBudget {
  const ceil = LINKEDIN_CEILINGS[input.tier];
  const day = Math.max(0, Math.floor(input.daysSinceConnected));
  const acc = input.acceptanceRate;
  const used7d = Math.max(0, input.invitesUsedLast7Days ?? 0);
  const pending = input.pendingInvitations ?? null;

  const verified = input.verified === true;

  const fastLane =
    input.healthy &&
    (input.matureProfile === true ||
      verified ||
      (day >= FAST_LANE_MIN_AGE_DAYS &&
        acc !== null &&
        acc >= FAST_LANE_MIN_ACCEPTANCE &&
        input.acceptedCount >= FAST_LANE_MIN_ACCEPTED));

  const isPlateau = fastLane || day >= WARMUP_PLATEAU_DAY;

  // Weekly cap: acceptance band, never above the tier backstop.
  const inviteWeeklyCap = Math.min(ceil.inviteWeekly, acceptanceBandWeeklyCap(acc));
  const remainingWeekly = Math.max(0, inviteWeeklyCap - used7d);
  // Smoothing: a single day never gets more than its share of the weekly cap.
  const smoothedDaily = Math.ceil(inviteWeeklyCap / SMOOTHING_SEND_DAYS);

  const rampOrPlateauDaily = isPlateau
    ? ceil.inviteDaily
    : Math.min(ceil.inviteDaily, rampDailyInvites(day));

  let inviteDaily = Math.min(rampOrPlateauDaily, smoothedDaily, remainingWeekly);

  // Light deterministic randomization so the enforced daily number is not the
  // same flat figure every day. Stable within a day (seeded), skipped for the
  // small warm-up steps.
  if (input.jitterSeed && inviteDaily >= DAILY_CAP_JITTER_MIN_CAP) {
    const factor = 1 - hash01(input.jitterSeed) * DAILY_CAP_JITTER_SPAN;
    inviteDaily = Math.max(DAILY_CAP_JITTER_MIN_CAP - 1, Math.round(inviteDaily * factor));
  }

  const reviewAlert = acc !== null && acc < CRITICAL_ACCEPTANCE_THRESHOLD;

  let health: LinkedInBudget["health"] = isPlateau ? "ok" : "warming";
  if (reviewAlert) health = "poor";

  // Circuit breakers override everything.
  let status: LinkedInBudget["status"];
  let reason: string;
  if (!input.healthy) {
    inviteDaily = 0;
    status = "blocked_account";
    reason =
      "Compte LinkedIn indisponible : reconnectez-le depuis les paramètres pour reprendre les envois.";
  } else if (input.credibleProfile === false && !verified) {
    inviteDaily = 0;
    status = "low_credibility";
    reason =
      "Profil LinkedIn incomplet : ajoutez une photo, un titre et quelques relations avant d'envoyer des invitations.";
  } else if (pending !== null && pending >= PENDING_INVITES_PAUSE_THRESHOLD) {
    inviteDaily = 0;
    status = "paused_pending_invites";
    reason = `Trop d'invitations en attente (${pending}) : retirez les plus anciennes sur LinkedIn pour reprendre.`;
  } else if (remainingWeekly <= 0) {
    inviteDaily = 0;
    status = "weekly_spent";
    reason =
      "Budget hebdomadaire utilisé : l'envoi reprend automatiquement quand la fenêtre de 7 jours se libère.";
  } else if (reviewAlert) {
    status = "poor";
    reason = `Taux d'acceptation faible (${frPercent(acc!)}) : rythme réduit pour protéger votre compte.`;
  } else if (!isPlateau) {
    status = "warming";
    reason = `Montée en charge (jour ${day} sur ${WARMUP_PLATEAU_DAY}) : le rythme augmente chaque semaine.`;
  } else if (acc === null) {
    status = "ok";
    reason =
      "Rythme prudent le temps de mesurer le taux d'acceptation de vos invitations.";
  } else {
    status = "ok";
    reason = `Rythme calculé sur la santé de votre compte (acceptation ${frPercent(acc)}).`;
  }

  return {
    inviteDailyCap: inviteDaily,
    inviteWeeklyCap,
    messageDailyCap: ceil.messageDaily,
    warmup: { day, plateauDay: WARMUP_PLATEAU_DAY, isPlateau, fastLane },
    verified,
    acceptanceRate: acc,
    health,
    reason,
    status,
    usedLast7Days: used7d,
    pendingInvitations: pending,
    reviewAlert,
  };
}

/* -------------------------------------------------------------------------- */
/*  Humanized send cadence                                                     */
/* -------------------------------------------------------------------------- */

/**
 * When sends are allowed to fire. Outreach that goes out at 3am or in a perfectly
 * regular rhythm is the single clearest "this is a bot" signal, so we only send
 * during local business hours on weekdays, and we space sends with heavy random
 * jitter (never a fixed interval). The day's budget is smeared across the window.
 */
export const SEND_WINDOW = {
  /** Inclusive local start hour (08:00). */
  startHour: 8,
  /** Exclusive local end hour (19:00). */
  endHour: 19,
  /** ISO weekdays allowed to send by default: 1=Mon … 5=Fri (no weekends). */
  weekdays: [1, 2, 3, 4, 5] as readonly number[],
} as const;

/** Every day of the week — used when a campaign opts into weekend sending
 *  (`campaign_jobs.send_on_weekends`). The 08–19 hour window still applies. */
const ALL_WEEK_DAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

/** Days a send may fire on, given the per-campaign weekend opt-in. */
function allowedSendDays(weekendsEnabled: boolean): readonly number[] {
  return weekendsEnabled ? ALL_WEEK_DAYS : SEND_WINDOW.weekdays;
}

/** Default timezone for the send window — matches the app-wide default until we
 *  store a per-user timezone. */
export const DEFAULT_SEND_TIMEZONE = "Europe/Paris";

/** Inter-send jitter: the budget-derived base interval is multiplied by a random
 *  factor in [min, max] so the cadence is irregular (mean ≈ 1.1× base). */
const CADENCE_JITTER_MIN = 0.4;
const CADENCE_JITTER_MAX = 1.8;
/** Hard floor between two sends, regardless of how much budget remains. */
const MIN_SEND_INTERVAL_MS = 90_000;
/** Random spread applied when waiting for a window to open, so a fleet of jobs
 *  doesn't all fire the instant the clock hits 08:00. */
const WINDOW_OPEN_JITTER_MS = 25 * 60_000;

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** ISO weekday (1=Mon … 7=Sun) of a Date read in UTC terms. */
function isoWeekday(d: Date): number {
  const wd = d.getUTCDay();
  return wd === 0 ? 7 : wd;
}

/** Whether `now` falls inside the business-hours send window. By default this
 *  is weekdays only; pass `weekendsEnabled` for campaigns that opted into
 *  weekend sending (the 08–19 hour range is unchanged either way). */
export function isWithinSendWindow(
  now: Date = new Date(),
  timezone: string = DEFAULT_SEND_TIMEZONE,
  weekendsEnabled = false,
): boolean {
  const local = new Date(now.getTime() + getTimeZoneOffsetMs(now, timezone));
  const localHour = local.getUTCHours() + local.getUTCMinutes() / 60;
  return (
    allowedSendDays(weekendsEnabled).includes(isoWeekday(local)) &&
    localHour >= SEND_WINDOW.startHour &&
    localHour < SEND_WINDOW.endHour
  );
}

export type NextSendDelayInput = {
  /** The effective daily cap for this action (invite or message). */
  dailyCap: number;
  /** Actions of this type already sent today. */
  usedToday: number;
  now?: Date;
  timezone?: string;
  /** Campaign opted into weekend sending (Sat/Sun within 08–19). */
  weekendsEnabled?: boolean;
  /** Injectable RNG for deterministic tests; defaults to `Math.random`. */
  rand?: () => number;
};

/**
 * Milliseconds to wait before the next send of this action type is allowed.
 *
 * - Outside the window, or today's budget already spent → wait until the next
 *   weekday window opens (plus a random spread).
 * - Inside the window with budget left → spread the *remaining* sends across the
 *   rest of today's window, jittered, with a hard minimum interval.
 *
 * Pure (RNG + clock injectable). The caller writes the result onto the campaign
 * job's `delay_ms`, so the existing cron cadence machinery enforces it.
 */
export function computeNextSendDelayMs(input: NextSendDelayInput): number {
  const now = input.now ?? new Date();
  const tz = input.timezone ?? DEFAULT_SEND_TIMEZONE;
  const rand = input.rand ?? Math.random;
  const weekendsEnabled = input.weekendsEnabled ?? false;
  const remaining = input.dailyCap - input.usedToday;

  const offsetMs = getTimeZoneOffsetMs(now, tz);
  // Wall-clock in `tz`, expressed as a pseudo-UTC Date so getUTC* read local parts.
  const local = new Date(now.getTime() + offsetMs);
  const localHour = local.getUTCHours() + local.getUTCMinutes() / 60;

  if (remaining <= 0 || !isWithinSendWindow(now, tz, weekendsEnabled)) {
    return msUntilNextWindowOpen(local, now.getTime(), offsetMs, rand, weekendsEnabled);
  }

  const msLeftInWindow = (SEND_WINDOW.endHour - localHour) * HOUR_MS;
  const base = msLeftInWindow / remaining;
  const jitter =
    CADENCE_JITTER_MIN + rand() * (CADENCE_JITTER_MAX - CADENCE_JITTER_MIN);
  return Math.max(MIN_SEND_INTERVAL_MS, Math.round(base * jitter));
}

/** Random gap before an acceptance-triggered follow-up message, so we never
 *  reply the instant someone accepts (3–45 min, in-window). */
const FOLLOWUP_MIN_DELAY_MS = 3 * 60_000;
const FOLLOWUP_MAX_DELAY_MS = 45 * 60_000;

/**
 * Humanized delay (ms) before an `invite_then_message` follow-up should be sent
 * once LinkedIn confirms the invite was accepted. A random in-window gap — replying
 * instantly on acceptance is a bot tell, and several acceptances at once must not
 * fire back-to-back. If the gap would spill past today's window it rolls to the
 * next opening. Pure (clock + RNG injectable).
 */
export function computeFollowUpDelayMs(input?: {
  now?: Date;
  timezone?: string;
  weekendsEnabled?: boolean;
  rand?: () => number;
}): number {
  const now = input?.now ?? new Date();
  const tz = input?.timezone ?? DEFAULT_SEND_TIMEZONE;
  const rand = input?.rand ?? Math.random;
  const weekendsEnabled = input?.weekendsEnabled ?? false;

  const offsetMs = getTimeZoneOffsetMs(now, tz);
  const local = new Date(now.getTime() + offsetMs);
  if (!isWithinSendWindow(now, tz, weekendsEnabled)) {
    return msUntilNextWindowOpen(local, now.getTime(), offsetMs, rand, weekendsEnabled);
  }
  const localHour = local.getUTCHours() + local.getUTCMinutes() / 60;
  const msLeftInWindow = (SEND_WINDOW.endHour - localHour) * HOUR_MS;
  const gap =
    FOLLOWUP_MIN_DELAY_MS + rand() * (FOLLOWUP_MAX_DELAY_MS - FOLLOWUP_MIN_DELAY_MS);
  // Not enough of today's window left → send at the next opening instead.
  if (gap >= msLeftInWindow) {
    return msUntilNextWindowOpen(local, now.getTime(), offsetMs, rand, weekendsEnabled);
  }
  return Math.round(gap);
}

/** Delay (ms from `nowMs`) until the next allowed window opening, jittered. */
function msUntilNextWindowOpen(
  local: Date,
  nowMs: number,
  offsetMs: number,
  rand: () => number,
  weekendsEnabled = false,
): number {
  const days = allowedSendDays(weekendsEnabled);
  const open = new Date(local);
  open.setUTCHours(SEND_WINDOW.startHour, 0, 0, 0);
  // Advance to the first allowed day whose opening instant is strictly in the future.
  while (
    open.getTime() <= local.getTime() ||
    !days.includes(isoWeekday(open))
  ) {
    open.setTime(open.getTime() + DAY_MS);
    open.setUTCHours(SEND_WINDOW.startHour, 0, 0, 0);
  }
  // Real UTC instant for that local wall-clock = wall-clock minus the tz offset.
  const openUtcMs = open.getTime() - offsetMs;
  const jitter = Math.round(rand() * WINDOW_OPEN_JITTER_MS);
  return Math.max(0, openUtcMs - nowMs) + jitter;
}

/** Whole days between `from` and now (>= 0). */
export function daysSince(from: string | Date | null | undefined): number {
  if (!from) return 0;
  const t = typeof from === "string" ? Date.parse(from) : from.getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}
