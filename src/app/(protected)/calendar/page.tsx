"use client";

import "./styles.css";
import { useMemo, useState } from "react";
import { CalendarsSidebar } from "./calendars-sidebar";
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
  useCalendarEvents, useCalendarKpi, useBookingSlug,
  useGoogleCalendarEvents, useOrgMembers, useCurrentUserId,
} from "./queries";
import { toast as showToast } from "@/lib/toast";
import { useExternalCalendars } from "./external-calendars";
import { bookingPagePath, buildBookingPublicUrl } from "@/lib/booking/public-path";

type Slot = { day: number; start: number; end: number };

export default function Calendar2Page() {
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [creating, setCreating] = useState<Partial<Slot> | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [visible, setVisible] = useState<VisibilityMap>(DEFAULT_VISIBILITY);
  const [weekOffset, setWeekOffset] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [bookingOpen, setBookingOpen] = useState(false);

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const { data: andoxaEvents = [] } = useCalendarEvents(weekStart);
  const { data: gcalData } = useGoogleCalendarEvents(weekStart);
  const { data: kpi } = useCalendarKpi();
  const { data: slugData } = useBookingSlug();
  const { data: orgMembers = [] } = useOrgMembers();
  const { data: currentUserId } = useCurrentUserId();
  const externalEvents = useExternalCalendars(weekStart);
  const bookingPublicPath = slugData?.booking_public_path ?? null;

  // Merge Andoxa + Google + external (holidays / school vacances) events.
  // Each layer carries its own `owner` so the sidebar visibility map can
  // toggle them independently (visible[e.owner] !== false).
  const events = useMemo(
    () => [
      ...andoxaEvents,
      ...(gcalData?.events ?? []),
      ...externalEvents,
    ],
    [andoxaEvents, gcalData, externalEvents],
  );

  // Include org members so colleague-owned events (Calendar #4) resolve
  // to their assigned palette colour instead of the default blue fallback.
  const calendarColors = useMemo(
    () => buildCalendarColors(orgMembers),
    [orgMembers],
  );

  const toggle = (id: string) => setVisible((v) => ({ ...v, [id]: !v[id] }));

  const toggleTeamCalendars = (memberIds: string[]) => {
    if (memberIds.length === 0) return;
    const anyVisible = memberIds.some((id) => visible[id] !== false);
    setVisible((v) => {
      const next = { ...v };
      for (const id of memberIds) {
        next[id] = anyVisible ? false : true;
      }
      return next;
    });
  };

  const handleWeekChange = (delta: number) => setWeekOffset((o) => o + delta);

  const handleCreate = () => {
    setCreating(null);
    showToast.success("Événement créé avec succès");
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
          onToggleTeamAll={toggleTeamCalendars}
        />
      </div>

      {/* Right column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Calendar header */}
        <header style={{ padding: "14px 20px", background: "var(--cal2-surface)", borderBottom: "1px solid var(--cal2-border-faint)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
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
            <div style={{ flex: 1, minWidth: 0, maxWidth: 620 }}>
              <BookingLink publicPath={bookingPublicPath} onCustomize={() => setBookingOpen(true)} />
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
          orgMembers={orgMembers}
          currentUserId={currentUserId ?? null}
        />
      )}

      <CreateEventModal
        open={creating !== null || editingEvent !== null}
        prefill={creating}
        editing={editingEvent}
        onClose={() => { setCreating(null); setEditingEvent(null); }}
        onCreate={handleCreate}
        weekDays={weekDays}
      />

      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}

/* ─── Booking link strip ─── */

function BookingLink({
  publicPath,
  onCustomize,
}: {
  publicPath: string | null;
  onCustomize: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const pathSuffix = bookingPagePath(publicPath);
  const fullUrl = buildBookingPublicUrl(origin, publicPath);
  const displayUrl = pathSuffix
    ? `${origin.replace(/^https?:\/\//, "")}${pathSuffix}`
    : null;

  const handleCopy = () => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const iconBtnStyle: React.CSSProperties = {
    ...ghostBtnStyle,
    padding: "5px 7px",
    justifyContent: "center",
    flexShrink: 0,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 12px", background: "var(--cal2-surface-3)", border: "1px solid var(--cal2-border-faint)", borderRadius: 9, fontSize: 12.5, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--cal2-text)", fontWeight: 500, flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        <span>Lien de booking</span>
      </div>

      <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "var(--cal2-text-soft)", background: "var(--cal2-surface)", border: "1px solid var(--cal2-border-faint)", padding: "3px 9px", borderRadius: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
        {displayUrl ?? <span style={{ color: "var(--cal2-text-faint)" }}>Chargement…</span>}
      </code>

      <button
        onClick={handleCopy}
        style={iconBtnStyle}
        disabled={!fullUrl}
        title={copied ? "Copié !" : "Copier le lien"}
        aria-label={copied ? "Copié !" : "Copier le lien"}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      </button>

      <button
        onClick={onCustomize}
        title="Personnaliser le booking"
        aria-label="Personnaliser le booking"
        style={iconBtnStyle}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
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
