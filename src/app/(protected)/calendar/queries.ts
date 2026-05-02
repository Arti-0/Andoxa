"use client";

// Calendar2 — React Query hooks wired to /api/events and /api/booking/slug.
//
// Event shape mapping:
//   DB start_time / end_time (timestamptz) → CalEvent.start / end (decimal hours)
//   DB created_by (uuid)                   → CalEvent.owner ("me" for current user)
//   DB event_type / status / meeting_kind  → CalEvent.type / status / meeting

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CalEvent, EventType, EventStatus, MeetingKind, GcalAttendee } from "./data";

const FIVE_MIN = 5 * 60 * 1000;

// ─── DB types ────────────────────────────────────────────────────────────────

interface DbEvent {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  prospect_id: string | null;
  location: string | null;
  is_all_day: boolean;
  created_by: string;
  google_meet_url: string | null;
  event_type: string | null;
  status: string;
  meeting_kind: string;
  wa_workflow: boolean;
  pipeline_stage: string | null;
  attendee_user_ids: string[] | null;
  prospect: {
    id: string;
    full_name: string | null;
    company: string | null;
  } | null;
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

function toDecimalHour(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

function toDayIndex(iso: string, weekStart: Date): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const ws = new Date(weekStart);
  ws.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - ws.getTime()) / (24 * 60 * 60 * 1000));
}

function toDateISO(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Expand a DB event into one CalEvent per owner (creator + each attendee user id)
// so the same event renders side-by-side on each participant's calendar.
function dbToCalEvents(ev: DbEvent, weekStart: Date, currentUserId?: string): CalEvent[] {
  const prospectName = ev.prospect?.full_name?.trim() || null;

  const legacyTypes = new Set(["Discovery", "Démo", "Closing", "Interne"]);
  const creatorCalendarId = ev.event_type && !legacyTypes.has(ev.event_type)
    ? ev.event_type
    : (ev.created_by === currentUserId ? "me" : ev.created_by);

  const base = {
    day: toDayIndex(ev.start_time, weekStart),
    dateISO: toDateISO(ev.start_time),
    start: toDecimalHour(ev.start_time),
    end: toDecimalHour(ev.end_time),
    title: ev.title,
    prospect: prospectName,
    prospectId: ev.prospect_id,
    type: legacyTypes.has(ev.event_type ?? "") ? (ev.event_type as EventType) : null,
    company: ev.prospect?.company ?? "",
    channel: "Andoxa",
    status: (ev.status as EventStatus) ?? "confirmed",
    meeting: (ev.meeting_kind as MeetingKind) ?? "meet",
    wa: ev.wa_workflow ?? false,
    pipelineStage: ev.pipeline_stage ?? null,
    lastAction: "",
    googleMeetUrl: ev.google_meet_url ?? null,
  };

  const owners: Array<{ ownerKey: string; calendarId: string }> = [];

  // Creator
  const creatorOwner = ev.created_by === currentUserId ? "me" : ev.created_by;
  owners.push({ ownerKey: creatorOwner, calendarId: creatorCalendarId });

  // Attendees (excluding creator to avoid duplicates)
  for (const attId of ev.attendee_user_ids ?? []) {
    if (attId === ev.created_by) continue;
    const ownerKey = attId === currentUserId ? "me" : attId;
    if (owners.some((o) => o.ownerKey === ownerKey)) continue;
    owners.push({ ownerKey, calendarId: ownerKey });
  }

  return owners.map((o, idx) => ({
    ...base,
    id: idx === 0 ? ev.id : `${ev.id}__${o.ownerKey}`,
    owner: o.ownerKey,
    calendarId: o.calendarId,
  }));
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const msg = (j as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const json = await res.json();
  return (json?.data ?? json) as T;
}

async function getCurrentUserId(): Promise<string | undefined> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

// ─── Cache keys ───────────────────────────────────────────────────────────────

export const calendarKeys = {
  events: (weekStart: string) => ["calendar2", "events", weekStart] as const,
  kpi: () => ["calendar2", "kpi"] as const,
  bookingSlug: () => ["calendar2", "booking-slug"] as const,
  prospectSearch: (q: string) => ["calendar2", "prospect-search", q] as const,
};

// ─── Events ───────────────────────────────────────────────────────────────────

export function useCalendarEvents(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return useQuery({
    queryKey: calendarKeys.events(weekStart.toISOString()),
    queryFn: async () => {
      const [userId, data] = await Promise.all([
        getCurrentUserId(),
        getJson<{ items: DbEvent[] }>(
          `/api/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}&per_page=200`,
        ),
      ]);
      return (data.items ?? []).flatMap((ev) => dbToCalEvents(ev, weekStart, userId));
    },
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
  });
}

// ─── Create event ─────────────────────────────────────────────────────────────

export type CreateEventInput = {
  title: string;
  start_time: string;
  end_time: string;
  calendar_id?: string;   // "me" | "custom_xxx" — stored in event_type column
  status?: string;
  meeting_kind?: string;
  wa_workflow?: boolean;
  prospect_id?: string | null;
  google_meet?: boolean;
  description?: string;
  attendee_emails?: string[];
  attendee_user_ids?: string[];
};

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ calendar_id, ...rest }: CreateEventInput) =>
      getJson<DbEvent>("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // calendar_id stored in event_type column
        body: JSON.stringify({ status: "confirmed", event_type: calendar_id ?? "me", ...rest }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["calendar2", "events"] });
      void qc.invalidateQueries({ queryKey: ["calendar2", "kpi"] });
    },
  });
}

