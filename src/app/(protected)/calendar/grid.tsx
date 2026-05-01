"use client";

import { useRef, useEffect, useState } from "react";
import {
  TEAM_BY_ID,
  fmtTime, fmtWeekRange, getNow,
  type CalEvent, type VisibilityMap, type WeekDay, type CalendarColorMap,
} from "./data";

const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 … 23
const GUTTER = 56;

type GridProps = {
  visible: VisibilityMap;
  onSelectEvent: (ev: CalEvent) => void;
  onCreate: (slot: { day: number; start: number; end: number }) => void;
  events: CalEvent[];
  weekDays: WeekDay[];
  weekOffset: number;
  onWeekChange: (delta: number) => void;
  calendarColors: CalendarColorMap;
};

type ViewKind = "Jour" | "Semaine" | "Mois";

export function CalendarGrid({ visible, onSelectEvent, onCreate, events, weekDays, weekOffset, onWeekChange, calendarColors }: GridProps) {
  const [view, setView] = useState<ViewKind>("Semaine");
  const weekStart = weekDays[0] ? new Date(weekDays[0].date) : new Date();
  const rangeLabel = fmtWeekRange(weekStart);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #EDF1F5", borderRadius: 10, overflow: "hidden" }}>
      <ControlBar view={view} setView={setView} rangeLabel={rangeLabel} weekOffset={weekOffset} onWeekChange={onWeekChange} />
      <div style={{ flex: 1, minHeight: 0 }}>
        {view === "Semaine" && <WeekView visible={visible} onSelectEvent={onSelectEvent} onCreate={onCreate} events={events} weekDays={weekDays} weekOffset={weekOffset} calendarColors={calendarColors} />}
        {view === "Jour"    && <DayView  visible={visible} onSelectEvent={onSelectEvent} onCreate={onCreate} events={events} weekDays={weekDays} weekOffset={weekOffset} calendarColors={calendarColors} />}
        {view === "Mois"    && <MonthView visible={visible} onSelectEvent={onSelectEvent} onSwitchView={setView} events={events} calendarColors={calendarColors} weekDays={weekDays} />}
      </div>
    </div>
  );
}

/* ─── Control bar ─── */

