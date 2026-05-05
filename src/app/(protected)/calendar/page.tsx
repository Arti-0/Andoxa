"use client";

import "./styles.css";
import { useMemo, useState } from "react";
import { CalendarsSidebar, type CustomCal } from "./calendars-sidebar";
import { CalendarGrid } from "./grid";
import { EventPanel } from "./event-panel";
import { CreateEventModal } from "./create-modal";
import { BookingModal } from "./booking-modal";
import {
  DEFAULT_VISIBILITY,
  getWeekStart, getWeekDays,
  buildCalendarColors,
  type CalEvent, type VisibilityMap,
} from "./data";
import {
  useCalendarEvents, useCalendarKpi, useBookingSlug, useGoogleCalendarEvents,
} from "./queries";

type Slot = { day: number; start: number; end: number };

function loadCustomCals(): CustomCal[] {
  try { return JSON.parse(localStorage.getItem("cal2_custom_cals") ?? "[]") as CustomCal[]; }
  catch { return []; }
}

function saveCustomCals(cals: CustomCal[]) {
  try { localStorage.setItem("cal2_custom_cals", JSON.stringify(cals)); } catch {}
}

export default function Calendar2Page() {
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [creating, setCreating] = useState<Partial<Slot> | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [visible, setVisible] = useState<VisibilityMap>(DEFAULT_VISIBILITY);
  const [weekOffset, setWeekOffset] = useState(0);
  const [customCals, setCustomCals] = useState<CustomCal[]>(() =>
    typeof window !== "undefined" ? loadCustomCals() : [],
  );
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [bookingOpen, setBookingOpen] = useState(false);

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const { data: andoxaEvents = [] } = useCalendarEvents(weekStart);
  const { data: gcalData } = useGoogleCalendarEvents(weekStart);
  const { data: kpi } = useCalendarKpi();
  const { data: slugData } = useBookingSlug();
  const bookingSlug = slugData?.booking_slug ?? null;

  // Merge Andoxa + Google events. GCal events get owner/calendarId="gcal"
  // and respect visible.gcal automatically (visible[e.owner] !== false).
  const events = useMemo(
    () => [...andoxaEvents, ...(gcalData?.events ?? [])],
    [andoxaEvents, gcalData],
  );

  const calendarColors = useMemo(
    () => buildCalendarColors(customCals),
    [customCals],
  );

  const toggle = (id: string) => setVisible((v) => ({ ...v, [id]: !v[id] }));
  const handleWeekChange = (delta: number) => setWeekOffset((o) => o + delta);

  const handleCustomCalsChange = (next: CustomCal[]) => {
    setCustomCals(next);
    saveCustomCals(next);
  };

  const handleCreate = () => {
    setCreating(null);
    setToast("Événement créé avec succès");
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="cal2-root" style={{ height: "100%", display: "flex", overflow: "hidden", background: "var(--cal2-canvas)", position: "relative" }}>

      {/* Mobile overlay (only visible when drawer is open) */}
      <div
        className={`cal2-sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Calendars sidebar — desktop static, mobile drawer */}
      <div className={`cal2-sidebar ${sidebarOpen ? "open" : ""}`}>
        <CalendarsSidebar
          visible={visible}
          onToggle={toggle}
          customCals={customCals}
          onCustomCalsChange={handleCustomCalsChange}
        />
      </div>

      {/* Right column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Calendar header */}
        <header style={{ padding: "14px 20px", background: "var(--cal2-surface)", borderBottom: "1px solid var(--cal2-border-faint)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Burger button — mobile only */}
            <button
              className="cal2-burger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le panneau des agendas"
              style={{ width: 36, height: 36, border: "1px solid var(--cal2-border-soft)", background: "var(--cal2-surface)", borderRadius: 8, color: "var(--cal2-text-soft)", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--cal2-text)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Calendrier</h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="cal2-hdr-pills" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {[
                { value: kpi ? String(kpi.weekTotal) : "—", label: "cette semaine", vc: "var(--cal2-text)" },
                { value: kpi ? String(kpi.todayTotal) : "—", label: "aujourd'hui",   vc: "#0052D9" },
              ].map((f, i) => (
                <button key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", background: "var(--cal2-canvas)", border: "1px solid transparent", borderRadius: 999, fontSize: 12, color: "var(--cal2-text-muted)", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontWeight: 600, color: f.vc, fontVariantNumeric: "tabular-nums" }}>{f.value}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setCreating({})}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", background: "#0052D9", color: "var(--cal2-surface)", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 1px 2px rgba(0,82,217,0.28)", whiteSpace: "nowrap" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1A6AFF")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#0052D9")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Créer un événement
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          <div style={{ flexShrink: 0, padding: "12px 18px 0" }}>
            <div className="cal2-booking">
              <BookingLink slug={bookingSlug} onCustomize={() => setBookingOpen(true)} />
            </div>
            <KpiCards kpi={kpi} />
          </div>

          <div style={{ flex: 1, minHeight: 0, padding: "0 18px 16px" }}>
            <CalendarGrid
              visible={visible}
              onSelectEvent={setSelectedEvent}
              onCreate={(slot) => setCreating(slot)}
              events={events}
              weekDays={weekDays}
              weekOffset={weekOffset}
              onWeekChange={handleWeekChange}
              calendarColors={calendarColors}
            />
          </div>
        </div>
      </div>

      {selectedEvent && (
        <EventPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={(ev) => { setSelectedEvent(null); setEditingEvent(ev); }}
          weekDays={weekDays}
          calendarColors={calendarColors}
        />
      )}

      <CreateEventModal
        open={creating !== null || editingEvent !== null}
        prefill={creating}
        editing={editingEvent}
        onClose={() => { setCreating(null); setEditingEvent(null); }}
        onCreate={handleCreate}
        weekDays={weekDays}
        customCals={customCals}
      />

      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />

      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: "var(--cal2-text)", color: "var(--cal2-surface)", padding: "10px 16px", borderRadius: 9, fontSize: 12.5, zIndex: 300, boxShadow: "0 6px 20px rgba(15,23,42,0.25)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ─── Booking link strip ─── */

function BookingLink({ slug, onCustomize }: { slug: string | null; onCustomize: () => void }) {
  const [copied, setCopied] = useState(false);
  // Build absolute URL from the current origin so localhost dev → localhost link,
  // andoxa.fr → andoxa.fr/booking/{slug}.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = slug ? `${origin}/booking/${slug}` : null;
  const display = slug ? `${origin.replace(/^https?:\/\//, "")}/booking/${slug}` : null;

  const handleCopy = () => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", background: "var(--cal2-surface-3)", border: "1px solid var(--cal2-border-faint)", borderRadius: 9, fontSize: 12.5, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--cal2-text)", fontWeight: 500, flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        <span>Lien de booking</span>
      </div>
      <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "var(--cal2-text-soft)", background: "var(--cal2-surface)", border: "1px solid var(--cal2-border-faint)", padding: "3px 9px", borderRadius: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0, maxWidth: 340 }}>
        {display ?? <span style={{ color: "var(--cal2-text-faint)" }}>Chargement…</span>}
      </code>
      <button onClick={handleCopy} style={ghostBtnStyle} disabled={!fullUrl}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
        {copied ? "Copié !" : "Copier"}
      </button>
      <button
        onClick={onCustomize}
        style={{ padding: "5px 10px", background: "var(--cal2-surface)", color: "var(--cal2-text-soft)", border: "1px solid var(--cal2-border-soft)", borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0052D9"; e.currentTarget.style.color = "#0052D9"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--cal2-border-soft)"; e.currentTarget.style.color = "var(--cal2-text-soft)"; }}
      >
        Personnaliser
      </button>
    </div>
  );
}

const ghostBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 9px",
  background: "transparent", color: "var(--cal2-text-muted)", border: "none", borderRadius: 6,
  fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};

/* ─── KPI cards ─── */

interface KpiProps {
  kpi?: {
    todayTotal: number; todayDone: number;
    weekTotal: number; weekDone: number;
    thirtyDayDone: number; prevThirtyDayDone: number;
  };
}

function KpiCards({ kpi }: KpiProps) {
  const weekRealisationRate = kpi && kpi.weekTotal > 0
    ? Math.round((kpi.weekDone / kpi.weekTotal) * 100)
    : null;

  const thirtyDayGrowth = kpi && kpi.prevThirtyDayDone > 0
    ? Math.round(((kpi.thirtyDayDone - kpi.prevThirtyDayDone) / kpi.prevThirtyDayDone) * 100)
    : null;

  const cards = [
    {
      label: "Aujourd'hui",
      value: kpi ? String(kpi.todayTotal) : "—",
      sub: "RDV programmés",
      detail: kpi ? `${kpi.todayDone} réalisés · ${kpi.todayTotal - kpi.todayDone} à venir` : "Chargement…",
      detailColor: "#0052D9",
    },
    {
      label: "Cette semaine",
      value: kpi ? String(kpi.weekTotal) : "—",
      sub: "RDV programmés",
      detail: weekRealisationRate !== null ? `${weekRealisationRate}% de taux de réalisation` : kpi ? "Aucun RDV" : "Chargement…",
      detailColor: "#10B981",
    },
    {
      label: "Performance 30 jours",
      value: kpi ? String(kpi.thirtyDayDone) : "—",
      sub: "RDV honorés",
      detail: thirtyDayGrowth !== null
        ? `${thirtyDayGrowth > 0 ? "+" : ""}${thirtyDayGrowth}% vs. mois précédent`
        : kpi ? "Pas de données comparatives" : "Chargement…",
      detailColor: thirtyDayGrowth !== null && thirtyDayGrowth >= 0 ? "#10B981" : "#DC2626",
    },
  ];

  return (
    <div className="cal2-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
      {cards.map((c, i) => (
        <div key={i} style={{ background: "var(--cal2-surface)", border: "1px solid var(--cal2-border-faint)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--cal2-text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{c.label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span style={{ fontSize: 26, fontWeight: 500, color: "var(--cal2-text)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{c.value}</span>
            <span style={{ fontSize: 12, color: "var(--cal2-text-muted)" }}>{c.sub}</span>
          </div>
          <div style={{ fontSize: 11.5, color: c.detailColor, marginTop: 7, fontWeight: 500 }}>{c.detail}</div>
        </div>
      ))}
    </div>
  );
}
