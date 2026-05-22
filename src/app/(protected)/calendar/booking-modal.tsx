"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useBookingSettings,
  useUpdateBookingSettings,
  type BookingDaySchedule,
  type BookingException,
  type BookingTimeRange,
} from "./queries";

type Props = { open: boolean; onClose: () => void };

// Day order for display: Mon..Sun. `val` matches JS getDay() (0=Sun..6=Sat).
const DAYS = [
  { val: 1, short: "Lundi" },
  { val: 2, short: "Mardi" },
  { val: 3, short: "Mercredi" },
  { val: 4, short: "Jeudi" },
  { val: 5, short: "Vendredi" },
  { val: 6, short: "Samedi" },
  { val: 0, short: "Dimanche" },
];

const SLOT_OPTIONS = [15, 30, 45, 60];
const DEFAULT_RANGE: BookingTimeRange = { start: "09:00", end: "18:00" };

/* ─── Lead-time (value + unit) helpers ────────────────────────────────────
 *
 * The booking lead-time is stored as a single fractional `minNoticeHours`
 * value (consumed by `/api/booking/[slug]/slots`). The UI lets users pick
 * a friendlier {value, unit} pair — converted to/from hours on the edges. */

type NoticeUnit = "minutes" | "hours" | "days" | "weeks" | "months";

const UNIT_TO_HOURS: Record<NoticeUnit, number> = {
  minutes: 1 / 60,
  hours: 1,
  days: 24,
  weeks: 24 * 7,
  // 30 d ≈ a "month" for booking purposes — exact calendar months would
  // complicate slot generation in the public booking flow with no upside.
  months: 24 * 30,
};

const UNIT_LABEL_SINGULAR: Record<NoticeUnit, string> = {
  minutes: "minute",
  hours: "heure",
  days: "jour",
  weeks: "semaine",
  months: "mois",
};

const UNIT_LABEL_PLURAL: Record<NoticeUnit, string> = {
  minutes: "minutes",
  hours: "heures",
  days: "jours",
  weeks: "semaines",
  months: "mois",
};

/** Pick the coarsest unit that produces an integer value, so a stored
 *  168 h round-trips back to "1 semaine" instead of "168 heures". */
function hoursToValueUnit(hours: number): { value: number; unit: NoticeUnit } {
  if (!Number.isFinite(hours) || hours < 0) return { value: 4, unit: "hours" };
  const candidates: NoticeUnit[] = ["months", "weeks", "days", "hours", "minutes"];
  for (const u of candidates) {
    const v = hours / UNIT_TO_HOURS[u];
    if (v >= 1 && Math.abs(v - Math.round(v)) < 1e-9) {
      return { value: Math.round(v), unit: u };
    }
  }
  // Fractional values that don't fit cleanly into any unit — fall back to
  // minutes, which is the highest resolution we offer.
  return { value: Math.max(0, Math.round(hours * 60)), unit: "minutes" };
}

