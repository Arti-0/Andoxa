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

/** Hard per-tier ceilings — the plateau the warm-up ramps toward. Deliberately
 *  conservative: invite weekly stays under LinkedIn's ~100–150/week danger zone. */
export const LINKEDIN_CEILINGS: Record<
  LinkedInAccountTier,
  { inviteDaily: number; inviteWeekly: number; messageDaily: number }
> = {
  standard: { inviteDaily: 20, inviteWeekly: 100, messageDaily: 40 },
  premium: { inviteDaily: 25, inviteWeekly: 120, messageDaily: 50 },
  sales_navigator: { inviteDaily: 25, inviteWeekly: 140, messageDaily: 55 },
} as const;

/** Warm-up ramp: daily invite cap while `day < untilDay`. The tier ceiling is
 *  low and conservative, so the ramp reaches plateau by {@link WARMUP_PLATEAU_DAY}. */
const WARMUP_RAMP: readonly { untilDay: number; dailyInvites: number }[] = [
  { untilDay: 3, dailyInvites: 5 },
  { untilDay: 7, dailyInvites: 10 },
  { untilDay: 14, dailyInvites: 15 },
] as const;

/** Day index (since connection) at/after which the account is fully warmed. */
export const WARMUP_PLATEAU_DAY = 14;

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

/** Acceptance brake: below this, halve the daily invite budget (floor 5). */
export const POOR_ACCEPTANCE_THRESHOLD = 0.15;
export const POOR_ACCEPTANCE_FACTOR = 0.5;
const POOR_ACCEPTANCE_FLOOR = 5;

export type LinkedInPacingInput = {
  tier: LinkedInAccountTier;
  /** Whole days since `user_unipile_accounts.created_at`. */
  daysSinceConnected: number;
  /** accepted / sent over a recent window; `null` when there isn't enough data. */
  acceptanceRate: number | null;
  /** Absolute count of accepted invites over the same window — the fast-lane
   *  volume floor, proving sustained healthy activity (not just a thin ratio). */
  acceptedCount: number;
  /** Account currently connected and not in an error state. */
  healthy: boolean;
};

export type LinkedInBudget = {
  inviteDailyCap: number;
  inviteWeeklyCap: number;
  messageDailyCap: number;
  warmup: {
    day: number;
    plateauDay: number;
    isPlateau: boolean;
    fastLane: boolean;
  };
  acceptanceRate: number | null;
  /** "ok" = warmed/healthy, "warming" = still ramping, "poor" = acceptance brake on. */
  health: "ok" | "warming" | "poor";
};

function rampDailyInvites(day: number): number {
  for (const step of WARMUP_RAMP) {
    if (day < step.untilDay) return step.dailyInvites;
  }
  return Number.POSITIVE_INFINITY; // plateau handled by the tier ceiling
}

/** Compute the effective LinkedIn budget for an account. Pure. */
export function computeLinkedInBudget(input: LinkedInPacingInput): LinkedInBudget {
  const ceil = LINKEDIN_CEILINGS[input.tier];
  const day = Math.max(0, Math.floor(input.daysSinceConnected));
  const acc = input.acceptanceRate;

  const fastLane =
    input.healthy &&
    day >= FAST_LANE_MIN_AGE_DAYS &&
    acc !== null &&
    acc >= FAST_LANE_MIN_ACCEPTANCE &&
    input.acceptedCount >= FAST_LANE_MIN_ACCEPTED;

  const isPlateau = fastLane || day >= WARMUP_PLATEAU_DAY;
  let inviteDaily = isPlateau
    ? ceil.inviteDaily
    : Math.min(ceil.inviteDaily, rampDailyInvites(day));

  let health: LinkedInBudget["health"] = isPlateau ? "ok" : "warming";
  if (acc !== null && acc < POOR_ACCEPTANCE_THRESHOLD) {
    inviteDaily = Math.max(
      POOR_ACCEPTANCE_FLOOR,
      Math.floor(inviteDaily * POOR_ACCEPTANCE_FACTOR),
    );
    health = "poor";
  }

  return {
    inviteDailyCap: inviteDaily,
    inviteWeeklyCap: ceil.inviteWeekly,
    messageDailyCap: ceil.messageDaily,
    warmup: { day, plateauDay: WARMUP_PLATEAU_DAY, isPlateau, fastLane },
    acceptanceRate: acc,
    health,
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
  /** ISO weekdays allowed to send: 1=Mon … 5=Fri (no weekends). */
  weekdays: [1, 2, 3, 4, 5] as readonly number[],
} as const;

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

/** Whether `now` falls inside the weekday business-hours send window. */
export function isWithinSendWindow(
  now: Date = new Date(),
  timezone: string = DEFAULT_SEND_TIMEZONE,
): boolean {
  const local = new Date(now.getTime() + getTimeZoneOffsetMs(now, timezone));
  const localHour = local.getUTCHours() + local.getUTCMinutes() / 60;
  return (
    SEND_WINDOW.weekdays.includes(isoWeekday(local)) &&
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
  const remaining = input.dailyCap - input.usedToday;

  const offsetMs = getTimeZoneOffsetMs(now, tz);
  // Wall-clock in `tz`, expressed as a pseudo-UTC Date so getUTC* read local parts.
  const local = new Date(now.getTime() + offsetMs);
  const localHour = local.getUTCHours() + local.getUTCMinutes() / 60;

  if (remaining <= 0 || !isWithinSendWindow(now, tz)) {
    return msUntilNextWindowOpen(local, now.getTime(), offsetMs, rand);
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
  rand?: () => number;
}): number {
  const now = input?.now ?? new Date();
  const tz = input?.timezone ?? DEFAULT_SEND_TIMEZONE;
  const rand = input?.rand ?? Math.random;

  const offsetMs = getTimeZoneOffsetMs(now, tz);
  const local = new Date(now.getTime() + offsetMs);
  if (!isWithinSendWindow(now, tz)) {
    return msUntilNextWindowOpen(local, now.getTime(), offsetMs, rand);
  }
  const localHour = local.getUTCHours() + local.getUTCMinutes() / 60;
  const msLeftInWindow = (SEND_WINDOW.endHour - localHour) * HOUR_MS;
  const gap =
    FOLLOWUP_MIN_DELAY_MS + rand() * (FOLLOWUP_MAX_DELAY_MS - FOLLOWUP_MIN_DELAY_MS);
  // Not enough of today's window left → send at the next opening instead.
  if (gap >= msLeftInWindow) {
    return msUntilNextWindowOpen(local, now.getTime(), offsetMs, rand);
  }
  return Math.round(gap);
}

/** Delay (ms from `nowMs`) until the next weekday window opening, jittered. */
function msUntilNextWindowOpen(
  local: Date,
  nowMs: number,
  offsetMs: number,
  rand: () => number,
): number {
  const open = new Date(local);
  open.setUTCHours(SEND_WINDOW.startHour, 0, 0, 0);
  // Advance to the first weekday whose opening instant is strictly in the future.
  while (
    open.getTime() <= local.getTime() ||
    !SEND_WINDOW.weekdays.includes(isoWeekday(open))
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
