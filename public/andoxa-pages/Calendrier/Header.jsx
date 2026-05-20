// Andoxa Calendrier — Top header

function CalHeader({ onCreate }) {
  return (
    <header style={{
      padding: '14px 24px',
      background: '#fff',
      borderBottom: '1px solid #EDF1F5',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 18,
    }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Calendrier</h1>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Semaine du 27 avril — 3 mai 2026</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            { value: '12', label: 'cette semaine', vc: '#0F172A' },
            { value: '3',  label: 'aujourd\'hui',   vc: '#0052D9' },
            { value: '2',  label: 'no-show ce mois', vc: '#DC2626' },
          ].map((f, i) => (
            <button key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 11px',
              background: '#F5F7FA',
              border: '1px solid transparent',
              borderRadius: 999,
              fontSize: 12, color: '#64748B',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <span style={{ fontWeight: 600, color: f.vc, fontVariantNumeric: 'tabular-nums' }}>{f.value}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 11px',
          background: '#F5F7FA', borderRadius: 8,
          fontSize: 12, color: '#94A3B8',
          minWidth: 180,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Rechercher un événement</span>
        </div>
        {/* Create */}
        <button onClick={onCreate} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 13px',
          background: '#0052D9', color: '#fff',
          border: 'none', borderRadius: 8,
          fontSize: 12.5, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 1px 2px rgba(0,82,217,0.28)',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#1A6AFF'}
          onMouseLeave={e => e.currentTarget.style.background = '#0052D9'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Créer un événement
        </button>
      </div>
    </header>
  );
}

Object.assign(window, { CalHeader });
