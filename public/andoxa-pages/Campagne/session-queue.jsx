// Queue rail — left column, 320px. Sober list with status dots, LinkedIn icon.

function QueueRail({ prospects, currentIdx, statuses, onJump, onPrev, onNext, hasPrev, hasNext, filter, setFilter, search, setSearch, searchRef }) {
  const filtered = prospects.map((p, i) => ({ p, i })).filter(({ p }) => {
    const st = statuses[p.id]?.id;
    if (filter === 'todo' && st) return false;
    if (filter === 'done' && !st) return false;
    if (filter === 'rdv' && st !== 'rdv') return false;
    if (filter === 'callback' && st !== 'callback') return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${p.firstName} ${p.lastName} ${p.company}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const remaining = prospects.filter(p => !statuses[p.id]).length;
  const completedCount = prospects.length - remaining;
  const pct = (completedCount / prospects.length) * 100;

  const STATUS_DOT = {
    rdv:      '#5B2EBF',
    callback: '#D97706',
    noanswer: '#6B7280',
    wrong:    '#DC2626',
    refused:  '#991B1B',
  };
  const STATUS_LABEL = {
    rdv: 'RDV', callback: 'À rappeler', noanswer: 'Pas de réponse', wrong: 'Mauvais n°', refused: 'Refus',
  };

  const filters = [
    { id: 'all',      label: 'Tous' },
    { id: 'todo',     label: 'À appeler' },
    { id: 'done',     label: 'Traités' },
    { id: 'rdv',      label: 'RDV' },
    { id: 'callback', label: 'À rappeler' },
  ];

  // Auto-scroll current into view
  const listRef = React.useRef(null);
  React.useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${currentIdx}"]`);
    if (el && listRef.current) {
      const ct = listRef.current.getBoundingClientRect();
      const et = el.getBoundingClientRect();
      if (et.top < ct.top || et.bottom > ct.bottom) {
        listRef.current.scrollTop += (et.top - ct.top) - 80;
      }
    }
  }, [currentIdx]);

  return (
    <aside style={{
      width: 320, flexShrink: 0,
      background: 'white',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>File d'appels</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
            {currentIdx + 1} / {prospects.length}
          </div>
        </div>
        <div style={{ height: 3, background: 'var(--neutral-100)', borderRadius: 9999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#0052D9' }}/>
        </div>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 9px', borderRadius: 7,
          background: 'var(--neutral-50)', border: '1px solid var(--border)',
        }}>
          <span style={{ color: 'var(--muted-foreground)', display: 'flex' }}>{Icon.search({ size: 13 })}</span>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 12.5, color: 'var(--foreground)',
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'white', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>/</span>
        </div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {filters.map(f => {
            const active = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '3px 8px', borderRadius: 9999,
                border: `1px solid ${active ? '#0052D9' : 'var(--border)'}`,
                background: active ? 'var(--brand-blue-tint)' : 'white',
                color: active ? '#0052D9' : 'var(--muted-foreground)',
                fontSize: 11.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
              }}>{f.label}</button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--muted-foreground)' }}>
            Aucun prospect
          </div>
        )}
        {filtered.map(({ p, i }) => {
          const isCurrent = i === currentIdx;
          const st = statuses[p.id];
          const dotColor = st ? STATUS_DOT[st.id] : (isCurrent ? '#0052D9' : 'var(--neutral-200)');
          const initials = p.firstName[0] + p.lastName[0];

          return (
            <div
              key={p.id}
              data-idx={i}
              onClick={() => onJump(i)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px 10px 11px',
                background: isCurrent ? 'var(--brand-blue-tint)' : 'transparent',
                borderLeft: isCurrent ? '3px solid #0052D9' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'background 100ms',
              }}
              onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = 'var(--neutral-50)'; }}
              onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Status dot */}
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: dotColor,
                marginTop: 8, flexShrink: 0,
              }}/>
              {/* Order # */}
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums', minWidth: 14, marginTop: 5, fontWeight: 500 }}>
                {i + 1}
              </span>
              {/* Avatar */}
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'var(--neutral-100)', color: 'var(--foreground)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
              }}>{initials}</span>
              {/* Name + company */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: isCurrent ? 600 : 500, letterSpacing: '-0.005em',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  color: 'var(--foreground)',
                }}>
                  {p.firstName} {p.lastName}
                </div>
                <div style={{
                  fontSize: 11.5, color: 'var(--muted-foreground)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  marginTop: 1,
                }}>
                  {p.company}
                </div>
                {st && (
                  <div style={{ fontSize: 10.5, color: STATUS_DOT[st.id], fontWeight: 600, marginTop: 3 }}>
                    {STATUS_LABEL[st.id]}{st.time ? ` à ${st.time}` : ''}
                  </div>
                )}
              </div>
              {/* LinkedIn */}
              {p.linkedin ? (
                <a
                  href={p.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Voir le profil LinkedIn"
                  style={{
                    width: 24, height: 24, borderRadius: 5,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0A66C2', flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#EDF6FF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {Icon.linkedin({ size: 14 })}
                </a>
              ) : (
                <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-200)', flexShrink: 0 }}>
                  {Icon.linkedin({ size: 14 })}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border)',
        background: 'var(--neutral-50)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <button onClick={onPrev} disabled={!hasPrev} style={{
          padding: '6px 10px', borderRadius: 6,
          border: '1px solid var(--border)', background: 'white',
          fontSize: 12, fontWeight: 500, color: 'var(--foreground)',
          cursor: hasPrev ? 'pointer' : 'not-allowed', opacity: hasPrev ? 1 : 0.4,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>{Icon.arrowLeft({ size: 12 })} Préc.</button>
        <button onClick={onNext} disabled={!hasNext} style={{
          padding: '6px 10px', borderRadius: 6,
          border: 'none', background: '#0052D9', color: 'white',
          fontSize: 12, fontWeight: 600,
          cursor: hasNext ? 'pointer' : 'not-allowed', opacity: hasNext ? 1 : 0.4,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>Suivant {Icon.arrowRight({ size: 12 })}</button>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>
          Restants : <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{remaining}</strong>
        </span>
      </div>
    </aside>
  );
}

window.QueueRail = QueueRail;
