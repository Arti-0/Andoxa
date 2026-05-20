// Andoxa Calendrier — Grid (Day / Week / Month) with aligned headers + create modal trigger

const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START);
const GUTTER = 56;

function CalendarGrid({ visible, onSelectEvent, onCreate }) {
  const [view, setView] = React.useState('Semaine');
  return (
    <div style={{ background: '#fff', border: '1px solid #EDF1F5', borderRadius: 10, overflow: 'hidden', marginTop: 4 }}>
      <ControlBar view={view} setView={setView} />
      {view === 'Semaine' && <WeekView visible={visible} onSelectEvent={onSelectEvent} onCreate={onCreate}/>}
      {view === 'Jour'    && <DayView  visible={visible} onSelectEvent={onSelectEvent} onCreate={onCreate}/>}
      {view === 'Mois'    && <MonthView visible={visible} onSelectEvent={onSelectEvent} onSwitchView={setView}/>}
    </div>
  );
}

function ControlBar({ view, setView }) {
  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid #EDF1F5',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#FAFBFC',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={navBtn}><Chevron dir="left"/></button>
        <button style={{ ...navBtn, padding: '5px 12px', width: 'auto', fontSize: 12, fontWeight: 500 }}>Aujourd'hui</button>
        <button style={navBtn}><Chevron dir="right"/></button>
        <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, color: '#0F172A' }}>
          27 avril – 3 mai 2026
        </span>
      </div>
      <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 2 }}>
        {['Jour', 'Semaine', 'Mois'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '5px 13px',
            background: view === v ? '#fff' : 'transparent',
            color: view === v ? '#0052D9' : '#64748B',
            border: 'none', borderRadius: 6,
            fontSize: 12, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: view === v ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
          }}>{v}</button>
        ))}
      </div>
    </div>
  );
}

const navBtn = {
  width: 28, height: 28, border: '1px solid #E2E8F0',
  background: '#fff', borderRadius: 7, color: '#475569',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', fontFamily: 'inherit',
};
function Chevron({ dir }) {
  const d = dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6';
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={d}/></svg>;
}

/* =================== WEEK VIEW =================== */