// ─── Update / status ─────────────────────────────────────────────────────────

export type UpdateEventInput = {
  id: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  prospect_id?: string | null;
  status?: string;
  event_type?: string | null;
  meeting_kind?: string;
  wa_workflow?: boolean;
  attendee_user_ids?: string[];
};

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: UpdateEventInput) =>
      getJson<DbEvent>(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["calendar2", "events"] });
      void qc.invalidateQueries({ queryKey: ["calendar2", "kpi"] });
    },
  });
}

// ─── Delete event ─────────────────────────────────────────────────────────────

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson<{ success: boolean }>(`/api/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["calendar2", "events"] });
      void qc.invalidateQueries({ queryKey: ["calendar2", "kpi"] });
    },
  });
}

// ─── Booking slug ─────────────────────────────────────────────────────────────

export function useBookingSlug() {
  return useQuery({
    queryKey: calendarKeys.bookingSlug(),
    queryFn: () => getJson<{ booking_slug: string | null }>("/api/booking/slug"),
    staleTime: FIVE_MIN * 12,
  });
}

// ─── Booking settings ─────────────────────────────────────────────────────────

export interface BookingSettings {
  title: string;
  description: string;
  slug: string | null;
  availability: {
    slotMinutes: number;
    daysAhead: number;
    daySchedules: Record<number, { enabled: boolean; startHour: number; endHour: number }>;
  };
}

export function useBookingSettings() {
  return useQuery({
    queryKey: ["calendar2", "booking-settings"] as const,
    queryFn: () => getJson<BookingSettings>("/api/booking/settings"),
    staleTime: FIVE_MIN * 6,
  });
}

export function useUpdateBookingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<Omit<BookingSettings, "slug">>) =>
      getJson<{ success: boolean }>("/api/booking/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["calendar2", "booking-settings"] });
    },
  });
}

// ─── KPI ─────────────────────────────────────────────────────────────────────

export interface KpiData {
  todayTotal: number;
  todayDone: number;
  weekTotal: number;
  weekDone: number;
  thirtyDayDone: number;
  prevThirtyDayDone: number;
}

async function fetchKpi(): Promise<KpiData> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { todayTotal: 0, todayDone: 0, weekTotal: 0, weekDone: 0, thirtyDayDone: 0, prevThirtyDayDone: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.active_organization_id) {
    return { todayTotal: 0, todayDone: 0, weekTotal: 0, weekDone: 0, thirtyDayDone: 0, prevThirtyDayDone: 0 };
  }

  const wsId = profile.active_organization_id as string;
  const now = new Date();

  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const dow = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const thirtyAgo = new Date(now); thirtyAgo.setDate(now.getDate() - 30);
  const sixtyAgo = new Date(now); sixtyAgo.setDate(now.getDate() - 60);

  const [todayRes, weekRes, thirtyRes, prevRes] = await Promise.all([
    supabase
      .from("events")
      .select("status")
      .eq("organization_id", wsId)
      .gte("start_time", todayStart.toISOString())
      .lte("start_time", todayEnd.toISOString()),
    supabase
      .from("events")
      .select("status")
      .eq("organization_id", wsId)
      .gte("start_time", weekStart.toISOString())
      .lt("start_time", weekEnd.toISOString()),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", wsId)
      .eq("status", "done")
      .gte("start_time", thirtyAgo.toISOString()),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", wsId)
      .eq("status", "done")
      .gte("start_time", sixtyAgo.toISOString())
      .lt("start_time", thirtyAgo.toISOString()),
  ]);

  // Generated supabase types are stale (status column was added in migration 021).
  // Cast through `unknown` until types are regenerated.
  const todayEvents = (todayRes.data ?? []) as unknown as { status: string }[];
  const weekEvents = (weekRes.data ?? []) as unknown as { status: string }[];

  return {
    todayTotal: todayEvents.length,
    todayDone: todayEvents.filter((e) => e.status === "done").length,
    weekTotal: weekEvents.length,
    weekDone: weekEvents.filter((e) => e.status === "done").length,
    thirtyDayDone: thirtyRes.count ?? 0,
    prevThirtyDayDone: prevRes.count ?? 0,
  };
}

export function useCalendarKpi() {
  return useQuery({
    queryKey: calendarKeys.kpi(),
    queryFn: fetchKpi,
    staleTime: FIVE_MIN,
  });
}

// ─── Google Calendar events ──────────────────────────────────────────────────

interface GcalEventRaw {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  meetUrl: string | null;
  attendees: GcalAttendee[];
  source: "google";
}

function gcalToCalEvent(ev: GcalEventRaw, weekStart: Date): CalEvent {
  return {
    id: ev.id,
    day: toDayIndex(ev.start, weekStart),
    dateISO: toDateISO(ev.start),
    owner: "gcal",
    start: toDecimalHour(ev.start),
    end: toDecimalHour(ev.end),
    title: ev.title,
    prospect: null,
    prospectId: null,
    calendarId: "gcal",
    type: null,
    company: ev.location ?? "",
    channel: "Google Calendar",
    status: "confirmed",
    meeting: ev.meetUrl ? "meet" : "other",
    wa: false,
    pipelineStage: null,
    lastAction: "",
    googleMeetUrl: ev.meetUrl,
    gcalAttendees: ev.attendees,
  };
}

export function useGoogleCalendarEvents(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return useQuery({
    queryKey: ["calendar2", "gcal-events", weekStart.toISOString()] as const,
    queryFn: async () => {
      const data = await getJson<{ items: GcalEventRaw[]; connected: boolean }>(
        `/api/google/calendar/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`,
      );
      return {
        events: (data.items ?? []).map((ev) => gcalToCalEvent(ev, weekStart)),
        connected: data.connected ?? false,
      };
    },
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
  });
}

// ─── Current user profile ────────────────────────────────────────────────────

export interface CurrentUserProfile {
  id: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
}

export function useCurrentUserProfile() {
  return useQuery({
    queryKey: ["calendar2", "current-user-profile"] as const,
    queryFn: async (): Promise<CurrentUserProfile | null> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .single();
      const fullName = (profile?.full_name as string | null) ?? "Vous";
      return {
        id: user.id,
        fullName,
        initials: fullName.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase() || "VO",
        avatarUrl: (profile?.avatar_url as string | null) ?? null,
      };
    },
    staleTime: FIVE_MIN * 12,
  });
}

// ─── Org members ─────────────────────────────────────────────────────────────

export interface OrgMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  accent: string;
  avatarUrl: string | null;
}

// Deterministic color palette for member avatars
const MEMBER_PALETTE = [
  { color: "#7C3AED", accent: "#EDE9FE" },
  { color: "#DB2777", accent: "#FCE7F3" },
  { color: "#0891B2", accent: "#CFFAFE" },
  { color: "#EA580C", accent: "#FFE4D5" },
  { color: "#10B981", accent: "#ECFDF5" },
  { color: "#DC2626", accent: "#FEE2E2" },
  { color: "#0052D9", accent: "#E8F0FD" },
  { color: "#64748B", accent: "#F1F5F9" },
];

function memberColor(id: string): { color: string; accent: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h * 31 + id.charCodeAt(i)) >>> 0);
  return MEMBER_PALETTE[h % MEMBER_PALETTE.length];
}

function memberInitials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function useOrgMembers() {
  return useQuery({
    queryKey: ["calendar2", "org-members"] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const data = await getJson<{ items: Array<{ id: string; name: string; avatar_url: string | null }> }>(
        "/api/organization/members",
      );
      return (data.items ?? [])
        .filter((m) => m.id !== currentUserId) // exclude self
        .map((m) => ({
          id: m.id,
          name: m.name,
          initials: memberInitials(m.name),
          avatarUrl: m.avatar_url ?? null,
          ...memberColor(m.id),
        })) as OrgMember[];
    },
    staleTime: FIVE_MIN * 6, // org team rarely changes
    placeholderData: [],
  });
}

// ─── Prospect autocomplete ────────────────────────────────────────────────────

export interface ProspectOption {
  id: string;
  name: string;
  company: string;
}

export function useProspectSearch(query: string) {
  return useQuery({
    queryKey: calendarKeys.prospectSearch(query),
    queryFn: async () => {
      const data = await getJson<{
        items: Array<{ id: string; full_name: string | null; company?: string | null }>;
      }>(`/api/prospects?search=${encodeURIComponent(query)}&per_page=8`);
      return (data.items ?? []).map((p) => ({
        id: p.id,
        name: p.full_name?.trim() || "Sans nom",
        company: p.company ?? "",
      })) as ProspectOption[];
    },
    staleTime: 30_000,
    enabled: query.trim().length >= 2,
    placeholderData: [],
  });
}
