// Booking modal — Réserver un RDV
const { useState: useStateB, useEffect: useEffectB, useRef: useRefB, useMemo: useMemoB } = React;

const BOOKING_PROSPECT = {
  firstName: "Andréas", lastName: "BODIN",
  jobTitle: "Co-fondateur & CTO", company: "Andoxa",
  email: "andreas@andoxa.com", phone: "06 61 75 89 40",
  whatsapp: "0661758940", initials: "AB", color: "#FF6700",
};

const TEAM_MEMBERS = [
  { id: 'sebastian', name: 'Sebastian Bodin', initials: 'SB', color: '#0052D9', isMe: true },
  { id: 'andreas',   name: 'Andréas BODIN',   initials: 'AB', color: '#FF6700' },
  { id: 'marie',     name: 'Marie Lambert',   initials: 'ML', color: '#5B2EBF' },
  { id: 'thomas',    name: 'Thomas Roux',     initials: 'TR', color: '#0E7A3A' },
];

// Mocked busy slots — 5-6 conflicts on the week
const BUSY_SLOTS = (() => {
  const today = new Date('2026-05-06T09:00:00');
  const offsets = [
    { d: 0, h: 14, m: 0,  with: 'Camille R. (Pennylane)' },
    { d: 0, h: 16, m: 30, with: 'Mathieu L. (Spendesk)' },
    { d: 1, h: 10, m: 0,  with: 'Équipe (sync hebdo)' },
    { d: 1, h: 15, m: 15, with: 'Julien M. (Qonto)' },
    { d: 3, h: 11, m: 30, with: 'Sophie D. (Alan)' },
    { d: 5, h: 14, m: 0,  with: 'Lucas P. (Doctolib)' },
  ];
  return offsets.map(o => {
    const dt = new Date(today); dt.setDate(dt.getDate() + o.d); dt.setHours(o.h, o.m, 0, 0);
    return { time: dt.getTime(), with: o.with };
  });
})();

const FR_MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const FR_DAYS_SHORT = ['L','M','M','J','V','S','D'];
const FR_DAY_FULL = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const FR_DAY_FULL_CAP = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function sameDay(a, b) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }

function generateTimeSlots() {
  const out = [];
  for (let h = 9; h <= 19; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 19 && m > 0) break;
      out.push({ h, m });
    }
  }
  return out;
}

