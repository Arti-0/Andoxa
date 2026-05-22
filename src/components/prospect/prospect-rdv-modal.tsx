"use client";

// Internal "Réserver un RDV" modal — mounted on the prospect detail page.
// Lean port of the design (booking-modal (3).jsx): mini calendar + time grid +
// duration + Google Meet toggle. The full design's "busy slot conflict view"
// is deferred to a future polish pass — needs a server-side availability
// fetch we can stub later.
//
// Posts to /api/events via fetch (calendar's useCreateEvent is a hook tied
// to the calendar feature surface — keeping this component standalone so it
// can be mounted from other pages later without coupling to that hook).

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Video,
  X,
  Zap,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useGoogleStatus } from "@/hooks/use-google-status";
import { cn } from "@/lib/utils";

const FR_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const FR_DAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

const DURATION_OPTIONS = [
  { mins: 15, label: "15 min" },
  { mins: 30, label: "30 min" },
  { mins: 45, label: "45 min" },
  { mins: 60, label: "1h" },
  { mins: 90, label: "1h30" },
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Monday-first
  const leading = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function generateTimeSlots() {
  const out: { h: number; m: number }[] = [];
  for (let h = 8; h <= 19; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 19 && m > 0) break;
      out.push({ h, m });
    }
  }
  return out;
}
const TIME_SLOTS = generateTimeSlots();

interface ProspectLite {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

export function ProspectRdvModal({
  open,
  onOpenChange,
  prospect,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: ProspectLite;
  onCreated?: () => void;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState<Date>(today);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ h: number; m: number } | null>(null);
  const [duration, setDuration] = useState(30);
  const [withMeet, setWithMeet] = useState(true);
  const [notes, setNotes] = useState("");

  const { data: googleStatus } = useGoogleStatus();
  const qc = useQueryClient();

  const monthCells = useMemo(
    () => buildMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth],
  );

