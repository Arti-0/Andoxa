// Andoxa Calendrier — Calendars sidebar (~240px)
// "Mon agenda" + "Mon équipe" + "Externes" + "Ajouter un agenda"

function CalendarsSidebar({ visible, onToggle }) {
  // visible = { [id]: bool } — controls which owners' events show
  return (
    <aside style={{
      width: 240, flexShrink: 0,
      background: '#FAFBFC',
      borderRight: '1px solid #EDF1F5',
      display: 'flex', flexDirection: 'column',
      padding: '18px 14px 14px',
      overflowY: 'auto',
    }}>
      {/* Mon agenda */}
      <Section title="Mon agenda">
        <Row
          color={TEAM_BY_ID.me.color}
          accent={TEAM_BY_ID.me.accent}
          initials="VO"
          name="Vous"
          subtitle="Andoxa"
          checked={visible.me}
          onToggle={() => onToggle('me')}
        />
        <Row
          color="#475569"
          accent="#F1F5F9"
          icon={<GcalIcon/>}
          name="Google Calendar"
          subtitle="Synchronisé"
          checked={visible.gcal}
          onToggle={() => onToggle('gcal')}
        />
      </Section>

      {/* Mon équipe */}
      <Section title="Mon équipe" badge="4">
        {TEAM.filter(m => !m.isMe).map(m => (
          <Row key={m.id}
            color={m.color}
            accent={m.accent}
            initials={m.initials}
            name={m.name}
            checked={visible[m.id]}
            onToggle={() => onToggle(m.id)}
          />
        ))}
      </Section>

      {/* Externes */}
      <Section title="Externes">
        <Row
          color="#EF4444"
          accent="#FEE2E2"
          icon={<DotIcon color="#EF4444"/>}
          name="Jours fériés France"
          checked={visible.holidays}
          onToggle={() => onToggle('holidays')}
        />
        <Row
          color="#F59E0B"
          accent="#FEF3C7"
          icon={<DotIcon color="#F59E0B"/>}
          name="Vacances scolaires"
          checked={visible.vacances}
          onToggle={() => onToggle('vacances')}
        />
      </Section>

      <div style={{ flex: 1 }}></div>

      {/* Add calendar */}
      <button style={{
        marginTop: 12,
        padding: '9px 12px',
        background: '#fff',
        border: '1px dashed #CBD5E1',
        borderRadius: 8,
        color: '#475569',
        fontSize: 12.5, fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 120ms',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#0052D9';
          e.currentTarget.style.color = '#0052D9';
          e.currentTarget.style.background = '#F8FBFF';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#CBD5E1';
          e.currentTarget.style.color = '#475569';
          e.currentTarget.style.background = '#fff';
        }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Ajouter un agenda
      </button>
    </aside>
  );
}

function Section({ title, badge, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 8,
        padding: '0 4px',
      }}>
        <span style={{
          fontSize: 10.5, fontWeight: 600,
          color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: '#94A3B8',
            background: '#EDF1F5', padding: '0 6px', borderRadius: 999,
          }}>{badge}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ color, accent, initials, icon, name, subtitle, checked, onToggle }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '7px 8px', borderRadius: 7,
      cursor: 'pointer',
      transition: 'background 100ms',
    }}
      onMouseEnter={e => e.currentTarget.style.background = '#fff'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {/* Color checkbox */}
      <span style={{
        width: 16, height: 16, borderRadius: 4,
        background: checked ? color : '#fff',
        border: checked ? `1px solid ${color}` : '1.5px solid #CBD5E1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 120ms',
      }}>
        {checked && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ display: 'none' }}/>

      {/* Icon / initials */}
      {icon ? (
        <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
      ) : (
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: accent, color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9.5, fontWeight: 600,
          flexShrink: 0,
        }}>{initials}</span>
      )}

      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: checked ? '#0F172A' : '#94A3B8', fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        {subtitle && <div style={{ fontSize: 10.5, color: '#94A3B8', lineHeight: 1.2 }}>{subtitle}</div>}
      </span>
    </label>
  );
}

function GcalIcon() {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: 5,
      background: '#fff', border: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: '#4285F4',
      flexShrink: 0,
    }}>G</span>
  );
}

function DotIcon({ color }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%',
      background: 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }}></span>
    </span>
  );
}

Object.assign(window, { CalendarsSidebar });
