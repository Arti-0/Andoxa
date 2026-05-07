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
  const [daysAhead, setDaysAhead] = useState(14);
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

    updateSettings.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        availability: { slotMinutes, daysAhead, daySchedules: schedules, exceptions },
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

        <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--cal2-border-faint)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--cal2-text)", letterSpacing: "-0.01em" }}>Personnaliser la page de booking</h2>
            <div style={{ fontSize: 11.5, color: "var(--cal2-text-muted)", marginTop: 2 }}>Visible aux personnes qui réservent un RDV avec vous</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid var(--cal2-border-soft)", background: "var(--cal2-surface)", borderRadius: 7, color: "var(--cal2-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
          {isLoading ? (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "var(--cal2-text-faint)" }}>Chargement…</div>
          ) : (
            <>
              <Field label="Titre de la page">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: RDV avec Marie Dupont" style={inputStyle} />
              </Field>

              <Field label="Description" hint="Affichée sous le titre">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Une courte description, ce que vous proposez, votre disponibilité…" style={{ ...inputStyle, minHeight: 76, resize: "vertical", fontFamily: "inherit" }} />
              </Field>

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
                label="Disponibilités hebdomadaires"
                hint="Plusieurs plages possibles par jour"
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
                label="Exceptions à des dates spécifiques"
                hint="Surcharge la disponibilité d'un jour précis (vacances, jour férié, créneau exceptionnel)"
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {exceptions.length === 0 ? (
                    <div style={{ padding: "10px 12px", border: "1px dashed #E2E8F0", borderRadius: 7, fontSize: 12, color: "#94A3B8" }}>
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
                    style={{ alignSelf: "flex-start", padding: "6px 12px", background: "#fff", color: "#0052D9", border: "1px dashed #CBD5E1", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0052D9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Ajouter une exception
                  </button>
                </div>
              </Field>

              <Field label="Fenêtre de réservation" hint="Combien de jours à l'avance">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="number" min={1} max={90} value={daysAhead} onChange={(e) => setDaysAhead(Number(e.target.value))} style={{ ...inputStyle, width: 90 }} />
                  <span style={{ fontSize: 12.5, color: "var(--cal2-text-muted)" }}>jours</span>
                </div>
              </Field>

              {error && (
                <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7, fontSize: 12.5, color: "#B91C1C" }}>
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
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <label style={{ fontSize: 11.5, fontWeight: 500, color: "var(--cal2-text-soft)" }}>{label}</label>
        {hint && <span style={{ fontSize: 10.5, color: "var(--cal2-text-faint)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
