"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNextCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import { createViewDay, createViewWeek } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createResizePlugin } from "@schedule-x/resize";
import "@schedule-x/theme-default/dist/index.css";
import "./schedule-x-styles.css";

import { useUser } from "@/hooks/use-user";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarPlus,
  Copy,
  Check,
  Link2,
  CalendarDays,
  Clock,
  BookMarked,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  prospect_id: string | null;
  location: string | null;
  created_by: string | null;
  source?: string;
  guest_name?: string | null;
  guest_email?: string | null;
}

interface Member {
  id: string;
  name: string;
}

function formatDateForScheduleX(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function scheduleXToIso(scheduleXStr: string): string {
  return new Date(scheduleXStr.replace(" ", "T")).toISOString();
}

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string {
  return new Date(local).toISOString();
}

function addMinutes(scheduleXStr: string, minutes: number): string {
  const d = new Date(scheduleXStr.replace(" ", "T"));
  d.setMinutes(d.getMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function CalendarPage() {
  const { profile, loading: userLoading } = useUser();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingCreateStart, setPendingCreateStart] = useState<string | null>(null);
  const [bookingSlug, setBookingSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [lastRange, setLastRange] = useState<{ start: string; end: string } | null>(null);
  const originalEventRef = useRef<{ start: string; end: string } | null>(null);
  const eventsRef = useRef<EventItem[]>([]);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const todayCount = useMemo(
    () => events.filter((e) => isToday(e.start_time)).length,
    [events]
  );

  const [allTimeStats, setAllTimeStats] = useState<{
    past: number;
    upcoming: number;
    loaded: boolean;
  }>({ past: 0, upcoming: 0, loaded: false });

  useEffect(() => {
    async function loadAllTimeStats() {
      try {
        const now = new Date().toISOString();
        const [pastRes, upcomingRes] = await Promise.all([
          fetch(`/api/events?end=${encodeURIComponent(now)}&pageSize=1`),
          fetch(`/api/events?start=${encodeURIComponent(now)}&pageSize=1`),
        ]);
        const [pastJson, upcomingJson] = await Promise.all([
          pastRes.json(),
          upcomingRes.json(),
        ]);
        const past = (pastJson?.data ?? pastJson)?.total ?? 0;
        const upcoming = (upcomingJson?.data ?? upcomingJson)?.total ?? 0;
        setAllTimeStats({ past, upcoming, loaded: true });
      } catch {
        setAllTimeStats((s) => ({ ...s, loaded: true }));
      }
    }
    loadAllTimeStats();
  }, []);

  const eventsServicePlugin = useMemo(() => createEventsServicePlugin(), []);
  const controlsPlugin = useMemo(() => createCalendarControlsPlugin(), []);
  const dragPlugin = useMemo(() => createDragAndDropPlugin(), []);
  const resizePlugin = useMemo(() => createResizePlugin(), []);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/organization/members");
      if (!res.ok) return;
      const json = await res.json();
      const data = json?.data ?? json;
      const items = data?.items ?? [];
      setMembers(Array.isArray(items) ? items : []);
    } catch {
      setMembers([]);
    }
  }, []);

  const loadEvents = useCallback(
    async (start: string, end: string) => {
      if (!start || !end) return;
      setLoading(true);
      try {
        const startIso = start.includes("T") ? start : `${start}T00:00:00.000Z`;
        const endIso = end.includes("T") ? end : `${end}T23:59:59.999Z`;
        const params = new URLSearchParams({ start: startIso, end: endIso, pageSize: "500" });
        if (selectedMemberId && selectedMemberId !== "all") {
          params.set("created_by", selectedMemberId);
        }
        const googleParams = new URLSearchParams({ start: startIso, end: endIso });
        const [res, googleRes] = await Promise.allSettled([
          fetch(`/api/events?${params}`),
          fetch(`/api/google/calendar/events?${googleParams}`),
        ]);

        if (res.status === "rejected" || (res.status === "fulfilled" && !res.value.ok)) {
          setEvents([]);
          return;
        }

        const json = await res.value.json();
        const data = json?.data ?? json;
        const items = (data?.items ?? []) as EventItem[];
        setEvents(Array.isArray(items) ? items : []);

        // Google Calendar events
        let googleItems: { id: string; title: string; start: string; end: string; source: "google" }[] = [];
        if (googleRes.status === "fulfilled" && googleRes.value.ok) {
          const gJson = await googleRes.value.json();
          const gData = gJson?.data ?? gJson;
          if (typeof gData?.connected === "boolean") {
            setGoogleConnected(gData.connected);
          }
          googleItems = Array.isArray(gData?.items) ? gData.items : [];
        }

        eventsServicePlugin.set([
          ...items.map((e) => ({
            id: e.id,
            title: e.title,
            start: formatDateForScheduleX(e.start_time),
            end: formatDateForScheduleX(e.end_time),
            calendarId: e.source === "booking" ? "bookings" : "default",
          })),
          ...googleItems.map((g) => ({
            id: g.id,
            title: g.title,
            start: formatDateForScheduleX(g.start),
            end: formatDateForScheduleX(g.end),
            calendarId: "google" as const,
          })),
        ]);
        setLastRange({ start: startIso, end: endIso });
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedMemberId, eventsServicePlugin]
  );

  const refetch = useCallback(() => {
    if (lastRange) loadEvents(lastRange.start, lastRange.end);
    else {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      const end = new Date(now);
      end.setDate(end.getDate() + 21);
      loadEvents(start.toISOString(), end.toISOString());
    }
  }, [lastRange, loadEvents]);

  const ensureBookingSlug = useCallback(async () => {
    if (profile?.booking_slug) {
      setBookingSlug(profile.booking_slug);
      return profile.booking_slug;
    }
    try {
      const res = await fetch("/api/booking/setup", { method: "POST" });
      const json = await res.json();
      const slug = json?.data?.booking_slug;
      if (slug) {
        setBookingSlug(slug);
        return slug;
      }
    } catch {
      // ignore
    }
    return null;
  }, [profile?.booking_slug]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!userLoading && profile?.booking_slug) {
      setBookingSlug(profile.booking_slug);
    }
  }, [userLoading, profile?.booking_slug]);

  const memoizedViews = useMemo(
    () =>
      [createViewDay(), createViewWeek()] as [
        ReturnType<typeof createViewDay>,
        ReturnType<typeof createViewWeek>,
      ],
    []
  );

  const calendar = useNextCalendarApp({
    views: memoizedViews,
    events: [],
    locale: "fr-FR",
    firstDayOfWeek: 1,
    isResponsive: true,
    defaultView: "week",
    dayBoundaries: { start: "06:00", end: "22:00" },
    calendars: {
      default: { colorName: "primary" },
      bookings: { colorName: "blue" },
      google: {
        colorName: "slate",
        lightColors: {
          main: "#64748b",
          container: "#f1f5f9",
          onContainer: "#0f172a",
        },
        darkColors: {
          main: "#94a3b8",
          container: "#1e293b",
          onContainer: "#e2e8f0",
        },
      },
    },
    plugins: [eventsServicePlugin, controlsPlugin, dragPlugin, resizePlugin],
    callbacks: {
      onEventClick: (event: { id: string | number }) => {
        const ev = eventsRef.current.find((e) => e.id === String(event.id));
        if (ev) setSelectedEvent(ev);
      },
      onDoubleClickDateTime: (dateTime: string) => {
        setPendingCreateStart(dateTime);
        setCreateOpen(true);
      },
      onRangeUpdate: ({ start, end }: { start: string; end: string }) => {
        loadEvents(start, end);
      },
      onEventUpdate: async (updated: {
        id: string | number;
        start: string;
        end: string;
        title?: string;
      }) => {
        const id = String(updated.id);
        const ev = eventsRef.current.find((e) => e.id === id);
        const orig = ev
          ? {
              start: formatDateForScheduleX(ev.start_time),
              end: formatDateForScheduleX(ev.end_time),
            }
          : null;
        originalEventRef.current = orig;
        try {
          const res = await fetch(`/api/events/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              start_time: scheduleXToIso(updated.start),
              end_time: scheduleXToIso(updated.end),
              title: updated.title,
            }),
          });
          if (!res.ok) {
            if (orig)
              eventsServicePlugin.update({
                id,
                start: orig.start,
                end: orig.end,
                title: updated.title,
              });
          } else {
            setEvents((prev) =>
              prev.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      start_time: scheduleXToIso(updated.start),
                      end_time: scheduleXToIso(updated.end),
                    }
                  : e
              )
            );
          }
        } catch {
          if (orig)
            eventsServicePlugin.update({
              id,
              start: orig.start,
              end: orig.end,
              title: updated.title,
            });
        }
        originalEventRef.current = null;
      },
    },
  });

  // Force French locale on the controls plugin once the calendar instance is ready
  useEffect(() => {
    if (!calendar) return;
    controlsPlugin.setLocale("fr-FR");
  }, [calendar, controlsPlugin]);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    const end = new Date(now);
    end.setDate(end.getDate() + 21);
    loadEvents(start.toISOString(), end.toISOString());
  }, [selectedMemberId, loadEvents]);

  const handleCopyLink = useCallback(async () => {
    const slug = bookingSlug ?? (await ensureBookingSlug());
    if (!slug) return;
    const base =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");
    const url = `${base}/booking/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopySuccess(false);
    }
  }, [bookingSlug, ensureBookingSlug]);

  const bookingUrl = useMemo(() => {
    if (!bookingSlug) return null;
    const base =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/booking/${bookingSlug}`;
  }, [bookingSlug]);

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Page header */}
      <div className="border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50">
        <div className="flex items-start justify-between gap-4 px-6 py-5 lg:px-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Calendrier
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Gérez vos rendez-vous et suivez vos réservations.
            </p>
          </div>
          <Button
            onClick={() => {
              setPendingCreateStart(null);
              setCreateOpen(true);
            }}
            className="gap-2 shrink-0"
          >
            <CalendarPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Créer un événement</span>
            <span className="sm:hidden">Créer</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-6 lg:p-8">
        {/* Google Calendar connection banner */}
        {googleConnected === false && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            <span>Connecter Google Agenda pour voir vos événements Google dans ce calendrier.</span>
            <a
              href="/api/google/auth"
              className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
            >
              Connecter
            </a>
          </div>
        )}

        {/* Booking link card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                <Link2 className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Lien de prise de rendez-vous
                </p>
                {bookingUrl ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {bookingUrl}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    Partagez ce lien pour recevoir des réservations automatiquement.
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              disabled={userLoading}
              className={cn(
                "gap-2 shrink-0 transition-colors",
                copySuccess &&
                  "border-green-500 text-green-600 dark:border-green-500 dark:text-green-400"
              )}
            >
              {copySuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copySuccess ? "Copié !" : "Copier le lien"}
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="À venir"
            value={String(allTimeStats.upcoming)}
            loading={!allTimeStats.loaded}
            suffix={allTimeStats.upcoming === 1 ? "événement" : "événements"}
            icon={CalendarDays}
            tone="upcoming"
          />
          <StatCard
            label="Passés"
            value={String(allTimeStats.past)}
            loading={!allTimeStats.loaded}
            suffix={allTimeStats.past === 1 ? "événement" : "événements"}
            icon={Clock}
            tone="past"
          />
          <StatCard
            label="Aujourd'hui"
            value={String(todayCount)}
            loading={loading}
            suffix={todayCount === 1 ? "événement" : "événements"}
            icon={BookMarked}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {/* Calendar section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Vue semaine
              </h2>
              {loading && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Chargement…
                </span>
              )}
            </div>
            {members.length > 0 && (
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="h-8 w-[180px] text-sm bg-white dark:bg-zinc-900/50">
                  <SelectValue placeholder="Tous les membres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les membres</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
            <div className="sx__calendar h-[65vh] min-h-[420px]">
              <ScheduleXCalendar calendarApp={calendar} />
            </div>
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
            Double-cliquez sur un créneau pour créer · Glissez-déposez pour déplacer · Cliquez pour modifier
          </p>
        </div>
      </div>

      <EventCreateModal
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setPendingCreateStart(null);
        }}
        initialStart={pendingCreateStart}
        onSuccess={() => {
          setCreateOpen(false);
          setPendingCreateStart(null);
          refetch();
        }}
        eventsServicePlugin={eventsServicePlugin}
        formatDateForScheduleX={formatDateForScheduleX}
      />

      <EventEditModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onSuccess={() => {
          setSelectedEvent(null);
          refetch();
        }}
        eventsServicePlugin={eventsServicePlugin}
        formatDateForScheduleX={formatDateForScheduleX}
        isoToDatetimeLocal={isoToDatetimeLocal}
        datetimeLocalToIso={datetimeLocalToIso}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
  className,
  loading,
}: {
  label: string;
  value: string;
  suffix: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "upcoming" | "past";
  className?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white dark:bg-zinc-900/50 p-4 shadow-sm",
        tone === "upcoming"
          ? "border-blue-200 dark:border-blue-900/60"
          : tone === "past"
            ? "border-zinc-200 dark:border-white/10"
            : "border-zinc-200 dark:border-white/10",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 leading-tight">
          {label}
        </p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            tone === "upcoming"
              ? "text-blue-400 dark:text-blue-500"
              : "text-zinc-400 dark:text-zinc-500"
          )}
        />
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tracking-tight",
            tone === "upcoming"
              ? "text-blue-600 dark:text-blue-400"
              : "text-zinc-900 dark:text-zinc-50"
          )}
        >
          {value}
        </p>
      )}
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{suffix}</p>
    </div>
  );
}

function EventCreateModal({
  open,
  onOpenChange,
  initialStart,
  onSuccess,
  eventsServicePlugin,
  formatDateForScheduleX,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialStart: string | null;
  onSuccess: () => void;
  eventsServicePlugin: ReturnType<
    typeof import("@schedule-x/events-service").createEventsServicePlugin
  >;
  formatDateForScheduleX: (iso: string) => string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [googleMeet, setGoogleMeet] = useState(false);
  const [attendeeEmails, setAttendeeEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (initialStart) {
        setStart(isoToDatetimeLocal(scheduleXToIso(initialStart)));
        setEnd(isoToDatetimeLocal(scheduleXToIso(addMinutes(initialStart, 30))));
      } else {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        setStart(local);
        const later = new Date(now.getTime() + 30 * 60000);
        setEnd(
          `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}T${pad(later.getHours())}:${pad(later.getMinutes())}`
        );
      }
      setTitle("");
      setDescription("");
      setLocation("");
      setGoogleMeet(false);
      setAttendeeEmails("");
      setError(null);
    }
  }, [open, initialStart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      const msg = "Le titre est requis";
      setError(msg);
      toast.error(msg);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const parsedEmails = attendeeEmails
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          google_meet: googleMeet,
          attendee_emails: parsedEmails.length > 0 ? parsedEmails : undefined,
        }),
      });
      const json = await res.json();
      const data = json?.data ?? json;
      if (!res.ok) {
        const detailsStr =
          json?.error?.details && typeof json.error.details === "object"
            ? Object.values(json.error.details).filter(Boolean).join(", ")
            : "";
        const errMsg = json?.error?.message ?? (detailsStr || "Erreur lors de la création");
        setError(errMsg);
        toast.error(errMsg);
        return;
      }
      eventsServicePlugin.add({
        id: data.id,
        title: data.title,
        start: formatDateForScheduleX(data.start_time),
        end: formatDateForScheduleX(data.end_time),
        calendarId: "default",
      });
      toast.success("Événement créé");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel événement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="cv2-title">Titre *</Label>
            <Input
              id="cv2-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Appel découverte"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cv2-start">Début</Label>
              <Input
                id="cv2-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cv2-end">Fin</Label>
              <Input
                id="cv2-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cv2-location">Lieu</Label>
            <Input
              id="cv2-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex : Visio, Paris 8e…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cv2-description">Description</Label>
            <Input
              id="cv2-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
          {/* Attendees */}
          <div className="space-y-1.5">
            <Label htmlFor="cv2-attendees">Invités (e-mails, séparés par virgule)</Label>
            <Input
              id="cv2-attendees"
              type="text"
              value={attendeeEmails}
              onChange={(e) => setAttendeeEmails(e.target.value)}
              placeholder="jean@example.com, marie@example.com"
            />
          </div>
          {/* Google Meet toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Créer une visio Google Meet</span>
            </div>
            <Switch
              checked={googleMeet}
              onCheckedChange={setGoogleMeet}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventEditModal({
  event,
  onClose,
  onSuccess,
  eventsServicePlugin,
  formatDateForScheduleX,
  isoToDatetimeLocal,
  datetimeLocalToIso,
}: {
  event: EventItem | null;
  onClose: () => void;
  onSuccess: () => void;
  eventsServicePlugin: ReturnType<typeof createEventsServicePlugin>;
  formatDateForScheduleX: (iso: string) => string;
  isoToDatetimeLocal: (iso: string) => string;
  datetimeLocalToIso: (s: string) => string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setStart(isoToDatetimeLocal(event.start_time));
      setEnd(isoToDatetimeLocal(event.end_time));
      setError(null);
    }
  }, [event, isoToDatetimeLocal]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          start_time: datetimeLocalToIso(start),
          end_time: datetimeLocalToIso(end),
        }),
      });
      const json = await res.json();
      const data = json?.data ?? json;
      if (!res.ok) {
        const errMsg = json?.error?.message ?? "Erreur lors de l'enregistrement";
        setError(errMsg);
        toast.error(errMsg);
        return;
      }
      eventsServicePlugin.update({
        id: event.id,
        title: data.title,
        start: formatDateForScheduleX(data.start_time),
        end: formatDateForScheduleX(data.end_time),
        calendarId: event.source === "booking" ? "bookings" : "default",
      });
      toast.success("Événement enregistré");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm("Supprimer cet événement ?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = json?.error?.message ?? "Erreur lors de la suppression";
        setError(errMsg);
        toast.error(errMsg);
        return;
      }
      eventsServicePlugin.remove(event.id);
      toast.success("Événement supprimé");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;événement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {event.source === "booking" && (event.guest_name || event.guest_email) && (
            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm">
              <p className="font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 text-xs uppercase tracking-wider">
                Infos du rendez-vous
              </p>
              {event.guest_name && (
                <p className="text-zinc-800 dark:text-zinc-200">
                  <span className="text-zinc-500 dark:text-zinc-400">Nom ·</span>{" "}
                  {event.guest_name}
                </p>
              )}
              {event.guest_email && (
                <p className="text-zinc-800 dark:text-zinc-200 mt-0.5">
                  <span className="text-zinc-500 dark:text-zinc-400">Email ·</span>{" "}
                  {event.guest_email}
                </p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ev2-title">Titre *</Label>
            <Input
              id="ev2-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev2-start">Début</Label>
              <Input
                id="ev2-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev2-end">Fin</Label>
              <Input
                id="ev2-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev2-location">Lieu</Label>
            <Input
              id="ev2-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lieu"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev2-description">Description</Label>
            <Input
              id="ev2-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="sm:mr-auto"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
