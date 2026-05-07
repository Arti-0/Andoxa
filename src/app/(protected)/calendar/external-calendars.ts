"use client";

// External calendars wired into the sidebar's "Externes" section
// (Calendar #2). Both feeds are emitted as `CalEvent` rows with
// `isAllDay = true` so the grid renders them as a full-day band under
// the day number instead of inside the time gutter.
//
// Source of truth (no auth required):
//   • Public holidays:  https://calendrier.api.gouv.fr/jours-feries/metropole.json
//   • School holidays:  https://data.education.gouv.fr (Zone A by default)
//
// Both feeds are cached in localStorage for 24h to avoid hammering the
// public APIs and to keep the calendar usable offline.

import { useQuery } from "@tanstack/react-query";
import type { CalEvent } from "./data";

const ONE_DAY = 24 * 60 * 60 * 1000;

interface CachedFeed<T> {
  fetchedAt: number;
  payload: T;
}

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFeed<T>;
    if (Date.now() - parsed.fetchedAt > ONE_DAY) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, payload: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ fetchedAt: Date.now(), payload } satisfies CachedFeed<T>),
    );
  } catch {
    /* ignore storage errors */
  }
}

/* ============================================================
   Public holidays
   ============================================================ */

interface HolidaysFeed {
  /** ISO yyyy-mm-dd → label */
  byDate: Record<string, string>;
}

interface NagerHolidayRow {
  date: string;            // "2026-01-01"
  localName: string;
  name: string;
  countryCode: string;
}

/**
 * Tries the official `calendrier.api.gouv.fr` feed first, then falls
 * back to date.nager.at if anything goes wrong (CORS preflight, 5xx,
 * network unreach…). Each provider failure is logged as a warning so
 * a broken environment doesn't silently leave the calendar empty —
 * see https://github.com/anthropics/andoxa/issues/holidays-feed for
 * the original bug report.
 */
async function fetchHolidaysFromGouv(year: number): Promise<HolidaysFeed | null> {
  try {
    const res = await fetch(
      `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`,
    );
    if (!res.ok) {
      console.warn(
        `[external-calendars] gouv holidays HTTP ${res.status} for ${year}`,
      );
      return null;
    }
    const json = (await res.json()) as Record<string, string>;
    if (!json || Object.keys(json).length === 0) return null;
    return { byDate: json };
  } catch (err) {
    console.warn("[external-calendars] gouv holidays failed:", err);
    return null;
  }
}