  // ── Busy slots on the selected day ──────────────────────────────────────
  // Fetches every event whose start_time falls on the selected day for the
  // current workspace, then compares each time-slot against those windows.
  // Cancelled/no-show events are still considered occupied (you didn't
  // commit a time-slot freed up just because a meeting was a no-show).
  const dayBounds = useMemo(() => {
    if (!selectedDay) return null;
    const start = new Date(selectedDay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDay);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [selectedDay]);

  interface BusyEvent {
    id: string;
    title: string | null;
    start_time: string;
    end_time: string;
    status: string | null;
  }
  const { data: dayEvents = [] } = useQuery({
    queryKey: ["prospect-rdv-day-events", dayBounds?.start ?? "none"],
    enabled: open && !!dayBounds,
    queryFn: async () => {
      if (!dayBounds) return [] as BusyEvent[];
      const params = new URLSearchParams({
        start: dayBounds.start,
        end: dayBounds.end,
        per_page: "200",
        source: "andoxa",
      });
      const res = await fetch(`/api/events?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) return [] as BusyEvent[];
      const json = await res.json();
      const items = ((json.data ?? json) as { items?: BusyEvent[] }).items ?? [];
      return items;
    },
    staleTime: 30_000,
  });

  /**
   * For a given time-slot + duration, return the conflicting event title (if
   * any) so the UI can either disable the slot or show a tooltip. A slot
   * "conflicts" when its [slotStart, slotStart+duration) range overlaps any
   * existing event's [start_time, end_time) range.
   */
  const conflictFor = (slotH: number, slotM: number): BusyEvent | null => {
    if (!selectedDay || dayEvents.length === 0) return null;
    const slotStart = new Date(selectedDay);
    slotStart.setHours(slotH, slotM, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + duration * 60_000);
    for (const ev of dayEvents) {
      const evStart = new Date(ev.start_time);
      const evEnd = new Date(ev.end_time);
      if (slotStart < evEnd && slotEnd > evStart) {
        return ev;
      }
    }
    return null;
  };

  const reset = () => {
    setViewMonth(today);
    setSelectedDay(null);
    setSelectedSlot(null);
    setDuration(30);
    setWithMeet(true);
    setNotes("");
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!selectedDay || !selectedSlot) throw new Error("Choisissez un créneau");
      const start = new Date(selectedDay);
      start.setHours(selectedSlot.h, selectedSlot.m, 0, 0);
      const end = new Date(start.getTime() + duration * 60_000);

      const title = prospect.full_name
        ? `RDV avec ${prospect.full_name}`
        : "RDV";

      const res = await fetch("/api/events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          prospect_id: prospect.id,
          meeting_kind: withMeet ? "meet" : "other",
          google_meet: withMeet,
          notify_attendees: withMeet,
          description: notes.trim() || undefined,
          attendee_emails: withMeet && prospect.email ? [prospect.email] : undefined,
          event_type: "me",
          status: "confirmed",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { error?: { message?: string } }).error?.message ?? "Échec",
        );
      }
      return (await res.json()) as { id: string };
    },
    onSuccess: () => {
      toast.success("RDV créé");
      void qc.invalidateQueries({ queryKey: ["calendar2", "events"] });
      onCreated?.();
      onOpenChange(false);
      reset();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erreur");
    },
  });

  const prevMonth = viewMonth.getFullYear() * 12 + viewMonth.getMonth();
  const nowMonth = today.getFullYear() * 12 + today.getMonth();
  const canGoPrev = prevMonth > nowMonth;

  const submit = () => {
    if (!selectedDay || !selectedSlot) {
      toast.error("Choisissez une date et une heure.");
      return;
    }
    create.mutate();
  };

  const slotMissingEmail = withMeet && !prospect.email;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-[var(--brand-blue)]" />
            Réserver un RDV
            {prospect.full_name && (
              <span className="text-sm font-normal text-muted-foreground">
                avec {prospect.full_name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* LEFT: mini calendar */}
            <div>
              <Label className="mb-2 block">Date</Label>
              <div className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      canGoPrev &&
                      setViewMonth(
                        new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
                      )
                    }
                    disabled={!canGoPrev}
                    className="grid size-6 place-items-center rounded hover:bg-muted disabled:opacity-30"
                    aria-label="Mois précédent"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <span className="text-[12.5px] font-semibold capitalize">
                    {FR_MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setViewMonth(
                        new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
                      )
                    }
                    className="grid size-6 place-items-center rounded hover:bg-muted"
                    aria-label="Mois suivant"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
                <div className="mb-1 grid grid-cols-7 gap-0.5 text-center">
                  {FR_DAY_INITIALS.map((d, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold uppercase text-muted-foreground"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {monthCells.map((cell, i) => {
                    if (!cell) {
                      return <span key={i} className="h-7" />;
                    }
                    const isPast = cell < today;
                    const isSelected =
                      selectedDay?.toDateString() === cell.toDateString();
                    const isToday = cell.toDateString() === today.toDateString();
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isPast}
                        onClick={() => {
                          setSelectedDay(cell);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          "h-7 rounded text-[11.5px] font-medium transition-colors",
                          isPast && "cursor-not-allowed text-muted-foreground/30",
                          !isPast && !isSelected && "hover:bg-muted",
                          isSelected &&
                            "bg-[var(--brand-blue)] text-white",
                          isToday && !isSelected && "ring-1 ring-[var(--brand-blue)]/50",
                        )}
                      >
                        {cell.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: time slots + options */}
            <div>
              <Label className="mb-2 block">
                Heure
                {selectedDay && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({selectedDay.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })})
                  </span>
                )}
              </Label>
              {!selectedDay ? (
                <div className="flex h-[224px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                  Choisissez une date à gauche.
                </div>
              ) : (
                <>
                <div className="grid h-[224px] grid-cols-3 gap-1.5 overflow-y-auto rounded-md border p-2">
                  {TIME_SLOTS.map((s) => {
                    const active =
                      selectedSlot?.h === s.h && selectedSlot?.m === s.m;
                    const conflict = conflictFor(s.h, s.m);
                    const isBusy = !!conflict;
                    return (
                      <button
                        key={`${s.h}-${s.m}`}
                        type="button"
                        onClick={() => setSelectedSlot(s)}
                        title={
                          conflict
                            ? `Conflit · ${conflict.title ?? "Événement existant"}`
                            : undefined
                        }
                        className={cn(
                          "relative rounded border px-2 py-1 text-[12px] font-medium transition-colors",
                          active
                            ? "border-[var(--brand-blue)] bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]"
                            : isBusy
                              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "hover:bg-muted",
                        )}
                      >
                        {String(s.h).padStart(2, "0")}:{String(s.m).padStart(2, "0")}
                        {isBusy && !active && (
                          <span
                            className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-500"
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedSlot && conflictFor(selectedSlot.h, selectedSlot.m) && (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11.5px] leading-snug text-amber-900">
                    ⚠ Ce créneau chevauche{" "}
                    <strong className="font-semibold">
                      {conflictFor(selectedSlot.h, selectedSlot.m)?.title ?? "un autre événement"}
                    </strong>
                    . Vous pouvez quand même le réserver — Andoxa ne bloque pas.
                  </div>
                )}
                </>
              )}

              <Label className="mb-2 mt-4 block">Durée</Label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_OPTIONS.map((d) => {
                  const active = duration === d.mins;
                  return (
                    <button
                      key={d.mins}
                      type="button"
                      onClick={() => setDuration(d.mins)}
                      className={cn(
                        "rounded border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                        active
                          ? "border-[var(--brand-blue)] bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]"
                          : "hover:bg-muted",
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Google Meet + notes */}
          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/30">
              <Switch checked={withMeet} onCheckedChange={setWithMeet} />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Video className="size-3.5 text-emerald-600" />
                  Générer un lien Google Meet
                </div>
                <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Le lien est partagé par e-mail au prospect.
                </div>
              </div>
            </label>

            {withMeet && googleStatus && !googleStatus.connected && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-900">
                ⚠ Votre compte Google n&apos;est pas connecté. Le lien Meet ne
                sera pas généré.{" "}
                <a
                  href="/settings/integrations"
                  className="font-medium underline"
                >
                  Connecter
                </a>
                .
              </div>
            )}
            {slotMissingEmail && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-900">
                ⚠ Ce prospect n&apos;a pas d&apos;e-mail — l&apos;invitation
                Google Meet ne lui sera pas envoyée. Ajoutez-en un sur la fiche
                pour qu&apos;il reçoive le lien.
              </div>
            )}

            <div>
              <Label htmlFor="rdv-notes" className="mb-1.5 block">
                Notes <span className="text-muted-foreground">(optionnel)</span>
              </Label>
              <Textarea
                id="rdv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ordre du jour, points à aborder…"
                rows={3}
                maxLength={1000}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t bg-muted/30 px-6 py-3">
          <div className="text-[11.5px] text-muted-foreground">
            {selectedDay && selectedSlot ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3" />
                {selectedDay.toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {String(selectedSlot.h).padStart(2, "0")}:
                {String(selectedSlot.m).padStart(2, "0")} · {duration} min
              </span>
            ) : (
              "Sélectionnez une date et une heure"
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              <X className="size-3.5" />
              Annuler
            </Button>
            <Button
              onClick={submit}
              disabled={!selectedDay || !selectedSlot || create.isPending}
            >
              {create.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : withMeet ? (
                <Video className="size-3.5" />
              ) : (
                <CalendarDays className="size-3.5" />
              )}
              {create.isPending ? "Création…" : "Réserver"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
