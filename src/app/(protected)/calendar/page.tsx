"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import { createViewWeek } from "@schedule-x/calendar";
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
import { Link2 } from "lucide-react";
import { toast } from "sonner";

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
  const normalized = scheduleXStr.replace(" ", "T");
  return new Date(normalized).toISOString();
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

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

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
        const res = await fetch(`/api/events?${params}`);
        if (!res.ok) {
          setEvents([]);
          return;
        }
        const json = await res.json();
        const data = json?.data ?? json;
        const items = (data?.items ?? []) as EventItem[];
        setEvents(Array.isArray(items) ? items : []);
        eventsServicePlugin.set(
          items.map((e) => ({
            id: e.id,
            title: e.title,
            start: formatDateForScheduleX(e.start_time),
            end: formatDateForScheduleX(e.end_time),
            calendarId: e.source === "booking" ? "bookings" : "default",
          }))
        );
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

  const memoizedViews = useMemo(
    () => [createViewWeek()] as [ReturnType<typeof createViewWeek>, ...ReturnType<typeof createViewWeek>[]],
    []
  );

  const calendar = useCalendarApp({
    views: memoizedViews,
    events: [],
    defaultView: "week",
    dayBoundaries: { start: "06:00", end: "22:00" },
    calendars: {
      default: { colorName: "primary" },
      bookings: { colorName: "blue" },
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
      onEventUpdate: async (updated: { id: string | number; start: string; end: string; title?: string }) => {
        const id = String(updated.id);
        const ev = eventsRef.current.find((e) => e.id === id);
        const orig = ev ? { start: formatDateForScheduleX(ev.start_time), end: formatDateForScheduleX(ev.end_time) } : null;
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
            if (orig) eventsServicePlugin.update({ id, start: orig.start, end: orig.end, title: updated.title });
          } else {
            const ev = eventsRef.current.find((e) => e.id === id);
            if (ev) setEvents((prev) => prev.map((e) => (e.id === id ? { ...ev, start_time: scheduleXToIso(updated.start), end_time: scheduleXToIso(updated.end) } : e)));
          }
        } catch {
          if (orig) eventsServicePlugin.update({ id, start: orig.start, end: orig.end, title: updated.title });
        }
        originalEventRef.current = null;
      },
    },
  });

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
    if (!slug) {
      setCopySuccess(false);
      return;
    }
    const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const url = `${base}/booking/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopySuccess(false);
    }
  }, [bookingSlug, ensureBookingSlug]);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendrier</h1>
          <p className="text-muted-foreground">
            Gérez vos rendez-vous et événements
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par membre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout le monde</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleCopyLink}
            disabled={userLoading}
            className="gap-2"
          >
            <Link2 className="h-4 w-4" />
            {copySuccess ? "Copié !" : "Copier mon lien de prise de RDV"}
          </Button>
        </div>
      </div>

      <section className="flex-1 min-h-0 rounded-lg border bg-card overflow-hidden">
        <div className="h-[var(--calendar-page-height,70vh)] sx__calendar">
          <ScheduleXCalendar calendarApp={calendar} />
        </div>
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-muted-foreground">Chargement...</span>
          </div>
        )}
      </section>

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
  eventsServicePlugin: ReturnType<typeof import("@schedule-x/events-service").createEventsServicePlugin>;
  formatDateForScheduleX: (iso: string) => string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialStart) {
      setStart(isoToDatetimeLocal(scheduleXToIso(initialStart)));
      setEnd(isoToDatetimeLocal(scheduleXToIso(addMinutes(initialStart, 30))));
      setTitle("");
      setDescription("");
      setLocation("");
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
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
        }),
      });
      const json = await res.json();
      const data = json?.data ?? json;
      if (!res.ok) {
        const detailsStr = json?.error?.details && typeof json.error.details === "object"
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel événement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="create-title">Titre *</Label>
            <Input id="create-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" required />
          </div>
          <div>
            <Label htmlFor="create-start">Début</Label>
            <Input id="create-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="create-end">Fin</Label>
            <Input id="create-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="create-location">Lieu</Label>
            <Input id="create-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lieu" />
          </div>
          <div>
            <Label htmlFor="create-description">Description</Label>
            <Input id="create-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Création..." : "Créer"}
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'événement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {event.source === "booking" && (event.guest_name || event.guest_email) && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <p className="font-medium text-muted-foreground mb-1">Informations du rendez-vous</p>
              {event.guest_name && <p><strong>Nom :</strong> {event.guest_name}</p>}
              {event.guest_email && <p><strong>Email :</strong> {event.guest_email}</p>}
            </div>
          )}
          <div>
            <Label htmlFor="edit-title">Titre *</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" required />
          </div>
          <div>
            <Label htmlFor="edit-start">Début</Label>
            <Input id="edit-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-end">Fin</Label>
            <Input id="edit-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-location">Lieu</Label>
            <Input id="edit-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lieu" />
          </div>
          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