async function fetchHolidaysFromNager(year: number): Promise<HolidaysFeed | null> {
  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/FR`,
    );
    if (!res.ok) {
      console.warn(
        `[external-calendars] nager holidays HTTP ${res.status} for ${year}`,
      );
      return null;
    }
    const rows = (await res.json()) as NagerHolidayRow[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const byDate: Record<string, string> = {};
    for (const r of rows) {
      if (r?.date && (r.localName || r.name)) {
        byDate[r.date] = r.localName ?? r.name;
      }
    }
    if (Object.keys(byDate).length === 0) return null;
    return { byDate };
  } catch (err) {
    console.warn("[external-calendars] nager holidays failed:", err);
    return null;
  }
}

async function fetchHolidays(year: number): Promise<HolidaysFeed> {
  const cacheKey = `cal2_holidays_${year}`;
  const cached = readCache<HolidaysFeed>(cacheKey);
  // Treat an empty cached payload as "no cache" so a prior transient
  // failure doesn't pin the calendar to an empty state for 24 h.
  if (cached && Object.keys(cached.byDate).length > 0) return cached;

  // Try the official feed, then date.nager.at. Only persist the cache
  // when we actually have data — caching an empty payload was the root
  // cause of the "Jours fériés vide" bug because it suppressed retries
  // for 24 h after a single transient failure.
  const fromGouv = await fetchHolidaysFromGouv(year);
  if (fromGouv) {
    writeCache(cacheKey, fromGouv);
    return fromGouv;
  }
  const fromNager = await fetchHolidaysFromNager(year);
  if (fromNager) {
    writeCache(cacheKey, fromNager);
    return fromNager;
  }
  console.warn(
    `[external-calendars] both holiday providers failed for ${year}; calendar will be empty until next retry.`,
  );
  return { byDate: {} };
}

/* ============================================================
   School holidays — Zone A (Bordeaux, Clermont, Dijon, Grenoble,
   Limoges, Lyon, Poitiers — most populous)
   ============================================================ */

interface VacancesRecord {
  description: string;
  start_date: string;
  end_date: string;
  zones: string;
}

interface VacancesFeed {
  ranges: { startISO: string; endISO: string; label: string }[];
}

async function fetchVacances(year: number): Promise<VacancesFeed> {
  const cacheKey = `cal2_vacances_${year}`;
  const cached = readCache<VacancesFeed>(cacheKey);
  // Same retry-on-empty rule as holidays — a previous transient failure
  // shouldn't pin the calendar to an empty list for 24 h.
  if (cached && cached.ranges.length > 0) return cached;
  try {
    const url = new URL(
      "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records",
    );
    url.searchParams.set(
      "where",
      `zones = "Zone A" and start_date >= date'${year}-01-01' and end_date <= date'${year + 1}-08-31'`,
    );
    url.searchParams.set("limit", "30");
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn(
        `[external-calendars] vacances HTTP ${res.status} for ${year}`,
      );
      return { ranges: [] };
    }
    const json = (await res.json()) as { results: VacancesRecord[] };
    const ranges = (json.results ?? []).map((r) => ({
      startISO: r.start_date.slice(0, 10),
      endISO: r.end_date.slice(0, 10),
      label: r.description,
    }));
    if (ranges.length === 0) {
      console.warn(
        `[external-calendars] vacances feed returned 0 rows for ${year}`,
      );
      return { ranges: [] };
    }
    const payload: VacancesFeed = { ranges };
    writeCache(cacheKey, payload);
    return payload;
  } catch (err) {
    console.warn("[external-calendars] vacances feed failed:", err);
    return { ranges: [] };
  }
}

/* ============================================================
   Combined hook — emits all-day CalEvent rows for the visible week
   ============================================================ */

const HOLIDAY_OWNER = "holidays";
const VACANCES_OWNER = "vacances";

function dayIndex(iso: string, weekStart: Date): number {
  const d = new Date(iso + "T00:00:00");
  const ws = new Date(weekStart);
  ws.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - ws.getTime()) / ONE_DAY);
}

function buildAllDay(
  ownerKey: string,
  dateISO: string,
  endDateISO: string,
  title: string,
  weekStart: Date,
): CalEvent {
  return {
    id: `${ownerKey}_${dateISO}_${title}`,
    day: dayIndex(dateISO, weekStart),
    owner: ownerKey,
    start: 0,
    end: 24,
    dateISO,
    endDateISO,
    title,
    prospect: null,
    prospectId: null,
    calendarId: ownerKey,
    type: null,
    company: "",
    channel: "Externe",
    status: "internal",
    meeting: "other",
    wa: false,
    pipelineStage: null,
    lastAction: "",
    googleMeetUrl: null,
    isAllDay: true,
  };
}

export function useExternalCalendars(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const year = weekStart.getFullYear();

  const holidays = useQuery({
    queryKey: ["cal2", "holidays", year],
    queryFn: () => fetchHolidays(year),
    staleTime: ONE_DAY,
  });

  const vacances = useQuery({
    queryKey: ["cal2", "vacances", year],
    queryFn: () => fetchVacances(year),
    staleTime: ONE_DAY,
  });

  const events: CalEvent[] = [];

  // Holidays — single-day rows
  for (const [iso, label] of Object.entries(holidays.data?.byDate ?? {})) {
    const d = new Date(iso + "T00:00:00");
    if (d < weekStart || d > weekEnd) continue;
    events.push(buildAllDay(HOLIDAY_OWNER, iso, iso, label, weekStart));
  }

  // School vacances — multi-day ranges expanded into one row per visible day
  for (const r of vacances.data?.ranges ?? []) {
    const start = new Date(r.startISO + "T00:00:00");
    const end = new Date(r.endISO + "T23:59:59");
    if (end < weekStart || start > weekEnd) continue;
    // Walk days in the visible window that fall inside the range
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      if (d < start || d > end) continue;
      const iso = d.toISOString().slice(0, 10);
      events.push(buildAllDay(VACANCES_OWNER, iso, r.endISO, r.label, weekStart));
    }
  }

  return events;
}
