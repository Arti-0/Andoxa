/**
 * Weekly bucketing helpers used by sparklines and the activity chart.
 */

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
