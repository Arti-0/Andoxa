// Andoxa Calendrier — Right slide-in panel for event details (NO monetary value)

function EventPanel({ event, onClose }) {
  if (!event) return null;
  const member = TEAM_BY_ID[event.owner] || TEAM_BY_ID.me;
  const tok = STATUS_TOKENS[event.status];
  const typeTok = event.type ? TYPES[event.type] : null;
  const dur = event.end - event.start;
  const durLabel = `${Math.floor(dur)}h${String(Math.round((dur % 1) * 60)).padStart(2, '0')}`;
  const dayLabel = WEEK_DAYS[event.day];
  const meetingLabel = event.meeting === 'meet' ? 'Google Meet' : event.meeting === 'zoom' ? 'Zoom' : 'En personne';

  return (
    <>
      <div onClick={onClose} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.18)', backdropFilter: 'blur(2px)', zIndex: 100 }}></div>
      <aside className="panel-slide-in" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
        background: '#fff', borderLeft: '1px solid #EDF1F5',
        boxShadow: '-8px 0 24px rgba(15,23,42,0.06)', zIndex: 101,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 22px 18px', borderBottom: '1px solid #EDF1F5', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              {typeTok && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', background: typeTok.tint, color: typeTok.text, textTransform: 'uppercase' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: typeTok.color }}></span>{event.type}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: tok.pillBg, color: tok.pillText, textTransform: 'uppercase' }}>{tok.label}</span>
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 500, color: '#0F172A', letterSpacing: '-0.01em', lineHeight: 1.25 }}>{event.title}</h2>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: '1px solid #E2E8F0', background: '#fff', borderRadius: 7, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {/* When */}
          <Block label="Date et heure">
            <div style={{ fontSize: 13, color: '#0F172A' }}>
              {dayLabel.long} {dayLabel.num} {dayLabel.month === 'avr' ? 'avril' : 'mai'} 2026
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {fmtTime(event.start)} — {fmtTime(event.end)} <span style={{ color: '#94A3B8' }}>· {durLabel}</span>
            </div>
          </Block>

          {/* Prospect */}
          {event.prospect && (
            <Block label="Prospect">
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', background: '#F8FAFC', border: '1px solid #EDF1F5', borderRadius: 9 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(event.prospect), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>{initials(event.prospect)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', lineHeight: 1.3 }}>{event.prospect}</div>
                  <div style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.3 }}>{event.prospectRole ? `${event.prospectRole} · ` : ''}{event.company}</div>
                </div>
              </div>
              {event.pipelineStage && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                  <span style={{ color: '#94A3B8' }}>Étape pipeline :</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 500, background: '#E8F0FD', color: '#0052D9' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#0052D9' }}></span>{event.pipelineStage}
                  </span>
                </div>
              )}
              <a href="#" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#0052D9', fontWeight: 500, textDecoration: 'none' }}>
                Voir la fiche prospect
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
            </Block>
          )}

          {/* Participants */}
          <Block label="Participants">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Participant name={member.name} sub="Andoxa" color={member.color} accent={member.accent} ini={member.initials} status="organizer"/>
              {event.prospect && (
                <Participant name={event.prospect} sub={event.company} color="#475569" accent={avatarColor(event.prospect)} ini={initials(event.prospect)} status={event.status === 'confirmed' ? 'accepted' : event.status === 'pending' ? 'pending' : 'accepted'}/>
              )}
            </div>
          </Block>

          {/* Lieu / Visio */}
          <Block label={event.meeting === 'inperson' ? 'Lieu' : 'Visio'}>
            {event.meeting !== 'inperson' ? (
              <div>
                <a href="#" style={{ fontSize: 12.5, color: '#0052D9', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  meet.google.com/abc-defg-hij
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                <button style={{ marginTop: 10, padding: '9px 14px', background: '#0052D9', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 1px 2px rgba(0,82,217,0.28)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  Rejoindre la réunion
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: '#0F172A' }}>{event.company} · sur place</div>
            )}
          </Block>

          {/* Notes */}
          <Block label="Description">
            <a href="#" style={{ fontSize: 12, color: '#0052D9', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ajouter une note
            </a>
          </Block>

          {/* Activity */}
          {event.prospect && (
            <Block label="Activité du prospect">
              <div style={{ position: 'relative', paddingLeft: 14 }}>
                <div style={{ position: 'absolute', left: 4, top: 6, bottom: 6, width: 1, background: '#EDF1F5' }}></div>
                {(PROSPECT_ACTIVITY.default).map((a, i) => (
                  <div key={i} style={{ position: 'relative', paddingBottom: 9, fontSize: 11.5 }}>
                    <span style={{ position: 'absolute', left: -14, top: 4, width: 9, height: 9, borderRadius: '50%', background: i === 0 ? '#0052D9' : '#CBD5E1', border: '2px solid #fff', boxShadow: '0 0 0 1px #EDF1F5' }}></span>
                    <div style={{ color: '#0F172A', fontWeight: 500 }}>{a.label}</div>
                    <div style={{ color: '#94A3B8', fontSize: 10.5 }}>{a.date}</div>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {/* Workflows */}
          {event.wa && (
            <Block label="Workflows actifs">
              <div style={{ padding: '10px 12px', background: '#F8FAFC', border: '1px solid #EDF1F5', borderRadius: 9, fontSize: 11.5, color: '#0F172A' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }}></span>
                  <span style={{ fontWeight: 500 }}>Préparation pré-RDV WhatsApp</span>
                </div>
                <div style={{ marginTop: 4, color: '#64748B', fontSize: 11 }}>Rappel envoyé hier à 18:02</div>
              </div>
            </Block>
          )}

          <div style={{ height: 60 }}></div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 22px', borderTop: '1px solid #EDF1F5', background: '#FAFBFC', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{ padding: '9px 14px', background: '#0052D9', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 2px rgba(0,82,217,0.28)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1A6AFF'}
            onMouseLeave={e => e.currentTarget.style.background = '#0052D9'}>
            Modifier l'événement
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ flex: 1, padding: '8px 10px', background: '#fff', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              Marquer réalisé
            </button>
            <button style={{ flex: 1, padding: '8px 10px', background: '#fff', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Supprimer
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Block({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Participant({ name, sub, color, accent, ini, status }) {
  const statusLabel = status === 'organizer' ? 'Organisateur' : status === 'accepted' ? 'A accepté' : status === 'declined' ? 'A décliné' : 'En attente';
  const statusColor = status === 'organizer' ? '#0052D9' : status === 'accepted' ? '#10B981' : status === 'declined' ? '#EF4444' : '#F59E0B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0' }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', background: accent, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{ini}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: '#0F172A', lineHeight: 1.3, fontWeight: 500 }}>{name}</div>
        {sub && <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.3 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 10.5, color: statusColor, fontWeight: 500 }}>{statusLabel}</span>
    </div>
  );
}

Object.assign(window, { EventPanel });
