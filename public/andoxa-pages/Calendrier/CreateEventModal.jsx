// Andoxa Calendrier — Create event modal

function CreateEventModal({ open, prefill, onClose, onCreate }) {
  const [type, setType] = React.useState('Discovery');
  const [allDay, setAllDay] = React.useState(false);
  const [meetingPlatform, setMeetingPlatform] = React.useState('meet');
  const [genLink, setGenLink] = React.useState(true);
  const [showNotifs, setShowNotifs] = React.useState(false);
  const [participants, setParticipants] = React.useState(['Vous']);
  const [participantInput, setParticipantInput] = React.useState('');
  const [prospectQuery, setProspectQuery] = React.useState('');
  const [showSuggest, setShowSuggest] = React.useState(false);
  const [selectedProspect, setSelectedProspect] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      setType('Discovery');
      setAllDay(false);
      setMeetingPlatform('meet');
      setGenLink(true);
      setShowNotifs(false);
      setParticipants(['Vous']);
      setParticipantInput('');
      setProspectQuery('');
      setSelectedProspect(null);
    }
  }, [open]);

  if (!open) return null;

  const day = prefill?.day != null ? WEEK_DAYS[prefill.day] : WEEK_DAYS[0];
  const startH = prefill?.start ?? 10;
  const endH = prefill?.end ?? (startH + 1);

  const prospects = [
    { name: 'Andréas BODIN', company: 'Junior ESSEC Conseil' },
    { name: 'Lucile MERCIER', company: 'Edhec Junior Études' },
    { name: 'Sarah COHEN', company: 'JE Dauphine Conseil' },
    { name: 'Théo NGUYEN', company: 'EM Lyon Junior Conseil' },
    { name: 'Hugo LEROY', company: 'JE ESCP' },
  ].filter(p => !prospectQuery || p.name.toLowerCase().includes(prospectQuery.toLowerCase()));

  return (
    <>
      <div onClick={onClose} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', zIndex: 200 }}></div>
      <div className="fade-in" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '92%', maxWidth: 600, maxHeight: '88vh',
        background: '#fff', borderRadius: 12, zIndex: 201,
        boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #EDF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em' }}>{type === 'Interne' ? 'Nouvel événement' : 'Nouveau RDV'}</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, border: '1px solid #E2E8F0', background: '#fff', borderRadius: 7, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {/* Title */}
          <Field label="Titre de l'événement" required>
            <input autoFocus type="text" placeholder="Discovery avec Andréas BODIN" style={inputStyle}/>
          </Field>

          {/* Type */}
          <Field label="Type d'événement">
            <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: 8, padding: 2 }}>
              {Object.keys(TYPES).map(t => {
                const tok = TYPES[t];
                const active = type === t;
                return (
                  <button key={t} onClick={() => setType(t)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 11px',
                    background: active ? '#fff' : 'transparent',
                    color: active ? '#0F172A' : '#64748B',
                    border: 'none', borderRadius: 6,
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: tok.color }}></span>
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Date / time */}
          <Field label="Date et heure">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input type="text" defaultValue={`${day.long} ${day.num} ${day.month === 'avr' ? 'avril' : 'mai'} 2026`} style={{ ...inputStyle, flex: '1 1 200px' }}/>
              <input type="text" defaultValue={fmtTime(startH)} style={{ ...inputStyle, width: 80, fontVariantNumeric: 'tabular-nums' }} disabled={allDay}/>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>–</span>
              <input type="text" defaultValue={fmtTime(endH)} style={{ ...inputStyle, width: 80, fontVariantNumeric: 'tabular-nums' }} disabled={allDay}/>
              <button onClick={() => setAllDay(!allDay)} style={{ background: 'transparent', color: allDay ? '#0052D9' : '#64748B', border: 'none', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 6px' }}>{allDay ? '✓ ' : ''}Toute la journée</button>
            </div>
          </Field>

          {/* Prospect */}
          <Field label="Prospect" hint="Optionnel">
            <div style={{ position: 'relative' }}>
              {selectedProspect ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', background: '#F8FAFC', border: '1px solid #EDF1F5', borderRadius: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(selectedProspect.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#475569' }}>{initials(selectedProspect.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: '#0F172A' }}>{selectedProspect.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{selectedProspect.company}</div>
                  </div>
                  <button onClick={() => setSelectedProspect(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4, display: 'flex' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <input
                  type="text" value={prospectQuery}
                  onChange={e => { setProspectQuery(e.target.value); setShowSuggest(true); }}
                  onFocus={() => setShowSuggest(true)}
                  onBlur={() => setTimeout(() => setShowSuggest(false), 180)}
                  placeholder="Rechercher un prospect…"
                  style={inputStyle}/>
              )}
              {showSuggest && !selectedProspect && prospectQuery && prospects.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 6px 18px rgba(15,23,42,0.08)', zIndex: 5, padding: 4, maxHeight: 220, overflowY: 'auto' }}>
                  {prospects.map((p, i) => (
                    <button key={i} onMouseDown={() => { setSelectedProspect(p); setProspectQuery(''); }} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '7px 9px', background: 'transparent', border: 'none',
                      borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: avatarColor(p.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600, color: '#475569' }}>{initials(p.name)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#0F172A' }}>{p.name}</div>
                        <div style={{ fontSize: 10.5, color: '#64748B' }}>{p.company}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a href="#" style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#0052D9', fontWeight: 500, textDecoration: 'none' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ajouter un nouveau prospect
            </a>
          </Field>

          {/* Participants */}
          <Field label="Participants">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: 5, border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', minHeight: 36 }}>
              {participants.map((p, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 4px 3px 8px', background: '#E8F0FD', color: '#0052D9', borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>
                  {p}
                  <button onClick={() => setParticipants(participants.filter((_, j) => j !== i))} style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,82,217,0.15)', border: 'none', color: '#0052D9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </span>
              ))}
              <input
                type="text" value={participantInput}
                onChange={e => setParticipantInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && participantInput.trim()) {
                    e.preventDefault();
                    setParticipants([...participants, participantInput.trim()]);
                    setParticipantInput('');
                  }
                }}
                placeholder="Ajouter un membre ou un email…"
                style={{ flex: 1, minWidth: 140, border: 'none', outline: 'none', fontSize: 12, padding: '4px 6px', fontFamily: 'inherit', background: 'transparent' }}/>
            </div>
          </Field>

          {/* Meeting */}
          <Field label="Lieu / Visio">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { id: 'meet', label: 'Google Meet' },
                { id: 'zoom', label: 'Zoom' },
                { id: 'inperson', label: 'En personne' },
                { id: 'phone', label: 'Téléphone' },
                { id: 'other', label: 'Autre' },
              ].map(opt => {
                const active = meetingPlatform === opt.id;
                return (
                  <button key={opt.id} onClick={() => setMeetingPlatform(opt.id)} style={{
                    padding: '6px 11px',
                    background: active ? '#E8F0FD' : '#fff',
                    color: active ? '#0052D9' : '#64748B',
                    border: `1px solid ${active ? '#0052D9' : '#E2E8F0'}`,
                    borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{opt.label}</button>
                );
              })}
            </div>
            {meetingPlatform === 'meet' && (
              <label style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                <span style={{ position: 'relative', width: 30, height: 18, background: genLink ? '#0052D9' : '#CBD5E1', borderRadius: 999, transition: 'background 140ms' }}>
                  <span style={{ position: 'absolute', top: 2, left: genLink ? 14 : 2, width: 14, height: 14, background: '#fff', borderRadius: '50%', transition: 'left 140ms' }}></span>
                </span>
                <input type="checkbox" checked={genLink} onChange={() => setGenLink(!genLink)} style={{ display: 'none' }}/>
                Générer le lien automatiquement
              </label>
            )}
            {meetingPlatform === 'inperson' && (
              <input type="text" placeholder="Adresse" style={{ ...inputStyle, marginTop: 9 }}/>
            )}
            {meetingPlatform === 'other' && (
              <input type="text" placeholder="Précisez…" style={{ ...inputStyle, marginTop: 9 }}/>
            )}
          </Field>

          {/* Description */}
          <Field label="Description" hint="Optionnel">
            <textarea placeholder="Notes, ordre du jour, points à aborder…" style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}/>
          </Field>

          {/* Notifs */}
          <div>
            <button onClick={() => setShowNotifs(!showNotifs)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: showNotifs ? 'rotate(90deg)' : 'none', transition: 'transform 140ms' }}><polyline points="9 18 15 12 9 6"/></svg>
              Notifications
            </button>
            {showNotifs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '8px 0 0 16px' }}>
                <Check defaultChecked label="Envoyer une invitation par email aux participants"/>
                <Check defaultChecked label="Envoyer un rappel WhatsApp au prospect 2h avant"/>
                <Check label="Activer le workflow post-RDV automatiquement"/>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 22px', borderTop: '1px solid #EDF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button onClick={onClose} style={{ background: 'transparent', color: '#64748B', border: 'none', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 4px' }}>Annuler</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 13px', background: '#fff', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Enregistrer comme brouillon</button>
            <button onClick={onCreate} style={{ padding: '8px 14px', background: '#0052D9', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 2px rgba(0,82,217,0.28)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1A6AFF'}
              onMouseLeave={e => e.currentTarget.style.background = '#0052D9'}>
              Créer l'événement
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 11px',
  border: '1px solid #E2E8F0', borderRadius: 7,
  fontSize: 12.5, color: '#0F172A',
  fontFamily: 'inherit', background: '#fff',
  outline: 'none',
};

function Field({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <label style={{ fontSize: 11.5, fontWeight: 500, color: '#475569' }}>{label}{required && <span style={{ color: '#EF4444' }}> *</span>}</label>
        {hint && <span style={{ fontSize: 10.5, color: '#94A3B8' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Check({ label, defaultChecked }) {
  const [c, setC] = React.useState(!!defaultChecked);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#475569' }}>
      <span style={{ width: 15, height: 15, borderRadius: 4, background: c ? '#0052D9' : '#fff', border: c ? '1px solid #0052D9' : '1.5px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {c && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </span>
      <input type="checkbox" checked={c} onChange={() => setC(!c)} style={{ display: 'none' }}/>
      {label}
    </label>
  );
}

Object.assign(window, { CreateEventModal });
