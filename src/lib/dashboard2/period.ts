/**
 * Period helpers for dashboard v2 endpoints.
 *
 * Accepts the period keys produced by `PageHeader` (today / week / month / 30d)
 * and returns:
 *   • `current`  — the [start, end] window for the selected period
 *   • `previous` — the iso-window immediately before, used to compute trends
 */

export type DashboardPeriod = "today" | "week" | "month" | "30d";

export interface PeriodWindow {
  start: Date;
  end: Date;
}

export interface PeriodPair {
  current: PeriodWindow;
  previous: PeriodWindow;
}

const FRENCH_LABEL_TO_KEY: Record<string, DashboardPeriod> = {
  "Aujourd'hui": "today",
  "Cette semaine": "week",
  "Ce mois": "month",
  "30 jours": "30d",
};

export function parsePeriod(input: string | null | undefined): DashboardPeriod {
  if (!input) return "month";
  if (input in FRENCH_LABEL_TO_KEY)
    return FRENCH_LABEL_TO_KEY[input as keyof typeof FRENCH_LABEL_TO_KEY];
  if (["today", "week", "month", "30d"].includes(input))
    return input as DashboardPeriod;
  return "month";
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d: Date): Date {
  // ISO week — Monday is day 1
  const x = startOfDay(d);
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - (day - 1));
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function getPeriodPair(
  period: DashboardPeriod,
  now: Date = new Date(),
): PeriodPair {
  switch (period) {
    case "today": {
      const start = startOfDay(now);
      const end = endOfDay(now);
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
      const prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 1);
      return { current: { start, end }, previous: { start: prevStart, end: prevEnd } };
    }
    case "week": {
      const start = startOfWeek(now);
      const end = endOfDay(now);
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(start);
      prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
      return { current: { start, end }, previous: { start: prevStart, end: prevEnd } };
    }
    case "month": {
      const start = startOfMonth(now);
      const end = endOfDay(now);
      const prevStart = new Date(start);
      prevStart.setMonth(prevStart.getMonth() - 1);
      const prevEnd = new Date(start);
      prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
      return { current: { start, end }, previous: { start: prevStart, end: prevEnd } };
    }
    case "30d":
    default: {
      const end = endOfDay(now);
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      const prevEnd = new Date(start);
      prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 30);
      return { current: { start, end }, previous: { start: prevStart, end: prevEnd } };
    }
  }
}

/**
 * Express the period as an ISO bound pair the Supabase filters can consume.
 */
export function periodToIso(window: PeriodWindow): { startIso: string; endIso: string } {
  return { startIso: window.start.toISOString(), endIso: window.end.toISOString() };
}

/**
 * Compute a delta in *percentage points* between `current` and `previous`.
 * Returns 0 when previous is 0 to avoid Infinity.
 */
export function trendPts(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}
