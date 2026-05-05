"use client";

import { useEffect, useState } from "react";
import { useBookingSettings, useUpdateBookingSettings } from "./queries";

type Props = { open: boolean; onClose: () => void };

// Day order for display: Mon..Sun. Values match JS getDay() (0=Sun..6=Sat).
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

type DaySchedule = { enabled: boolean; startHour: number; endHour: number };

const DEFAULT_SCHEDULES: Record<number, DaySchedule> = {
  0: { enabled: false, startHour: 9, endHour: 18 },
  1: { enabled: true,  startHour: 9, endHour: 18 },
  2: { enabled: true,  startHour: 9, endHour: 18 },
  3: { enabled: true,  startHour: 9, endHour: 18 },
  4: { enabled: true,  startHour: 9, endHour: 18 },
  5: { enabled: true,  startHour: 9, endHour: 18 },
  6: { enabled: false, startHour: 9, endHour: 18 },
};

export function BookingModal({ open, onClose }: Props) {
  const { data: settings, isLoading } = useBookingSettings();
  const updateSettings = useUpdateBookingSettings();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [daysAhead, setDaysAhead] = useState(14);
  const [schedules, setSchedules] = useState<Record<number, DaySchedule>>(DEFAULT_SCHEDULES);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && settings) {
      setTitle(settings.title);
      setDescription(settings.description);
      setSlotMinutes(settings.availability.slotMinutes);
      setDaysAhead(settings.availability.daysAhead);
      setSchedules(settings.availability.daySchedules ?? DEFAULT_SCHEDULES);
      setSaved(false);
      setError(null);
    }
  }, [open, settings]);

  if (!open) return null;

  const updateDay = (day: number, patch: Partial<DaySchedule>) => {
    setSchedules((s) => ({ ...s, [day]: { ...s[day], ...patch } }));
  };

  const handleSave = () => {
    setError(null);
    for (const [, sched] of Object.entries(schedules)) {
      if (sched.enabled && sched.endHour <= sched.startHour) {
        setError("Pour chaque jour activé, l'heure de fin doit être après l'heure de début.");
        return;
      }
    }
    if (!Object.values(schedules).some((s) => s.enabled)) {
      setError("Activez au moins un jour.");
      return;
    }
    updateSettings.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        availability: { slotMinutes, daysAhead, daySchedules: schedules },
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
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "92%", maxWidth: 580, maxHeight: "88vh", background: "var(--cal2-surface)", borderRadius: 12, zIndex: 201, boxShadow: "0 24px 60px rgba(15,23,42,0.22)", display: "flex", flexDirection: "column", overflow: "hidden" }}
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
                <input
                  type="text" value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: RDV avec Marie Dupont"
                  style={inputStyle}
                />
              </Field>

              <Field label="Description" hint="Affichée sous le titre">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Une courte description, ce que vous proposez, votre disponibilité…"
                  style={{ ...inputStyle, minHeight: 76, resize: "vertical", fontFamily: "inherit" }}
                />
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

              {/* Per-day schedule */}
              <Field label="Disponibilités par jour" hint="Définir des heures différentes pour chaque jour">
                <div style={{ display: "flex", flexDirection: "column", gap: 6, border: "1px solid var(--cal2-border-faint)", borderRadius: 8, padding: 8, background: "var(--cal2-canvas-soft)" }}>
                  {DAYS.map((d) => {
                    const sched = schedules[d.val] ?? DEFAULT_SCHEDULES[d.val];
                    return (
                      <div key={d.val} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 4px" }}>
                        {/* Toggle */}
                        <button
                          onClick={() => updateDay(d.val, { enabled: !sched.enabled })}
                          style={{ position: "relative", width: 32, height: 18, background: sched.enabled ? "#0052D9" : "#CBD5E1", borderRadius: 999, flexShrink: 0, transition: "background 140ms", cursor: "pointer", border: "none", padding: 0 }}
                        >
                          <span style={{ position: "absolute", top: 2, left: sched.enabled ? 16 : 2, width: 14, height: 14, background: "var(--cal2-surface)", borderRadius: "50%", transition: "left 140ms" }} />
                        </button>
                        {/* Day label */}
                        <span style={{ fontSize: 12.5, color: sched.enabled ? "var(--cal2-text)" : "var(--cal2-text-faint)", fontWeight: 500, width: 84, flexShrink: 0 }}>
                          {d.short}
                        </span>
                        {/* Time inputs (visibility: hidden when disabled to avoid layout shift) */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, visibility: sched.enabled ? "visible" : "hidden" }}>
                          <input
                            type="time"
                            value={`${String(sched.startHour).padStart(2, "0")}:00`}
                            onChange={(e) => {
                              const h = Number(e.target.value.split(":")[0]);
                              if (!isNaN(h)) updateDay(d.val, { startHour: h });
                            }}
                            style={timeInputStyle}
                          />
                          <span style={{ fontSize: 11.5, color: "var(--cal2-text-faint)" }}>–</span>
                          <input
                            type="time"
                            value={`${String(sched.endHour).padStart(2, "0")}:00`}
                            onChange={(e) => {
                              const h = Number(e.target.value.split(":")[0]);
                              if (!isNaN(h)) updateDay(d.val, { endHour: h });
                            }}
                            style={timeInputStyle}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Field>

              <Field label="Fenêtre de réservation" hint="Combien de jours à l'avance">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="number" min={1} max={90} value={daysAhead}
                    onChange={(e) => setDaysAhead(Number(e.target.value))}
                    style={{ ...inputStyle, width: 90 }}
                  />
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
