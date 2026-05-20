// Qualification bar — sticky bottom. 5 outcomes + prev/skip + auto-advance toggle.

function QualificationBar({ onPick, onSkip, onPrev, hasPrev, hasNext, onCallback, autoAdvance, setAutoAdvance }) {
  const items = [
    { id: 'rdv',      label: 'RDV pris',       color: '#5B2EBF', shortcut: 'R' },
    { id: 'callback', label: 'À rappeler',     color: '#D97706', shortcut: 'A' },
    { id: 'noanswer', label: 'Pas de réponse', color: '#6B7280', shortcut: 'P' },
    { id: 'wrong',    label: 'Mauvais numéro', color: '#DC2626', shortcut: 'M' },
    { id: 'refused',  label: 'Refus',          color: '#991B1B', shortcut: 'F' },
  ];
  return (
    <div style={{
      flexShrink: 0,
      background: 'white',
      borderTop: '1px solid var(--border)',
      padding: '10px 22px 10px',
      display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 -4px 16px -8px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', marginRight: 4 }}>
          Qualifier
        </span>
        {items.map(o => (
          <button key={o.id} onClick={() => o.id === 'callback' ? onCallback(o) : onPick(o)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '7px 11px', borderRadius: 9999,
            border: '1px solid var(--border)', background: 'white',
            fontSize: 12.5, fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer',
            transition: 'all 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = o.color; e.currentTarget.style.background = o.color + '0D'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'white'; }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: o.color }}/>
            {o.label}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--neutral-100)', color: 'var(--muted-foreground)', fontWeight: 600 }}>
              {o.shortcut}
            </span>
          </button>
        ))}
        <div style={{ flex: 1 }}/>
        <button onClick={onPrev} disabled={!hasPrev} title="Précédent" style={{
          width: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)',
          background: 'white', cursor: hasPrev ? 'pointer' : 'not-allowed',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted-foreground)', opacity: hasPrev ? 1 : 0.4,
        }}>{Icon.arrowLeft({ size: 13 })}</button>
        <button onClick={onSkip} disabled={!hasNext} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 7,
          border: '1px solid var(--border)', background: 'white',
          fontSize: 12.5, fontWeight: 500, color: 'var(--foreground)',
          cursor: hasNext ? 'pointer' : 'not-allowed', opacity: hasNext ? 1 : 0.4,
        }}>Passer {Icon.arrowRight({ size: 12 })}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--neutral-100)', color: 'var(--muted-foreground)', fontWeight: 600 }}>Esp.</span>
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 11.5, color: 'var(--muted-foreground)' }}>
          <span
            onClick={() => setAutoAdvance(!autoAdvance)}
            style={{
              width: 26, height: 14, borderRadius: 9999,
              background: autoAdvance ? '#0052D9' : 'var(--neutral-200)',
              position: 'relative', transition: 'background 150ms',
            }}>
            <span style={{
              position: 'absolute', top: 1, left: autoAdvance ? 13 : 1,
              width: 12, height: 12, borderRadius: '50%', background: 'white',
              transition: 'left 150ms',
            }}/>
          </span>
          Passer auto au suivant après qualification
        </label>
      </div>
    </div>
  );
}

window.QualificationBar = QualificationBar;