const DEFAULT_SCHEDULES: Record<number, BookingDaySchedule> = {
  0: { enabled: false, ranges: [DEFAULT_RANGE] },
  1: { enabled: true,  ranges: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
  2: { enabled: true,  ranges: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
  3: { enabled: true,  ranges: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
  4: { enabled: true,  ranges: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
  5: { enabled: true,  ranges: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
  6: { enabled: false, ranges: [DEFAULT_RANGE] },
};

export function BookingModal({ open, onClose }: Props) {
  const { data: settings, isLoading } = useBookingSettings();
  const updateSettings = useUpdateBookingSettings();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slotMinutes, setSlotMinutes] = useState(30);
  // `daysAhead` is no longer surfaced in the UI — it was a duplicate of the
  // lead-time concept and confused users. We preserve whatever value is
  // stored so admin scripts / future settings panels can still tune it.
  const [daysAhead, setDaysAhead] = useState(14);
  /** Lead time before a slot can be booked. Stored as fractional hours,
   *  surfaced to the user as a {value, unit} pair. Default 4 hours. */
  const [noticeValue, setNoticeValue] = useState(4);
  const [noticeUnit, setNoticeUnit] = useState<NoticeUnit>("hours");
  /** Toggle for the "Un WhatsApp post-RDV sera envoyé" notice (default true). */
  const [showPostBookingWaNotice, setShowPostBookingWaNotice] = useState(true);
  const [schedules, setSchedules] = useState<Record<number, BookingDaySchedule>>(DEFAULT_SCHEDULES);
  const [exceptions, setExceptions] = useState<BookingException[]>([]);
  const [copyOpen, setCopyOpen] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && settings) {
      setTitle(settings.title);
      setDescription(settings.description);
      setSlotMinutes(settings.availability.slotMinutes);
      setDaysAhead(settings.availability.daysAhead);
      const stored = settings.availability.minNoticeHours ?? 4;
      const { value, unit } = hoursToValueUnit(stored);
      setNoticeValue(value);
      setNoticeUnit(unit);
      setShowPostBookingWaNotice(settings.show_post_booking_wa_notice ?? true);
      setSchedules(settings.availability.daySchedules ?? DEFAULT_SCHEDULES);
      setExceptions(settings.availability.exceptions ?? []);
      setSaved(false);
      setError(null);
    }
  }, [open, settings]);

  if (!open) return null;

  /* ─── schedule mutators ─── */

  const updateRanges = (day: number, ranges: BookingTimeRange[]) => {
    setSchedules((s) => ({ ...s, [day]: { ...s[day], ranges } }));
  };
  const setEnabled = (day: number, enabled: boolean) => {
    setSchedules((s) => ({ ...s, [day]: { ...s[day], enabled } }));
  };
  const addRange = (day: number) => {
    const sched = schedules[day] ?? { enabled: true, ranges: [] };
    updateRanges(day, [...sched.ranges, DEFAULT_RANGE]);
  };
  const removeRange = (day: number, idx: number) => {
    const sched = schedules[day];
    if (!sched) return;
    updateRanges(day, sched.ranges.filter((_, i) => i !== idx));
  };
  const patchRange = (day: number, idx: number, patch: Partial<BookingTimeRange>) => {
    const sched = schedules[day];
    if (!sched) return;
    updateRanges(
      day,
      sched.ranges.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  };

  /** Copy day X's ranges to a list of target days. */
  const copyToDays = (sourceDay: number, targetDays: number[]) => {
    const sourceRanges = schedules[sourceDay]?.ranges ?? [];
    setSchedules((s) => {
      const next = { ...s };
      for (const td of targetDays) {
        next[td] = { enabled: true, ranges: sourceRanges.map((r) => ({ ...r })) };
      }
      return next;
    });
  };

  /* ─── exception mutators ─── */

  const addException = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const iso = today.toISOString().slice(0, 10);
    setExceptions((arr) => [
      ...arr,
      { date: iso, ranges: [{ start: "09:00", end: "18:00" }] },
    ]);
  };
  const removeException = (idx: number) => {
    setExceptions((arr) => arr.filter((_, i) => i !== idx));
  };
  const patchException = (idx: number, patch: Partial<BookingException>) => {
    setExceptions((arr) =>
      arr.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    );
  };
  const toggleExceptionClosed = (idx: number) => {
    setExceptions((arr) =>
      arr.map((e, i) =>
        i === idx
          ? { ...e, ranges: e.ranges === null ? [{ start: "09:00", end: "18:00" }] : null }
          : e,
      ),
    );
  };

  /* ─── save ─── */

  const handleSave = () => {
    setError(null);

    // Validate every range — start < end
    for (const sched of Object.values(schedules)) {
      if (!sched.enabled) continue;
      for (const r of sched.ranges) {
        if (r.end <= r.start) {
          setError(
            "Pour chaque plage, l'heure de fin doit être après l'heure de début.",
          );
          return;
        }
      }
    }
    if (!Object.values(schedules).some((s) => s.enabled && s.ranges.length > 0)) {
      setError("Activez au moins un jour avec une plage horaire.");
      return;
    }
    for (const ex of exceptions) {
      if (ex.ranges) {
        for (const r of ex.ranges) {
          if (r.end <= r.start) {
            setError("Une exception a une plage invalide.");
            return;
          }
        }
      }
    }

    const minNoticeHours = Math.max(0, noticeValue) * UNIT_TO_HOURS[noticeUnit];

    updateSettings.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        show_post_booking_wa_notice: showPostBookingWaNotice,
        availability: {
          slotMinutes,
          daysAhead,
          minNoticeHours,
          daySchedules: schedules,
          exceptions,
        },
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => { onClose(); setSaved(false); }, 1200);
        },
        onError: (e) => setError(e instanceof Error ? e.message : "Erreur"),
      },
    );
  };

  return (
    <>
      <div onClick={onClose} className="cal2-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)", zIndex: 200 }} />
      <div
        className="cal2-fade-in"
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "92%", maxWidth: 640, maxHeight: "88vh", background: "var(--cal2-surface)", borderRadius: 12, zIndex: 201, boxShadow: "0 24px 60px rgba(15,23,42,0.22)", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div style={{ height: 4, background: "#0052D9", flexShrink: 0 }} />

        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid var(--cal2-border-faint)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--cal2-text)", letterSpacing: "-0.015em", lineHeight: 1.25 }}>
              Personnaliser la page de booking
            </h2>
            <div style={{ fontSize: 12, color: "var(--cal2-text-muted)", marginTop: 4, textWrap: "balance", maxWidth: 440, lineHeight: 1.5 }}>
              Ces réglages contrôlent ce que vos invités voient sur votre lien de réservation, et la façon dont les créneaux leur sont proposés.
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid var(--cal2-border-soft)", background: "var(--cal2-surface)", borderRadius: 7, color: "var(--cal2-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 22px 22px" }}>
          {isLoading ? (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "var(--cal2-text-faint)" }}>Chargement…</div>
          ) : (
            <>
              <Section label="Présentation" hint="Le titre et le texte que verront vos invités sur la page publique.">
                <Field label="Titre de la page">
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: RDV avec Marie Dupont" style={inputStyle} />
                </Field>

                <Field label="Description" hint="Affichée sous le titre. Quelques mots suffisent.">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Une courte description, ce que vous proposez, votre disponibilité…" style={{ ...inputStyle, minHeight: 76, resize: "vertical", fontFamily: "inherit" }} />
                </Field>
              </Section>

              <Section label="Réservation" hint="Comment les créneaux sont proposés.">
                <Field label="Durée des créneaux">
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {SLOT_OPTIONS.map((m) => {
                      const active = slotMinutes === m;
                      return (
                        <button
                          key={m}
                          onClick={() => setSlotMinutes(m)}
                          style={{ padding: "6px 14px", background: active ? "var(--cal2-blue-tint)" : "var(--cal2-surface)", color: active ? "#0052D9" : "var(--cal2-text-muted)", border: `1px solid ${active ? "#0052D9" : "var(--cal2-border-soft)"}`, borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          {m} min
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field
                  label="Fenêtre de réservation"
                  hint="Délai minimum entre maintenant et le prochain créneau réservable."
                >
                  <NoticePicker
                    value={noticeValue}
                    unit={noticeUnit}
                    onValueChange={setNoticeValue}
                    onUnitChange={setNoticeUnit}
                  />
                </Field>
              </Section>

              <Section label="Disponibilités" hint="Vos horaires hebdomadaires et les dates qui les surchargent.">
                <Field
                  label="Plages hebdomadaires"
                  hint="Plusieurs plages possibles par jour."
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, border: "1px solid var(--cal2-border-faint)", borderRadius: 8, padding: 8, background: "var(--cal2-canvas-soft)" }}>
                    {DAYS.map((d) => {
                      const sched = schedules[d.val] ?? { enabled: false, ranges: [DEFAULT_RANGE] };
                      return (
                        <DayRow
                          key={d.val}
                          label={d.short}
                          sched={sched}
                          onToggleEnabled={(v) => setEnabled(d.val, v)}
                          onAddRange={() => addRange(d.val)}
                          onRemoveRange={(i) => removeRange(d.val, i)}
                          onPatchRange={(i, p) => patchRange(d.val, i, p)}
                          onCopyClick={() => setCopyOpen(copyOpen === d.val ? null : d.val)}
                          copyOpen={copyOpen === d.val}
                          onCopyConfirm={(targets) => {
                            copyToDays(d.val, targets);
                            setCopyOpen(null);
                          }}
                          sourceDay={d.val}
                        />
                      );
                    })}
                  </div>
                </Field>

                <Field
                  label="Exceptions"
                  hint="Surcharge la disponibilité d'un jour précis — vacances, jour férié, créneau exceptionnel."
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {exceptions.length === 0 ? (
                      <div style={{ padding: "10px 12px", border: "1px dashed var(--cal2-border-soft)", borderRadius: 7, fontSize: 12, color: "var(--cal2-text-faint)", textWrap: "balance" }}>
                        Aucune exception. Ajoutez-en une pour fermer un jour ou ouvrir un créneau ponctuel.
                      </div>
                    ) : (
                      exceptions.map((ex, i) => (
                        <ExceptionRow
                          key={i}
                          ex={ex}
                          onPatch={(p) => patchException(i, p)}
                          onToggleClosed={() => toggleExceptionClosed(i)}
                          onRemove={() => removeException(i)}
                        />
                      ))
                    )}
                    <button
                      onClick={addException}
                      style={{ alignSelf: "flex-start", padding: "6px 12px", background: "var(--cal2-surface)", color: "#0052D9", border: "1px dashed var(--cal2-border-soft)", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0052D9"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--cal2-border-soft)"; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      Ajouter une exception
                    </button>
                  </div>
                </Field>
              </Section>

              <Section label="Options" hint="Petits réglages que vos invités voient ou ressentent.">
                <Field label="WhatsApp post-RDV">
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "10px 12px", border: "1px solid var(--cal2-border-faint)", borderRadius: 8, background: "var(--cal2-surface)" }}>
                    <span
                      onClick={() => setShowPostBookingWaNotice(!showPostBookingWaNotice)}
                      style={{ position: "relative", width: 32, height: 18, background: showPostBookingWaNotice ? "#0052D9" : "var(--cal2-border)", borderRadius: 999, flexShrink: 0, transition: "background 140ms", cursor: "pointer", marginTop: 1 }}
                    >
                      <span style={{ position: "absolute", top: 2, left: showPostBookingWaNotice ? 16 : 2, width: 14, height: 14, background: "var(--cal2-surface)", borderRadius: "50%", transition: "left 140ms" }} />
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--cal2-text)" }}>
                        Afficher l&apos;indication « Un WhatsApp post-RDV sera envoyé »
                      </span>
                      <span style={{ fontSize: 11.5, color: "var(--cal2-text-faint)", textWrap: "balance", lineHeight: 1.45 }}>
                        Visible uniquement si un workflow « Réunion réservée » est actif sur votre compte.
                      </span>
                    </span>
                  </label>
                </Field>
              </Section>

              {error && (
                <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7, fontSize: 12.5, color: "#B91C1C", textWrap: "balance" }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: "12px 22px", borderTop: "1px solid var(--cal2-border-faint)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <button onClick={onClose} style={{ background: "transparent", color: "var(--cal2-text-muted)", border: "none", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: "8px 4px" }}>Annuler</button>
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending || saved || isLoading}
            style={{ padding: "9px 18px", background: saved ? "#10B981" : "#0052D9", color: "var(--cal2-surface)", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 1px 2px rgba(0,82,217,0.28)", opacity: (updateSettings.isPending || isLoading) ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6, transition: "background 160ms" }}
          >
            {saved ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                Enregistré
              </>
            ) : updateSettings.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Day row (multi-range + apply-to) ─── */

function DayRow({
  label,
  sched,
  onToggleEnabled,
  onAddRange,
  onRemoveRange,
  onPatchRange,
  onCopyClick,
  copyOpen,
  onCopyConfirm,
  sourceDay,
}: {
  label: string;
  sched: BookingDaySchedule;
  onToggleEnabled: (enabled: boolean) => void;
  onAddRange: () => void;
  onRemoveRange: (idx: number) => void;
  onPatchRange: (idx: number, patch: Partial<BookingTimeRange>) => void;
  onCopyClick: () => void;
  copyOpen: boolean;
  onCopyConfirm: (targetDays: number[]) => void;
  sourceDay: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 4px", borderBottom: "1px solid #F1F5F9" }}>
      {/* Toggle */}
      <button
        onClick={() => onToggleEnabled(!sched.enabled)}
        style={{ position: "relative", width: 32, height: 18, background: sched.enabled ? "#0052D9" : "#CBD5E1", borderRadius: 999, flexShrink: 0, transition: "background 140ms", cursor: "pointer", border: "none", padding: 0, marginTop: 6 }}
      >
        <span style={{ position: "absolute", top: 2, left: sched.enabled ? 16 : 2, width: 14, height: 14, background: "#fff", borderRadius: "50%", transition: "left 140ms" }} />
      </button>

      {/* Day label */}
      <span style={{ fontSize: 12.5, color: sched.enabled ? "#0F172A" : "#94A3B8", fontWeight: 500, width: 84, flexShrink: 0, paddingTop: 7 }}>
        {label}
      </span>

      {/* Ranges + actions */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0, opacity: sched.enabled ? 1 : 0.45 }}>
        {sched.ranges.length === 0 && sched.enabled && (
          <div style={{ fontSize: 11.5, color: "#94A3B8", padding: "4px 0" }}>
            Aucune plage — ajoutez-en une.
          </div>
        )}
        {sched.ranges.map((r, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="time"
              value={r.start}
              disabled={!sched.enabled}
              onChange={(e) => onPatchRange(idx, { start: e.target.value })}
              style={timeInputStyle}
            />
            <span style={{ fontSize: 11.5, color: "#94A3B8" }}>–</span>
            <input
              type="time"
              value={r.end}
              disabled={!sched.enabled}
              onChange={(e) => onPatchRange(idx, { end: e.target.value })}
              style={timeInputStyle}
            />
            {sched.enabled && (
              <button
                onClick={() => onRemoveRange(idx)}
                title="Supprimer cette plage"
                style={{ width: 22, height: 22, border: "none", background: "transparent", borderRadius: 5, color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#EF4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        ))}
        {sched.enabled && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: 2 }}>
            <button
              onClick={onAddRange}
              style={{ background: "transparent", color: "#0052D9", border: "none", fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4, padding: 0 }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Ajouter une plage
            </button>
            <div style={{ position: "relative" }}>
              <button
                onClick={onCopyClick}
                style={{ background: "transparent", color: "#64748B", border: "none", fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                Copier vers…
              </button>
              {copyOpen && <CopyPopover sourceDay={sourceDay} onConfirm={onCopyConfirm} onClose={onCopyClick} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyPopover({
  sourceDay,
  onConfirm,
  onClose,
}: {
  sourceDay: number;
  onConfirm: (targetDays: number[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const candidates = useMemo(
    () => DAYS.filter((d) => d.val !== sourceDay),
    [sourceDay],
  );
  const toggle = (val: number) => {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(val)) n.delete(val);
      else n.add(val);
      return n;
    });
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 250 }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 251,
          width: 220,
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 8,
          boxShadow: "0 12px 28px rgba(15,23,42,0.18)",
          padding: 10,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
          Appliquer à
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {candidates.map((d) => (
            <label
              key={d.val}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#0F172A", cursor: "pointer", padding: "3px 4px" }}
            >
              <input
                type="checkbox"
                checked={picked.has(d.val)}
                onChange={() => toggle(d.val)}
                style={{ accentColor: "#0052D9" }}
              />
              {d.short}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "5px 10px", background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            Annuler
          </button>
          <button
            disabled={picked.size === 0}
            onClick={() => onConfirm([...picked])}
            style={{ padding: "5px 10px", background: picked.size > 0 ? "#0052D9" : "#CBD5E1", color: "#fff", border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 500, cursor: picked.size > 0 ? "pointer" : "default", fontFamily: "inherit" }}
          >
            Appliquer
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Exception row ─── */

function ExceptionRow({
  ex,
  onPatch,
  onToggleClosed,
  onRemove,
}: {
  ex: BookingException;
  onPatch: (patch: Partial<BookingException>) => void;
  onToggleClosed: () => void;
  onRemove: () => void;
}) {
  const closed = ex.ranges === null;
  const ranges = ex.ranges ?? [];

  const updateRange = (idx: number, patch: Partial<BookingTimeRange>) => {
    onPatch({
      ranges: ranges.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  };
  const addRange = () => {
    onPatch({ ranges: [...ranges, { start: "09:00", end: "12:00" }] });
  };
  const removeRange = (idx: number) => {
    onPatch({ ranges: ranges.filter((_, i) => i !== idx) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, border: "1px solid #EDF1F5", borderRadius: 8, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="date"
          value={ex.date}
          onChange={(e) => onPatch({ date: e.target.value })}
          style={timeInputStyle}
        />
        <button
          onClick={onToggleClosed}
          style={{
            padding: "4px 10px",
            border: "1px solid",
            borderColor: closed ? "#EF4444" : "#E2E8F0",
            borderRadius: 6,
            background: closed ? "#FEE2E2" : "#fff",
            color: closed ? "#B91C1C" : "#475569",
            fontSize: 11,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {closed ? "Fermé" : "Ouvert"}
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={onRemove}
          title="Supprimer l'exception"
          style={{ width: 24, height: 24, border: "none", background: "transparent", borderRadius: 5, color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#EF4444"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
        </button>
      </div>
      {!closed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 4 }}>
          {ranges.map((r, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="time" value={r.start} onChange={(e) => updateRange(idx, { start: e.target.value })} style={timeInputStyle} />
              <span style={{ fontSize: 11.5, color: "#94A3B8" }}>–</span>
              <input type="time" value={r.end} onChange={(e) => updateRange(idx, { end: e.target.value })} style={timeInputStyle} />
              <button
                onClick={() => removeRange(idx)}
                style={{ width: 22, height: 22, border: "none", background: "transparent", borderRadius: 5, color: "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
          <button
            onClick={addRange}
            style={{ alignSelf: "flex-start", background: "transparent", color: "#0052D9", border: "none", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
          >
            + Ajouter une plage
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── styles ─── */

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px",
  border: "1px solid var(--cal2-border-soft)", borderRadius: 7,
  fontSize: 12.5, color: "var(--cal2-text)",
  fontFamily: "inherit", background: "var(--cal2-surface)", outline: "none",
};

const timeInputStyle: React.CSSProperties = {
  padding: "5px 8px",
  border: "1px solid var(--cal2-border-soft)", borderRadius: 6,
  fontSize: 12, color: "var(--cal2-text)",
  fontFamily: "inherit", background: "var(--cal2-surface)", outline: "none",
  fontVariantNumeric: "tabular-nums",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 7 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--cal2-text-soft)", letterSpacing: "-0.005em" }}>
          {label}
        </label>
        {hint && (
          <span style={{ fontSize: 11, color: "var(--cal2-text-faint)", lineHeight: 1.45, textWrap: "balance" }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─── Section — visual grouping with a subtle dividing rule ──────────────
 *
 * Each section gets a small uppercase label + balanced one-line caption.
 * The divider above all but the first section gives the modal a calmer
 * scan-rhythm than a flat list of fields. */

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ paddingTop: 18, marginTop: 4 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 14 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.09em",
            color: "var(--cal2-text-faint)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--cal2-text-muted)",
              lineHeight: 1.5,
              textWrap: "balance",
              maxWidth: 480,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

/* ─── NoticePicker — value + unit lead-time selector ─────────────────────
 *
 * Renders as one cohesive control: number input + unit select sharing the
 * same border so the pair reads as a single field instead of two. The
 * unit label is pluralised to match the value (1 minute / 2 minutes). */

const NOTICE_UNITS: NoticeUnit[] = ["minutes", "hours", "days", "weeks", "months"];

function NoticePicker({
  value,
  unit,
  onValueChange,
  onUnitChange,
}: {
  value: number;
  unit: NoticeUnit;
  onValueChange: (v: number) => void;
  onUnitChange: (u: NoticeUnit) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        border: "1px solid var(--cal2-border-soft)",
        borderRadius: 8,
        background: "var(--cal2-surface)",
        overflow: "hidden",
        width: "fit-content",
      }}
    >
      <input
        type="number"
        min={0}
        max={9999}
        step={1}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onValueChange(Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
        }}
        aria-label="Quantité"
        style={{
          width: 76,
          padding: "8px 11px",
          border: "none",
          background: "transparent",
          fontSize: 13,
          color: "var(--cal2-text)",
          fontFamily: "inherit",
          fontVariantNumeric: "tabular-nums",
          outline: "none",
          textAlign: "right",
        }}
      />
      <div style={{ width: 1, background: "var(--cal2-border-faint)" }} />
      <select
        value={unit}
        onChange={(e) => onUnitChange(e.target.value as NoticeUnit)}
        aria-label="Unité de temps"
        style={{
          padding: "8px 28px 8px 12px",
          border: "none",
          background:
            // Custom chevron — keeps the select chrome on-brand instead of
            // falling back to each OS's native widget.
            "var(--cal2-surface) url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\") no-repeat right 9px center",
          fontSize: 12.5,
          color: "var(--cal2-text)",
          fontFamily: "inherit",
          outline: "none",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          cursor: "pointer",
          minWidth: 110,
        }}
      >
        {NOTICE_UNITS.map((u) => (
          <option key={u} value={u}>
            {value === 1 ? UNIT_LABEL_SINGULAR[u] : UNIT_LABEL_PLURAL[u]}
          </option>
        ))}
      </select>
    </div>
  );
}