function WeekView({ visible, onSelectEvent, onCreate }) {
  const gridRef = React.useRef(null);
  React.useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = Math.max(0, (NOW.hour - HOUR_START - 1.5) * HOUR_HEIGHT);
  }, []);
  const nowOffset = ((NOW.hour - HOUR_START) + NOW.minute/60) * HOUR_HEIGHT;

  // Single grid: column-template '56px repeat(7,1fr)' shared by header AND body for perfect alignment
  const cols = `${GUTTER}px repeat(7, 1fr)`;

  return (
    <div>
      {/* Continuous container so weekend tint runs from header through grid */}
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: cols }}>
        {/* === Header row === */}
        <div></div>
        {WEEK_DAYS.map((d, i) => (
          <div key={i} style={{
            padding: '10px 8px 12px',
            textAlign: 'center',
            borderLeft: '1px solid #F1F5F9',
            background: d.weekend ? '#F1F5F9' : '#fff',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: d.isToday ? '#0052D9' : '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>{d.short}</div>
            {d.isToday ? (
              <div style={{ width: 28, height: 28, margin: '0 auto', borderRadius: '50%', background: '#0052D9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500 }}>{d.num}</div>
            ) : (
              <div style={{ fontSize: 16, color: d.weekend ? '#94A3B8' : '#475569', lineHeight: '28px' }}>{d.num}</div>
            )}
          </div>
        ))}
      </div>

      {/* === Scrollable body, same column template === */}
      <div ref={gridRef} style={{ height: 540, overflowY: 'auto', borderTop: '1px solid #EDF1F5' }}>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: cols, minHeight: HOURS.length * HOUR_HEIGHT }}>
          {/* Hour gutter */}
          <div style={{ position: 'relative' }}>
            {HOURS.map((h, i) => (
              <div key={h} style={{
                height: HOUR_HEIGHT,
                borderBottom: '1px solid #F1F5F9',
                paddingRight: 8, paddingTop: 4,
                textAlign: 'right',
                fontSize: 10, color: '#94A3B8',
                fontVariantNumeric: 'tabular-nums',
              }}>{i === 0 ? '' : `${h} h`}</div>
            ))}
            <NowBadge top={nowOffset} />
          </div>

          {/* Day columns */}
          {WEEK_DAYS.map((day, dIdx) => {
            const dayEvents = EVENTS.filter(e => e.day === dIdx && visible[e.owner]);
            return (
              <div key={dIdx} style={{
                position: 'relative',
                borderLeft: '1px solid #F1F5F9',
                background: day.weekend ? '#F1F5F9' : 'transparent',
              }}>
                {HOURS.map((h, i) => {
                  const isLunch = !day.weekend && (h === 12 || h === 13);
                  return (
                    <div key={h} className="cal-cell" onDoubleClick={() => onCreate({ day: dIdx, start: h, end: h + 1 })} style={{
                      height: HOUR_HEIGHT,
                      borderBottom: '1px solid #F1F5F9',
                      position: 'relative',
                      background: isLunch ? 'rgba(241, 245, 249, 0.5)' : 'transparent',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={e => { const h = e.currentTarget.querySelector('.create-hint'); if (h) h.style.opacity = '1'; }}
                      onMouseLeave={e => { const h = e.currentTarget.querySelector('.create-hint'); if (h) h.style.opacity = '0'; }}>
                      <div style={{ position: 'absolute', top: HOUR_HEIGHT/2, left: 0, right: 0, borderTop: '1px dashed #F8FAFC' }}></div>
                      <div className="create-hint" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#94A3B8', opacity: 0, transition: 'opacity 120ms', pointerEvents: 'none' }}>+ Créer</div>
                    </div>
                  );
                })}

                {dayEvents.map(ev => <EventCard key={ev.id} ev={ev} onClick={onSelectEvent} />)}

                {day.isToday && (
                  <div style={{ position: 'absolute', top: nowOffset, left: 0, right: 0, height: 1, background: '#EF4444', pointerEvents: 'none', zIndex: 15 }}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Footer/>
    </div>
  );
}

function NowBadge({ top }) {
  return (
    <div style={{
      position: 'absolute', top, right: 0, transform: 'translateY(-50%)',
      display: 'flex', alignItems: 'center', gap: 4,
      pointerEvents: 'none', zIndex: 16,
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: '#EF4444', padding: '1px 5px', borderRadius: 3, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
        {fmtTime(NOW.hour + NOW.minute/60)}
      </span>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)', marginRight: -4 }}></span>
    </div>
  );
}

/* =================== EVENT CARD =================== */

function EventCard({ ev, onClick }) {
  const member = TEAM_BY_ID[ev.owner] || TEAM_BY_ID.me;
  const typeTok = ev.type ? TYPES[ev.type] : { color: member.color, tint: member.accent };
  const top = (ev.start - HOUR_START) * HOUR_HEIGHT;
  const height = (ev.end - ev.start) * HOUR_HEIGHT;
  const oneLine = (ev.end - ev.start) <= 0.5;

  return (
    <div onClick={() => onClick(ev)} style={{
      position: 'absolute', top: top + 1, left: 4, right: 4,
      height: height - 2,
      background: typeTok.tint,
      borderRadius: 6,
      borderLeft: `3px solid ${typeTok.color}`,
      padding: oneLine ? '0 6px' : '5px 8px',
      cursor: 'pointer', overflow: 'hidden',
      transition: 'all 140ms',
      zIndex: 2,
      display: 'flex',
      flexDirection: oneLine ? 'row' : 'column',
      alignItems: oneLine ? 'center' : 'stretch',
      gap: oneLine ? 5 : 2,
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,23,42,0.1)';
        e.currentTarget.style.transform = 'translateY(-0.5px)';
        e.currentTarget.style.zIndex = '20';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.zIndex = '2';
      }}>
      {oneLine ? (
        <>
          <span style={{ fontSize: 9.5, color: '#94A3B8', fontVariantNumeric: 'tabular-nums', flexShrink: 0, fontWeight: 500 }}>{fmtTime(ev.start)}</span>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: member.accent, color: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{member.initials}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{ev.title}</span>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: member.accent, color: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 700, flexShrink: 0 }}>{member.initials}</span>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{ev.title}</span>
            {ev.type && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#fff', color: typeTok.color, flexShrink: 0 }}>{ev.type}</span>}
          </div>
          <div style={{ fontSize: 10.5, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fmtTime(ev.start)} – {fmtTime(ev.end)}{ev.company ? ` · ${ev.company}` : ''}
          </div>
        </>
      )}
    </div>
  );
}

/* =================== DAY VIEW =================== */

function DayView({ visible, onSelectEvent, onCreate }) {
  const dayIdx = NOW.dayIdx;
  const day = WEEK_DAYS[dayIdx];
  const events = EVENTS.filter(e => e.day === dayIdx && visible[e.owner]);
  const nowOffset = ((NOW.hour - HOUR_START) + NOW.minute/60) * HOUR_HEIGHT;
  const cols = `${GUTTER}px 1fr`;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, borderBottom: '1px solid #EDF1F5' }}>
        <div></div>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#0052D9', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{day.long}</span>
          <span style={{ fontSize: 14, color: '#0F172A', fontWeight: 500 }}>{day.num} {day.month} 2026</span>
          <span style={{ fontSize: 11.5, color: '#94A3B8', marginLeft: 8 }}>{events.length} événement{events.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div style={{ height: 600, overflowY: 'auto' }}>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: cols, minHeight: HOURS.length * HOUR_HEIGHT }}>
          <div style={{ position: 'relative' }}>
            {HOURS.map((h, i) => (
              <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: '1px solid #F1F5F9', paddingRight: 8, paddingTop: 4, textAlign: 'right', fontSize: 10, color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>{i === 0 ? '' : `${h} h`}</div>
            ))}
            <NowBadge top={nowOffset}/>
          </div>
          <div style={{ position: 'relative', borderLeft: '1px solid #F1F5F9' }}>
            {HOURS.map((h, i) => {
              const isLunch = (h === 12 || h === 13);
              return (
                <div key={h} onDoubleClick={() => onCreate({ day: dayIdx, start: h, end: h + 1 })} style={{
                  height: HOUR_HEIGHT, borderBottom: '1px solid #F1F5F9',
                  background: isLunch ? 'rgba(241,245,249,0.5)' : 'transparent', cursor: 'pointer',
                }}>
                  <div style={{ position: 'absolute', borderTop: '1px dashed #F8FAFC', left: 0, right: 0, marginTop: HOUR_HEIGHT/2 }}></div>
                </div>
              );
            })}
            {events.map(ev => <DayEventCard key={ev.id} ev={ev} onClick={onSelectEvent}/>)}
            <div style={{ position: 'absolute', top: nowOffset, left: 0, right: 0, height: 1, background: '#EF4444', pointerEvents: 'none', zIndex: 15 }}></div>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  );
}

function DayEventCard({ ev, onClick }) {
  const member = TEAM_BY_ID[ev.owner] || TEAM_BY_ID.me;
  const typeTok = ev.type ? TYPES[ev.type] : { color: member.color, tint: member.accent };
  const top = (ev.start - HOUR_START) * HOUR_HEIGHT;
  const height = (ev.end - ev.start) * HOUR_HEIGHT;

  return (
    <div onClick={() => onClick(ev)} style={{
      position: 'absolute', top: top + 1, left: 6, right: 6,
      height: height - 2,
      background: typeTok.tint, borderRadius: 7,
      borderLeft: `3px solid ${typeTok.color}`,
      padding: '8px 12px', cursor: 'pointer', overflow: 'hidden', zIndex: 2,
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,23,42,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 18, height: 18, borderRadius: '50%', background: member.accent, color: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{member.initials}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{ev.title}</span>
        {ev.type && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#fff', color: typeTok.color }}>{ev.type}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtTime(ev.start)} – {fmtTime(ev.end)}</span>
        {ev.company && <><span style={{ color: '#CBD5E1' }}>·</span><span>{ev.company}</span></>}
      </div>
    </div>
  );
}

/* =================== MONTH VIEW =================== */

function MonthView({ visible, onSelectEvent, onSwitchView }) {
  // April 2026: 1st = Wed (idx 2). Render full grid w/ leading/trailing.
  const dim = 30; // April 2026 = 30 days
  const firstDow = 2; // Wednesday
  const cells = [];
  // leading days (Mar 30, 31)
  for (let i = 0; i < firstDow; i++) cells.push({ num: 30 - firstDow + 1 + i, muted: true, month: 'mar' });
  for (let d = 1; d <= dim; d++) cells.push({ num: d, month: 'apr', isToday: d === 27 });
  // trailing
  while (cells.length % 7 !== 0 || cells.length < 35) cells.push({ num: cells.length - dim - firstDow + 1, muted: true, month: 'mai' });

  // Map current week's events (day 0..6 = Mon..Sun) onto Apr 27..May 3
  const weekEvents = {
    27: EVENTS.filter(e => e.day === 0 && visible[e.owner]),
    28: EVENTS.filter(e => e.day === 1 && visible[e.owner]),
    29: EVENTS.filter(e => e.day === 2 && visible[e.owner]),
    30: EVENTS.filter(e => e.day === 3 && visible[e.owner]),
  };
  const mayWeek = {
    1: EVENTS.filter(e => e.day === 4 && visible[e.owner]),
  };

  const dayLabels = ['LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.', 'DIM.'];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #EDF1F5' }}>
        {dayLabels.map((d, i) => (
          <div key={i} style={{
            padding: '10px 12px',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: '#94A3B8',
            textTransform: 'uppercase',
            background: i >= 5 ? '#F1F5F9' : '#fff',
            borderLeft: i === 0 ? 'none' : '1px solid #F1F5F9',
            textAlign: 'center',
          }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(96px, 1fr)' }}>
        {cells.map((c, i) => {
          const dow = i % 7;
          const isWeekend = dow >= 5;
          const evs = (c.month === 'apr' && weekEvents[c.num]) || (c.month === 'mai' && mayWeek[c.num]) || [];
          return (
            <div key={i} onClick={() => evs.length === 0 && onSwitchView('Jour')} style={{
              borderLeft: dow === 0 ? 'none' : '1px solid #F1F5F9',
              borderTop: '1px solid #F1F5F9',
              padding: 6,
              background: isWeekend && !c.muted ? '#F8FAFC' : c.muted ? '#FAFBFC' : '#fff',
              minHeight: 96,
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4 }}>
                {c.isToday ? (
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#0052D9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 600 }}>{c.num}</span>
                ) : (
                  <span style={{ fontSize: 12, color: c.muted ? '#CBD5E1' : '#64748B', fontWeight: 500 }}>{c.num}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {evs.slice(0, 3).map(ev => {
                  const m = TEAM_BY_ID[ev.owner];
                  const typeTok = ev.type ? TYPES[ev.type] : { color: m.color, tint: m.accent };
                  return (
                    <div key={ev.id} onClick={(e) => { e.stopPropagation(); onSelectEvent(ev); }} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '2px 5px', borderRadius: 4,
                      background: typeTok.tint,
                      borderLeft: `2px solid ${typeTok.color}`,
                      fontSize: 10.5, color: '#0F172A',
                      overflow: 'hidden',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }}></span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.title}</span>
                    </div>
                  );
                })}
                {evs.length > 3 && (
                  <div style={{ fontSize: 10, color: '#0052D9', fontWeight: 500, padding: '0 5px' }}>+{evs.length - 3} autres</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =================== FOOTER =================== */

function Footer() {
  return (
    <div style={{
      padding: '8px 14px', borderTop: '1px solid #EDF1F5', background: '#FAFBFC',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    }}>
      <div style={{ position: 'relative' }}
        onMouseEnter={e => { const t = e.currentTarget.querySelector('.tt'); if (t) t.style.opacity = '1'; }}
        onMouseLeave={e => { const t = e.currentTarget.querySelector('.tt'); if (t) t.style.opacity = '0'; }}>
        <button style={{
          width: 22, height: 22, borderRadius: '50%', border: '1px solid #E2E8F0',
          background: '#fff', color: '#94A3B8', fontSize: 11, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help',
        }}>?</button>
        <div className="tt" style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
          background: '#0F172A', color: '#fff', padding: '8px 11px', borderRadius: 6,
          fontSize: 11, lineHeight: 1.5, whiteSpace: 'nowrap',
          opacity: 0, transition: 'opacity 140ms', pointerEvents: 'none',
          boxShadow: '0 4px 14px rgba(15,23,42,0.2)',
        }}>
          <div>Double-cliquez · créer un événement</div>
          <div>Glisser-déposer · déplacer</div>
          <div>Cliquer · modifier</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CalendarGrid });
