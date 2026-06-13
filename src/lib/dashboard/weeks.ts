/**
 * Weekly bucketing helpers used by sparklines and the activity chart.
 */

import type { DashboardPeriod } from "./period";

export interface WeekBucket {
  /** ISO Monday of the week (00:00 local). */
  start: Date;
  /** Inclusive end-of-Sunday (23:59:59.999 local). */
  end: Date;
  /** Short FR label, e.g. "S.18". */
  label: string;
  /** Sortable key, e.g. "2026-W18". */
  key: string;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - (day - 1));
  return x;
}

function endOfWeek(monday: Date): Date {
  const e = new Date(monday);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { week, year: d.getUTCFullYear() };
}

/**
 * Build a list of `count` weekly buckets ending with the week containing `now`,
 * oldest → newest. Each bucket is keyed and labeled for display.
 */
export function buildWeekBuckets(count: number, now: Date = new Date()): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const currentMonday = startOfWeek(now);
  for (let i = count - 1; i >= 0; i--) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() - i * 7);
    const sunday = endOfWeek(monday);
    const { week, year } = getISOWeek(monday);
    buckets.push({
      start: monday,
      end: sunday,
      label: `S.${String(week).padStart(2, "0")}`,
      key: `${year}-W${String(week).padStart(2, "0")}`,
    });
  }
  return buckets;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const DAY_LABELS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Build the bucket series that matches the selected dashboard period, so the
 * sparklines and the activity chart shrink to the period instead of always
 * showing a fixed multi-week window:
 *   • today → 24 hourly buckets (00h–23h of the current day)
 *   • week  → 7 daily buckets (Mon–Sun of the current ISO week)
 *   • month → 30 daily buckets (rolling, ending today)
 *
 * Returns the same `WeekBucket` shape as `buildWeekBuckets` so callers can keep
 * using `bucketIndex` unchanged.
 */
export function buildPeriodBuckets(
  period: DashboardPeriod,
  now: Date = new Date(),
): WeekBucket[] {
  if (period === "today") {
    const day0 = startOfDay(now);
    return Array.from({ length: 24 }, (_, h) => {
      const start = new Date(day0);
      start.setHours(h, 0, 0, 0);
      const end = new Date(day0);
      end.setHours(h, 59, 59, 999);
      return { start, end, label: `${h}h`, key: `h-${h}` };
    });
  }

  if (period === "week") {
    const monday = startOfWeek(now);
    return Array.from({ length: 7 }, (_, i) => {
      const start = new Date(monday);
      start.setDate(monday.getDate() + i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end,
        label: DAY_LABELS_FR[i],
        key: `d-${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`,
      };
    });
  }

  // month — 30 rolling daily buckets ending today.
  const today0 = startOfDay(now);
  return Array.from({ length: 30 }, (_, i) => {
    const start = new Date(today0);
    start.setDate(today0.getDate() - (29 - i));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return {
      start,
      end,
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      key: `d-${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`,
    };
  });
}

/**
 * Find the bucket index a given date belongs to. Returns -1 if outside range.
 */
export function bucketIndex(buckets: WeekBucket[], when: Date): number {
  const t = when.getTime();
  for (let i = 0; i < buckets.length; i++) {
    if (t >= buckets[i].start.getTime() && t <= buckets[i].end.getTime())
      return i;
  }
  return -1;
}
