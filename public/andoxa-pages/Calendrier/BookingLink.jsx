// Andoxa Calendrier — Compact booking-link strip (50px)

function BookingLink() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 14px',
      background: 'rgba(248, 250, 252, 0.6)',
      border: '1px solid #EDF1F5',
      borderRadius: 9,
      fontSize: 12.5,
    }}>
      {/* Left: icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#0F172A', fontWeight: 500, flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span>Lien de booking</span>
      </div>

      {/* Middle: URL + actions */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <code style={{
          fontFamily: 'var(--font-mono, ui-monospace), monospace',
          fontSize: 11.5, color: '#475569',
          background: '#fff', border: '1px solid #EDF1F5',
          padding: '4px 9px', borderRadius: 6,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0,
          maxWidth: 360,
        }}>andoxa.app/book/marie-dubois</code>
        <button style={ghostBtn}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copier
        </button>
        <button style={ghostBtn}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Aperçu
        </button>
      </div>

      {/* Right: counter + customize */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 11.5, color: '#64748B' }}>
          <span style={{ fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>47</span> RDV ce mois
        </span>
        <button style={{
          padding: '6px 11px',
          background: '#fff', color: '#475569',
          border: '1px solid #E2E8F0', borderRadius: 7,
          fontSize: 12, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>Personnaliser</button>
      </div>
    </div>
  );
}

const ghostBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 9px',
  background: 'transparent', color: '#64748B',
  border: 'none', borderRadius: 6,
  fontSize: 11.5, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'inherit',
};

Object.assign(window, { BookingLink });