function MiniCalendar({ selectedDate, onSelectDate, busyByDay }) {
  const today = new Date('2026-05-06T12:00:00');
  const [viewMonth, setViewMonth] = useStateB(new Date(selectedDate || today));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-first
  let leadingBlanks = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} aria-label="Mois précédent" style={navBtn()}>
          {Icon.chevDown({ size: 14 })}
        </button>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', textTransform: 'capitalize' }}>
          {FR_MONTHS[month]} {year}
        </div>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} aria-label="Mois suivant" style={navBtn()}>
          {Icon.chevDown({ size: 14 })}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {FR_DAYS_SHORT.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--muted-foreground)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={i}/>;
          const isPast = cell < startOfDay(today);
          const isToday = sameDay(cell, today);
          const isSelected = selectedDate && sameDay(cell, selectedDate);
          const dayKey = startOfDay(cell).getTime();
          const hasConflict = (busyByDay[dayKey] || 0) > 0;
          return (
            <button key={i} disabled={isPast} onClick={() => onSelectDate(cell)}
              style={{
                position: 'relative', aspectRatio: '1', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: isSelected ? 'var(--brand-blue)' : isToday ? 'var(--brand-blue-tint)' : 'transparent',
                color: isPast ? 'var(--neutral-300)' : isSelected ? 'white' : 'var(--foreground)',
                border: isToday && !isSelected ? '1.5px solid var(--brand-blue)' : '1.5px solid transparent',
                borderRadius: 6,
                cursor: isPast ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: isSelected || isToday ? 600 : 500,
                fontVariantNumeric: 'tabular-nums',
                transition: 'background 100ms',
              }}
              onMouseEnter={(e) => { if (!isPast && !isSelected) e.currentTarget.style.background = 'var(--neutral-100)'; }}
              onMouseLeave={(e) => { if (!isPast && !isSelected) e.currentTarget.style.background = isToday ? 'var(--brand-blue-tint)' : 'transparent'; }}>
              {cell.getDate()}
              {hasConflict && !isPast && (
                <span style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 3, height: 3, borderRadius: '50%',
                  background: isSelected ? 'white' : 'var(--brand-orange)',
                }}/>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function navBtn() {
  return {
    width: 26, height: 26, borderRadius: 6, background: 'transparent',
    border: '1px solid var(--border)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--foreground)',
  };
}

function TimeSlots({ selectedDate, selectedTime, onSelect, busySlots }) {
  const slots = generateTimeSlots();
  const today = new Date('2026-05-06T12:00:00');
  const isToday = selectedDate && sameDay(selectedDate, today);

  const findBusy = (h, m) => {
    if (!selectedDate) return null;
    const dt = new Date(selectedDate); dt.setHours(h, m, 0, 0);
    return busySlots.find(b => Math.abs(b.time - dt.getTime()) < 60000);
  };

  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)', borderRadius: 10,
      height: 280, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--border)',
        fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        Créneau {selectedDate ? `· ${FR_DAY_FULL[selectedDate.getDay()]} ${selectedDate.getDate()} ${FR_MONTHS[selectedDate.getMonth()]}` : ''}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
        {slots.map(({ h, m }) => {
          const busy = findBusy(h, m);
          const dt = selectedDate ? new Date(selectedDate) : null;
          if (dt) dt.setHours(h, m, 0, 0);
          const isPast = isToday && dt && dt < today;
          const disabled = !!busy || isPast;
          const isSelected = selectedTime && selectedTime.h === h && selectedTime.m === m;
          const label = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          return (
            <button key={`${h}-${m}`}
              disabled={disabled}
              onClick={() => onSelect({ h, m })}
              title={busy ? `Occupé : RDV avec ${busy.with}` : ''}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '6px 10px', marginBottom: 2,
                background: isSelected ? 'var(--brand-blue)' : 'transparent',
                color: isSelected ? 'white' : disabled ? 'var(--neutral-300)' : 'var(--foreground)',
                border: 'none', borderRadius: 6,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 12.5, fontWeight: isSelected ? 600 : 500,
                fontVariantNumeric: 'tabular-nums',
                textDecoration: busy ? 'line-through' : 'none',
                transition: 'background 100ms',
              }}
              onMouseEnter={(e) => { if (!disabled && !isSelected) e.currentTarget.style.background = 'var(--neutral-100)'; }}
              onMouseLeave={(e) => { if (!disabled && !isSelected) e.currentTarget.style.background = 'transparent'; }}>
              <span>{label}</span>
              {busy && <span style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--neutral-400)' }}>Occupé</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function quickPickFromLabel(key) {
  const today = new Date('2026-05-06T12:00:00');
  if (key === 'tomorrow14') { const d = new Date(today); d.setDate(d.getDate() + 1); d.setHours(14,0,0,0); return d; }
  if (key === 'aftertomorrow10') { const d = new Date(today); d.setDate(d.getDate() + 2); d.setHours(10,0,0,0); return d; }
  if (key === 'monday9') {
    const d = new Date(today);
    const dow = d.getDay(); // 0=Sun
    const offset = (8 - (dow === 0 ? 7 : dow)) % 7 || 7;
    d.setDate(d.getDate() + offset); d.setHours(9, 0, 0, 0);
    return d;
  }
}

function BookingModal({ open, onClose, onConfirm }) {
  const [date, setDate] = useStateB(null);
  const [time, setTime] = useStateB(null);
  const [duration, setDuration] = useStateB(30);
  const [meetType, setMeetType] = useStateB('meet'); // meet | phone | onsite
  const [address, setAddress] = useStateB('');
  const [assignee, setAssignee] = useStateB('sebastian');
  const [assigneeOpen, setAssigneeOpen] = useStateB(false);
  const [email, setEmail] = useStateB(BOOKING_PROSPECT.email);
  const [whatsappOn, setWhatsappOn] = useStateB(false);
  const [whatsappPhone, setWhatsappPhone] = useStateB(BOOKING_PROSPECT.whatsapp);
  const [consent, setConsent] = useStateB(false);
  const [noteOpen, setNoteOpen] = useStateB(false);
  const [note, setNote] = useStateB('');
  const [confirmExit, setConfirmExit] = useStateB(false);
  const [callTimer, setCallTimer] = useStateB(222); // 03:42 starting

  // Live call timer
  useEffectB(() => {
    if (!open) return;
    const id = setInterval(() => setCallTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  // Reset on close
  useEffectB(() => {
    if (!open) {
      setTimeout(() => {
        setDate(null); setTime(null); setDuration(30);
        setMeetType('meet'); setAddress(''); setAssignee('sebastian');
        setEmail(BOOKING_PROSPECT.email); setWhatsappOn(false);
        setWhatsappPhone(BOOKING_PROSPECT.whatsapp); setConsent(false);
        setNoteOpen(false); setNote(''); setConfirmExit(false);
      }, 200);
    }
  }, [open]);

  const isDirty = !!(date || time || note || whatsappOn || meetType !== 'meet');

  // Escape
  useEffectB(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isDirty) setConfirmExit(true);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isDirty, onClose]);

  // Build busyByDay map
  const busyByDay = useMemoB(() => {
    const m = {};
    BUSY_SLOTS.forEach(b => {
      const k = startOfDay(new Date(b.time)).getTime();
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, []);

  // Validations
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = /^\+?[0-9\s.-]{8,}$/.test(whatsappPhone);
  const dateTimeValid = !!(date && time);
  const meetValid = meetType !== 'onsite' || address.trim().length > 0;
  const whatsappValid = !whatsappOn || (consent && phoneValid);
  const canConfirm = emailValid && dateTimeValid && meetValid && whatsappValid;

  const handleQuick = (key) => {
    const d = quickPickFromLabel(key);
    setDate(d);
    setTime({ h: d.getHours(), m: d.getMinutes() });
  };

  const handleClose = () => { if (isDirty) setConfirmExit(true); else onClose(); };

  const handleConfirm = () => {
    if (!canConfirm) return;
    const dt = new Date(date); dt.setHours(time.h, time.m, 0, 0);
    const member = TEAM_MEMBERS.find(m => m.id === assignee);
    // Cascade — fire-and-forget side effects
    console.log('[1] Création événement Google Calendar', { dt, duration, meetType });
    if (meetType === 'meet') console.log('[1b] Lien Google Meet généré : meet.google.com/abc-defg-hij');
    console.log('[2] Email d\'invitation envoyé à', email);
    console.log('[3] RDV ajouté au calendrier Andoxa');
    console.log('[4] Statut CRM prospect → RDV');
    if (whatsappOn) console.log('[5] Séquence WhatsApp post-booking déclenchée pour', whatsappPhone);
    if (note) console.log('[6] Note interne enregistrée :', note);

    // Format toast text
    const dayLabel = `${FR_DAY_FULL[dt.getDay()]} ${dt.getDate()} ${FR_MONTHS[dt.getMonth()]}`;
    const timeLabel = `${String(time.h).padStart(2,'0')}:${String(time.m).padStart(2,'0')}`;
    onConfirm({ message: `RDV créé pour ${dayLabel} à ${timeLabel}`, sub: meetType === 'meet' ? 'Lien Meet généré · Email envoyé · Statut mis à jour' : 'Email envoyé · Statut mis à jour' });
  };

  if (!open) return null;

  const fmt = (n) => String(n).padStart(2, '0');
  const callMin = Math.floor(callTimer / 60), callSec = callTimer % 60;

  return (
    <>
      {/* Backdrop with blurred call context */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 20, animation: 'fadeIn 200ms ease',
      }}>
        {/* Faux call context behind modal */}
        <div style={{
          position: 'absolute', inset: 0, padding: 40, opacity: 0.4,
          pointerEvents: 'none', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 24, left: 24,
            background: '#16A34A', color: 'white',
            padding: '6px 14px', borderRadius: 9999,
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.4)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', animation: 'pulse 1.2s infinite' }}/>
            Appel en cours · <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{fmt(callMin)}:{fmt(callSec)}</span>
          </div>
          <div style={{
            position: 'absolute', top: 24, right: 24,
            background: 'white', borderRadius: 12, padding: 14,
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 280,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: BOOKING_PROSPECT.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
              {BOOKING_PROSPECT.initials}
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{BOOKING_PROSPECT.firstName} {BOOKING_PROSPECT.lastName}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--brand-blue)', fontVariantNumeric: 'tabular-nums' }}>
                {BOOKING_PROSPECT.phone}
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        <div onClick={(e) => e.stopPropagation()} style={{
          position: 'relative', background: 'white', borderRadius: 14,
          width: 'min(720px, 100%)', maxHeight: 'calc(100vh - 40px)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 30px 60px -15px rgba(0,0,0,0.4)',
          animation: 'modalIn 200ms ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 18px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--brand-blue-tint)', color: 'var(--brand-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{Icon.calendar({ size: 16 })}</span>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.015em' }}>Réserver un RDV</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 1 }}>
                  L'invitation sera envoyée par email et ajoutée à votre Google Calendar.
                </div>
              </div>
            </div>
            <button onClick={handleClose} aria-label="Fermer" style={{
              width: 28, height: 28, border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', borderRadius: 8, color: 'var(--muted-foreground)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-100)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              {Icon.x({ size: 14 })}
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px' }}>
            {/* Prospect block */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 12, background: 'var(--neutral-50)', borderRadius: 10, marginBottom: 14,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: BOOKING_PROSPECT.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                {BOOKING_PROSPECT.initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{BOOKING_PROSPECT.firstName} {BOOKING_PROSPECT.lastName}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>{BOOKING_PROSPECT.jobTitle} · {BOOKING_PROSPECT.company}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--muted-foreground)', fontSize: 11, width: 50 }}>Email</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..."
                    style={{
                      width: 200, height: 26, padding: '0 8px',
                      border: `1px solid ${email && !emailValid ? 'var(--color-destructive)' : 'var(--border)'}`,
                      borderRadius: 6, background: 'white', fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--muted-foreground)', fontSize: 11, width: 50 }}>Tél.</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }}>
                    {Icon.phone({ size: 11 })} {BOOKING_PROSPECT.phone}
                  </span>
                </div>
              </div>
              <a href="#" onClick={(e) => e.preventDefault()} style={{
                fontSize: 11.5, color: 'var(--brand-blue)', textDecoration: 'none', fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
              }}>Voir la fiche {Icon.external({ size: 11 })}</a>
            </div>

            {email && !emailValid && (
              <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: -10, marginBottom: 10 }}>
                Format email invalide
              </div>
            )}

            {/* Quick pick buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rapide</span>
              {[
                { id: 'tomorrow14', label: 'Demain 14h' },
                { id: 'aftertomorrow10', label: 'Après-demain 10h' },
                { id: 'monday9', label: 'Lundi 9h' },
              ].map(q => (
                <button key={q.id} onClick={() => handleQuick(q.id)} style={{
                  padding: '4px 9px', fontSize: 11.5, fontWeight: 500,
                  background: 'white', color: 'var(--foreground)',
                  border: '1px solid var(--border)', borderRadius: 9999,
                  cursor: 'pointer', transition: 'all 100ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-blue-tint)'; e.currentTarget.style.borderColor = 'var(--brand-blue)'; e.currentTarget.style.color = 'var(--brand-blue-dark)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--foreground)'; }}>
                  {q.label}
                </button>
              ))}
            </div>

            {/* Date + time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 10, marginBottom: 12 }}>
              <MiniCalendar selectedDate={date} onSelectDate={(d) => setDate(d)} busyByDay={busyByDay}/>
              <TimeSlots selectedDate={date} selectedTime={time} onSelect={setTime} busySlots={BUSY_SLOTS}/>
            </div>

            {/* Duration */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Durée</span>
              {[15, 30, 45, 60].map(d => (
                <button key={d} onClick={() => setDuration(d)} style={{
                  padding: '4px 11px', fontSize: 12, fontWeight: duration === d ? 600 : 500,
                  background: duration === d ? 'var(--brand-blue-tint)' : 'white',
                  color: duration === d ? 'var(--brand-blue-dark)' : 'var(--foreground)',
                  border: `1px solid ${duration === d ? 'var(--brand-blue)' : 'var(--border)'}`,
                  borderRadius: 9999, cursor: 'pointer',
                }}>
                  {d} min
                </button>
              ))}
            </div>

            {/* Meeting type + assignee — same row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Type de meeting</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <MeetTypeBtn id="meet" current={meetType} onSelect={setMeetType} icon="eye" label="Google Meet" sub="Lien auto"/>
                  <MeetTypeBtn id="phone" current={meetType} onSelect={setMeetType} icon="phone" label="Téléphone" sub="Pas de lien"/>
                  <MeetTypeBtn id="onsite" current={meetType} onSelect={setMeetType} icon="target" label="Présentiel" sub="Adresse libre"/>
                </div>
                {meetType === 'onsite' && (
                  <input value={address} onChange={(e) => setAddress(e.target.value)}
                    placeholder="Adresse du RDV (ex : 12 rue de la Paix, Paris)"
                    style={{
                      marginTop: 6, width: '100%', height: 32, padding: '0 10px',
                      border: '1px solid var(--border)', borderRadius: 8,
                      fontSize: 12.5, fontFamily: 'var(--font-sans)', outline: 'none',
                      animation: 'fadeIn 200ms ease',
                    }}/>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Assigné à</div>
                <button onClick={() => setAssigneeOpen(o => !o)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', height: 32,
                  background: 'white', border: '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer', minWidth: 180,
                }}>
                  {(() => { const m = TEAM_MEMBERS.find(t => t.id === assignee); return (
                    <>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: m.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{m.initials}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1, textAlign: 'left' }}>{m.name}{m.isMe && ' (moi)'}</span>
                      <span style={{ display: 'flex', color: 'var(--muted-foreground)' }}>{Icon.chevDown({ size: 12 })}</span>
                    </>
                  ); })()}
                </button>
                {assigneeOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setAssigneeOpen(false)}/>
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 4,
                      background: 'white', border: '1px solid var(--border)',
                      borderRadius: 8, minWidth: 200, padding: 4,
                      boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15)',
                      zIndex: 11, animation: 'menuIn 150ms ease',
                    }}>
                      {TEAM_MEMBERS.map(m => (
                        <button key={m.id} onClick={() => { setAssignee(m.id); setAssigneeOpen(false); }} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '6px 8px', borderRadius: 6,
                          border: 'none', background: assignee === m.id ? 'var(--neutral-100)' : 'transparent',
                          cursor: 'pointer', fontSize: 12.5,
                        }}
                        onMouseEnter={(e) => { if (assignee !== m.id) e.currentTarget.style.background = 'var(--neutral-50)'; }}
                        onMouseLeave={(e) => { if (assignee !== m.id) e.currentTarget.style.background = 'transparent'; }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: m.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{m.initials}</span>
                          <span style={{ fontWeight: 500 }}>{m.name}{m.isMe && ' (moi)'}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* WhatsApp activation */}
            <div style={{
              border: '1px solid var(--border)', borderRadius: 10,
              padding: '10px 12px', marginBottom: 10,
              background: whatsappOn ? 'rgba(37, 211, 102, 0.04)' : 'white',
              borderColor: whatsappOn ? '#7DDDA0' : 'var(--border)',
              transition: 'all 200ms',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6, background: '#25D366', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{Icon.whatsapp({ size: 13 })}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>Activer la séquence WhatsApp post-booking</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                      1ère confirmation immédiate · Rappel H-24 · Rappel H-2 · Suivi post-meeting
                    </div>
                  </div>
                </div>
                <Switch checked={whatsappOn} onChange={setWhatsappOn}/>
              </div>
              {whatsappOn && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeIn 200ms ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)', width: 90 }}>Numéro WhatsApp</span>
                    <input value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                      style={{
                        flex: 1, height: 28, padding: '0 8px',
                        border: `1px solid ${whatsappPhone && !phoneValid ? 'var(--color-destructive)' : 'var(--border)'}`,
                        borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none',
                      }}/>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                      style={{ marginTop: 2, accentColor: 'var(--brand-blue)' }}/>
                    <span style={{ fontSize: 11.5, lineHeight: 1.45, color: consent ? 'var(--foreground)' : '#7A4D00' }}>
                      <strong style={{ fontWeight: 600 }}>Consentement requis :</strong> le prospect a donné son accord verbal pour recevoir des messages WhatsApp de rappel et de suivi.
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Internal note */}
            {!noteOpen ? (
              <button onClick={() => setNoteOpen(true)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--brand-blue)', fontSize: 12, fontWeight: 500,
                padding: '4px 0', display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>+ Ajouter une note interne</button>
            ) : (
              <div style={{ animation: 'fadeIn 200ms ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted-foreground)' }}>Note interne</span>
                  <span style={{ fontSize: 10.5, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Visible uniquement par vous et votre équipe</span>
                </div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex : Prospect intéressé par l'offre Premium, décideur final, budget validé"
                  rows={2}
                  style={{
                    width: '100%', padding: '6px 10px',
                    border: '1px solid var(--border)', borderRadius: 8,
                    fontFamily: 'var(--font-sans)', fontSize: 12.5,
                    lineHeight: 1.5, resize: 'vertical', outline: 'none',
                  }}/>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 18px', borderTop: '1px solid var(--border)',
            background: 'var(--neutral-50)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
              {dateTimeValid ? (
                <>
                  <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>
                    {FR_DAY_FULL_CAP[date.getDay()]} {date.getDate()} {FR_MONTHS[date.getMonth()]}
                  </strong>
                  {' · '}
                  <strong style={{ color: 'var(--foreground)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {String(time.h).padStart(2,'0')}:{String(time.m).padStart(2,'0')}
                  </strong>
                  {' '}({duration} min)
                </>
              ) : 'Sélectionnez une date et un créneau'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={handleClose}>Annuler</Button>
              <Button variant="primary" disabled={!canConfirm} onClick={handleConfirm}
                leftIcon={Icon.check({ size: 14 })}>Confirmer et créer</Button>
            </div>
          </div>
        </div>
      </div>

      {confirmExit && (
        <div onClick={(e) => { e.stopPropagation(); setConfirmExit(false); }} style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 220,
          animation: 'fadeIn 150ms ease',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: 14, padding: 24,
            maxWidth: 420, width: 'calc(100% - 40px)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            animation: 'modalIn 180ms ease',
          }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Quitter sans enregistrer ?</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted-foreground)', lineHeight: 1.55, marginBottom: 20 }}>
              Vos modifications seront perdues.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onClick={() => setConfirmExit(false)}>Annuler</Button>
              <Button variant="primary" onClick={() => { setConfirmExit(false); onClose(); }}
                style={{ background: '#DC2626', borderColor: '#DC2626' }}>Quitter</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MeetTypeBtn({ id, current, onSelect, icon, label, sub }) {
  const active = current === id;
  return (
    <button onClick={() => onSelect(id)} style={{
      flex: 1, padding: '8px 10px',
      background: active ? 'var(--brand-blue-tint)' : 'white',
      border: `1.5px solid ${active ? 'var(--brand-blue)' : 'var(--border)'}`,
      borderRadius: 8, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 8,
      transition: 'all 100ms',
    }}>
      <span style={{
        color: active ? 'var(--brand-blue)' : 'var(--muted-foreground)',
        display: 'flex', flexShrink: 0,
      }}>{Icon[icon]({ size: 14 })}</span>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--brand-blue-dark)' : 'var(--foreground)' }}>{label}</div>
        <div style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>{sub}</div>
      </div>
    </button>
  );
}

window.BookingModal = BookingModal;