function ControlBar({ view, setView, rangeLabel, weekOffset, onWeekChange }: {
  view: ViewKind; setView: (v: ViewKind) => void;
  rangeLabel: string; weekOffset: number; onWeekChange: (d: number) => void;
}) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid #EDF1F5", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAFBFC", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => onWeekChange(-1)} style={navBtnStyle}><Chevron dir="left" /></button>
        <button
          onClick={() => onWeekChange(-weekOffset)}
          style={{ ...navBtnStyle, padding: "5px 12px", width: "auto", fontSize: 12, fontWeight: 500 }}
        >
          Aujourd&apos;hui
        </button>
        <button onClick={() => onWeekChange(1)} style={navBtnStyle}><Chevron dir="right" /></button>
        <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{rangeLabel}</span>
      </div>
      <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 8, padding: 2 }}>
        {(["Jour", "Semaine", "Mois"] as ViewKind[]).map((v) => (
          <button key={v} onClick={() => setView(v)} style={{ padding: "5px 13px", background: view === v ? "#fff" : "transparent", color: view === v ? "#0052D9" : "#64748B", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: view === v ? "0 1px 2px rgba(15,23,42,0.06)" : "none" }}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 28, height: 28, border: "1px solid #E2E8F0", background: "#fff", borderRadius: 7,
  color: "#475569", display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit",
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  const d = dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={d} /></svg>;
}

/* ─── Week view ─── */
// Sticky header lives INSIDE the scrollable div — eliminates scrollbar-offset misalignment.

type ViewInternalProps = {
  visible: VisibilityMap;
  onSelectEvent: (ev: CalEvent) => void;
  onCreate: (slot: { day: number; start: number; end: number }) => void;
  events: CalEvent[];
  weekDays: WeekDay[];
  weekOffset: number;
  calendarColors: CalendarColorMap;
};

function resolveEventColor(ev: CalEvent, calendarColors: CalendarColorMap) {
  // Try calendar assignment first, then fall back to owner color
  const entry = calendarColors[ev.calendarId] ?? calendarColors[ev.owner];
  if (entry) return { color: entry.color, tint: entry.tint };
  const member = TEAM_BY_ID[ev.owner] ?? TEAM_BY_ID.me;
  return { color: member?.color ?? "#0052D9", tint: member?.accent ?? "#E8F0FD" };
}

// Lay out overlapping events side-by-side. Returns each event with a column
// index and the size of the overlap group it sits in.
//
// Algorithm: greedy column packing — assign each event (sorted by start)
// to the leftmost column whose last event has finished. Then for each
// event, the displayed group size is the count of distinct columns that
// hold any event overlapping with it.
type LaidOut = { ev: CalEvent; col: number; cols: number };
function layoutDayEvents(events: CalEvent[]): LaidOut[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const colEnds: number[] = [];
  const eventCol = new Map<string, number>();
  for (const ev of sorted) {
    let placed = false;
    for (let i = 0; i < colEnds.length; i++) {
      if (colEnds[i] <= ev.start) {
        colEnds[i] = ev.end;
        eventCol.set(ev.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      colEnds.push(ev.end);
      eventCol.set(ev.id, colEnds.length - 1);
    }
  }
  return sorted.map((ev) => {
    const overlaps = sorted.filter((o) => o.start < ev.end && o.end > ev.start);
    const cols = new Set<number>();
    for (const o of overlaps) cols.add(eventCol.get(o.id)!);
    return { ev, col: eventCol.get(ev.id)!, cols: cols.size };
  });
}

function WeekView({ visible, onSelectEvent, onCreate, events, weekDays, weekOffset, calendarColors }: ViewInternalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = getNow();
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (now.hour - 1.5) * HOUR_HEIGHT);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nowOffset = (now.hour + now.minute / 60) * HOUR_HEIGHT;
  const cols = `${GUTTER}px repeat(7, 1fr)`;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {/* Sticky day-header row — same grid template as body, no scrollbar offset */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, display: "grid", gridTemplateColumns: cols, background: "#fff", borderBottom: "1px solid #EDF1F5" }}>
          <div style={{ height: 52 }} />
          {weekDays.map((d, i) => (
            <div key={i} style={{ padding: "10px 8px 12px", textAlign: "center", borderLeft: "1px solid #F1F5F9", background: d.weekend ? "#F1F5F9" : "#fff" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: d.isToday ? "#0052D9" : "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>{d.short}</div>
              {d.isToday ? (
                <div style={{ width: 28, height: 28, margin: "0 auto", borderRadius: "50%", background: "#0052D9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500 }}>{d.num}</div>
              ) : (
                <div style={{ fontSize: 16, color: d.weekend ? "#94A3B8" : "#475569", lineHeight: "28px" }}>{d.num}</div>
              )}
            </div>
          ))}
        </div>

        {/* Body — same grid template */}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: cols, minHeight: HOURS.length * HOUR_HEIGHT }}>
          {/* Hour gutter */}
          <div style={{ position: "relative" }}>
            {HOURS.map((h, i) => (
              <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: "1px solid #F1F5F9", paddingRight: 8, paddingTop: 4, textAlign: "right", fontSize: 10, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>
                {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
            {weekOffset === 0 && <NowBadge top={nowOffset} now={now} />}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dIdx) => {
            const dayEvents = events.filter((e) => e.day === dIdx && visible[e.owner] !== false);
            const laidOut = layoutDayEvents(dayEvents);
            return (
              <div key={dIdx} style={{ position: "relative", borderLeft: "1px solid #F1F5F9", background: day.weekend ? "#F1F5F9" : "transparent" }}>
                {HOURS.map((h) => {
                  const isLunch = !day.weekend && (h === 12 || h === 13);
                  return (
                    <div
                      key={h}
                      onDoubleClick={() => onCreate({ day: dIdx, start: h, end: h + 1 })}
                      style={{ height: HOUR_HEIGHT, borderBottom: "1px solid #F1F5F9", position: "relative", background: isLunch ? "rgba(241,245,249,0.5)" : "transparent", cursor: "pointer" }}
                    >
                      <div style={{ position: "absolute", top: HOUR_HEIGHT / 2, left: 0, right: 0, borderTop: "1px dashed #F8FAFC" }} />
                    </div>
                  );
                })}
                {laidOut.map((l) => <EventCard key={l.ev.id} ev={l.ev} onClick={onSelectEvent} calendarColors={calendarColors} col={l.col} cols={l.cols} />)}
                {day.isToday && weekOffset === 0 && <div style={{ position: "absolute", top: nowOffset, left: 0, right: 0, height: 1, background: "#EF4444", pointerEvents: "none", zIndex: 5 }} />}
              </div>
            );
          })}
        </div>
      </div>
      <GridFooter />
    </div>
  );
}

/* ─── Now badge ─── */

// zIndex < 10 so the sticky day-header always covers the badge/line when scrolled.
function NowBadge({ top, now }: { top: number; now: { hour: number; minute: number } }) {
  return (
    <div style={{ position: "absolute", top, right: 0, transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 4, pointerEvents: "none", zIndex: 5 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", background: "#EF4444", padding: "1px 5px", borderRadius: 3, fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>
        {fmtTime(now.hour + now.minute / 60)}
      </span>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 0 2px rgba(239,68,68,0.2)", marginRight: -4 }} />
    </div>
  );
}

/* ─── Event card (week view) ─── */

function EventCard({ ev, onClick, calendarColors, col, cols }: { ev: CalEvent; onClick: (ev: CalEvent) => void; calendarColors: CalendarColorMap; col: number; cols: number }) {
  const member = TEAM_BY_ID[ev.owner] ?? TEAM_BY_ID.me;
  const typeTok = resolveEventColor(ev, calendarColors);
  const top = ev.start * HOUR_HEIGHT;
  const height = (ev.end - ev.start) * HOUR_HEIGHT;
  const oneLine = (ev.end - ev.start) <= 0.5;

  // Side-by-side layout — each col gets 1/cols of the available width.
  // Padding 4px on each side of the day column.
  const widthPct = 100 / cols;
  const leftPct = col * widthPct;

  return (
    <div
      onClick={() => onClick(ev)}
      style={{
        position: "absolute",
        top: top + 1,
        left: `calc(${leftPct}% + 4px)`,
        width: `calc(${widthPct}% - ${cols > 1 ? 6 : 8}px)`,
        height: height - 2,
        background: typeTok.tint,
        borderRadius: 6,
        borderLeft: `3px solid ${typeTok.color}`,
        // Subtle outline to distinguish stacked same-color events
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6), 0 0 0 1px rgba(15,23,42,0.04)",
        padding: oneLine ? "0 6px" : "5px 8px",
        cursor: "pointer",
        overflow: "hidden",
        transition: "box-shadow 140ms",
        zIndex: 2,
        display: "flex",
        flexDirection: oneLine ? "row" : "column",
        alignItems: oneLine ? "center" : "stretch",
        gap: oneLine ? 5 : 2,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.06)"; e.currentTarget.style.zIndex = "20"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.6), 0 0 0 1px rgba(15,23,42,0.04)"; e.currentTarget.style.zIndex = "2"; }}
    >
      {oneLine ? (
        <>
          <span style={{ fontSize: 9.5, color: "#94A3B8", fontVariantNumeric: "tabular-nums", flexShrink: 0, fontWeight: 500 }}>{fmtTime(ev.start)}</span>
          {member && <span style={{ width: 14, height: 14, borderRadius: "50%", background: member.accent, color: member.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{member.initials}</span>}
          <span style={{ fontSize: 11, fontWeight: 500, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{ev.title}</span>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {member && <span style={{ width: 16, height: 16, borderRadius: "50%", background: member.accent, color: member.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, flexShrink: 0 }}>{member.initials}</span>}
            <span style={{ fontSize: 11.5, fontWeight: 500, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{ev.title}</span>
            {ev.type && <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "#fff", color: typeTok.color, flexShrink: 0, display: "none" }}>{ev.type}</span>}
          </div>
          <div style={{ fontSize: 10.5, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fmtTime(ev.start)} – {fmtTime(ev.end)}{ev.company ? ` · ${ev.company}` : ""}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Day view ─── */

function DayView({ visible, onSelectEvent, onCreate, events, weekDays, weekOffset, calendarColors }: ViewInternalProps) {
  const now = getNow();
  const dayIdx = weekOffset === 0 ? now.dayIdx : 0;
  const day = weekDays[dayIdx] ?? weekDays[0];
  const dayEvents = events.filter((e) => e.day === dayIdx && visible[e.owner] !== false);
  const laidOut = layoutDayEvents(dayEvents);
  const nowOffset = (now.hour + now.minute / 60) * HOUR_HEIGHT;
  const cols = `${GUTTER}px 1fr`;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {day && (
        <div style={{ flexShrink: 0, display: "grid", gridTemplateColumns: cols, borderBottom: "1px solid #EDF1F5" }}>
          <div />
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#0052D9", letterSpacing: "0.08em", textTransform: "uppercase" }}>{day.long}</span>
            <span style={{ fontSize: 14, color: "#0F172A", fontWeight: 500 }}>{day.num} {day.monthFull} {new Date(day.date).getFullYear()}</span>
            <span style={{ fontSize: 11.5, color: "#94A3B8", marginLeft: 8 }}>{dayEvents.length} événement{dayEvents.length > 1 ? "s" : ""}</span>
          </div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: cols, minHeight: HOURS.length * HOUR_HEIGHT }}>
          <div style={{ position: "relative" }}>
            {HOURS.map((h, i) => (
              <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: "1px solid #F1F5F9", paddingRight: 8, paddingTop: 4, textAlign: "right", fontSize: 10, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>
                {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
            {weekOffset === 0 && <NowBadge top={nowOffset} now={now} />}
          </div>
          <div style={{ position: "relative", borderLeft: "1px solid #F1F5F9" }}>
            {HOURS.map((h) => {
              const isLunch = h === 12 || h === 13;
              return (
                <div key={h} onDoubleClick={() => onCreate({ day: dayIdx, start: h, end: h + 1 })} style={{ height: HOUR_HEIGHT, borderBottom: "1px solid #F1F5F9", background: isLunch ? "rgba(241,245,249,0.5)" : "transparent", cursor: "pointer" }}>
                  <div style={{ position: "absolute", borderTop: "1px dashed #F8FAFC", left: 0, right: 0, marginTop: HOUR_HEIGHT / 2 }} />
                </div>
              );
            })}
            {laidOut.map((l) => <DayEventCard key={l.ev.id} ev={l.ev} onClick={onSelectEvent} calendarColors={calendarColors} col={l.col} cols={l.cols} />)}
            {weekOffset === 0 && <div style={{ position: "absolute", top: nowOffset, left: 0, right: 0, height: 1, background: "#EF4444", pointerEvents: "none", zIndex: 5 }} />}
          </div>
        </div>
      </div>
      <GridFooter />
    </div>
  );
}

function DayEventCard({ ev, onClick, calendarColors, col, cols }: { ev: CalEvent; onClick: (ev: CalEvent) => void; calendarColors: CalendarColorMap; col: number; cols: number }) {
  const member = TEAM_BY_ID[ev.owner] ?? TEAM_BY_ID.me;
  const typeTok = resolveEventColor(ev, calendarColors);
  const top = ev.start * HOUR_HEIGHT;
  const height = (ev.end - ev.start) * HOUR_HEIGHT;
  const widthPct = 100 / cols;
  const leftPct = col * widthPct;

  return (
    <div
      onClick={() => onClick(ev)}
      style={{
        position: "absolute",
        top: top + 1,
        left: `calc(${leftPct}% + 6px)`,
        width: `calc(${widthPct}% - ${cols > 1 ? 8 : 12}px)`,
        height: height - 2,
        background: typeTok.tint,
        borderRadius: 7,
        borderLeft: `3px solid ${typeTok.color}`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6), 0 0 0 1px rgba(15,23,42,0.04)",
        padding: "8px 12px",
        cursor: "pointer",
        overflow: "hidden",
        zIndex: 2,
        transition: "box-shadow 140ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.6), 0 0 0 1px rgba(15,23,42,0.04)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        {member && <span style={{ width: 18, height: 18, borderRadius: "50%", background: member.accent, color: member.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{member.initials}</span>}
        <span style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{ev.title}</span>
        {ev.type && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "#fff", color: typeTok.color, display: "none" }}>{ev.type}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: "#64748B", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtTime(ev.start)} – {fmtTime(ev.end)}</span>
        {ev.company && <><span style={{ color: "#CBD5E1" }}>·</span><span>{ev.company}</span></>}
      </div>
    </div>
  );
}

/* ─── Month view ─── */

function MonthView({ visible, onSelectEvent, onSwitchView, events, calendarColors, weekDays }: {
  visible: VisibilityMap; onSelectEvent: (ev: CalEvent) => void; onSwitchView: (v: ViewKind) => void; events: CalEvent[]; calendarColors: CalendarColorMap; weekDays: WeekDay[];
}) {
  // Anchor the month on the middle of the visible week (Wednesday-ish), so
  // navigating week-by-week keeps the user's context inside the right month.
  const anchor = weekDays[3] ? new Date(weekDays[3].date) : new Date();
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const dim = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const firstMon = firstDow === 0 ? 6 : firstDow - 1; // shift to Mon=0

  const cells: { num: number; muted?: boolean; date: string; isToday: boolean }[] = [];
  // Leading days from previous month
  const prevDim = new Date(year, month, 0).getDate();
  const prevMonthY = month === 0 ? year - 1 : year;
  const prevMonthM = month === 0 ? 11 : month - 1;
  for (let i = 0; i < firstMon; i++) {
    const dayNum = prevDim - firstMon + 1 + i;
    const dateISO = `${prevMonthY}-${String(prevMonthM + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    cells.push({ num: dayNum, muted: true, date: dateISO, isToday: dateISO === todayISO });
  }
  // Current month
  for (let d = 1; d <= dim; d++) {
    const dateISO = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ num: d, date: dateISO, isToday: dateISO === todayISO });
  }
  // Trailing days
  const nextMonthY = month === 11 ? year + 1 : year;
  const nextMonthM = month === 11 ? 0 : month + 1;
  let trailNum = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const dateISO = `${nextMonthY}-${String(nextMonthM + 1).padStart(2, "0")}-${String(trailNum).padStart(2, "0")}`;
    cells.push({ num: trailNum, muted: true, date: dateISO, isToday: dateISO === todayISO });
    trailNum++;
  }

  const rows = cells.length / 7;
  const dayLabels = ["LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM.", "DIM."];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #EDF1F5", background: "#fff", flexShrink: 0 }}>
        {dayLabels.map((d, i) => (
          <div key={i} style={{ padding: "10px 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#94A3B8", textTransform: "uppercase", background: i >= 5 ? "#F1F5F9" : "#fff", borderLeft: i === 0 ? "none" : "1px solid #F1F5F9", textAlign: "center" }}>{d}</div>
        ))}
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        flex: 1,
        minHeight: 0,
      }}>
        {cells.map((c, i) => {
          const dow = i % 7; const isWeekend = dow >= 5;
          // Filter by actual ISO date — fixes the "+24 autres" bug
          const evs = events.filter((e) => e.dateISO === c.date && visible[e.owner] !== false);
          return (
            <div
              key={i}
              onClick={() => evs.length === 0 && onSwitchView("Jour")}
              style={{
                borderLeft: dow === 0 ? "none" : "1px solid #F1F5F9",
                borderTop: "1px solid #F1F5F9",
                padding: 6,
                background: isWeekend && !c.muted ? "#F8FAFC" : c.muted ? "#FAFBFC" : "#fff",
                cursor: "pointer",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 4, flexShrink: 0 }}>
                {c.isToday ? <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#0052D9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 600 }}>{c.num}</span>
                : <span style={{ fontSize: 12, color: c.muted ? "#CBD5E1" : "#64748B", fontWeight: 500 }}>{c.num}</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minHeight: 0, overflow: "hidden" }}>
                {evs.slice(0, 3).map((ev) => {
                  const typeTok = resolveEventColor(ev, calendarColors);
                  return (
                    <div key={ev.id} onClick={(e) => { e.stopPropagation(); onSelectEvent(ev); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 5px", borderRadius: 4, background: typeTok.tint, borderLeft: `2px solid ${typeTok.color}`, fontSize: 10.5, color: "#0F172A", overflow: "hidden", flexShrink: 0 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{ev.title}</span>
                    </div>
                  );
                })}
                {evs.length > 3 && <div style={{ fontSize: 10, color: "#0052D9", fontWeight: 500, padding: "0 5px", flexShrink: 0 }}>+{evs.length - 3} autres</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Footer ─── */

function GridFooter() {
  const [ttVisible, setTtVisible] = useState(false);
  return (
    <div style={{ padding: "8px 14px", borderTop: "1px solid #EDF1F5", background: "#FAFBFC", display: "flex", alignItems: "center", justifyContent: "flex-end", flexShrink: 0 }}>
      <div style={{ position: "relative" }} onMouseEnter={() => setTtVisible(true)} onMouseLeave={() => setTtVisible(false)}>
        <button style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid #E2E8F0", background: "#fff", color: "#94A3B8", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", cursor: "help" }}>?</button>
        {ttVisible && (
          <div style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, background: "#0F172A", color: "#fff", padding: "8px 11px", borderRadius: 6, fontSize: 11, lineHeight: 1.5, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(15,23,42,0.2)", zIndex: 50 }}>
            <div>Double-cliquez · créer un événement</div>
            <div>Cliquer · modifier</div>
          </div>
        )}
      </div>
    </div>
  );
}
