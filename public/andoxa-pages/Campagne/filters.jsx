// Filters bar — channel, status, period, creator

const CHANNEL_OPTIONS = [
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { id: 'phone',    label: 'Téléphone', icon: 'phone' },
];
const STATUS_OPTIONS = [
  { id: 'running',   label: 'En cours' },
  { id: 'paused',    label: 'En pause' },
  { id: 'completed', label: 'Terminée' },
  { id: 'failed',    label: 'Échouée' },
  { id: 'draft',     label: 'Brouillon' },
  { id: 'ready',     label: 'Prête' },
];
const PERIOD_OPTIONS = [
  { id: '7',  label: '7 jours' },
  { id: '30', label: '30 jours' },
  { id: '90', label: '90 jours' },
  { id: 'all',label: 'Tout' },
];

function MultiSelectDropdown({ label, icon, options, selected, onChange, renderOption }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else onChange([...selected, id]);
  };
  const summary = selected.length === 0
    ? 'Tous'
    : selected.length === 1
      ? options.find(o => o.id === selected[0])?.label
      : `${selected.length} sélectionnés`;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: selected.length > 0 ? 'var(--brand-blue-tint)' : 'white',
          border: `1px solid ${selected.length > 0 ? 'var(--brand-blue)' : 'var(--border)'}`,
          color: selected.length > 0 ? 'var(--brand-blue-dark)' : 'var(--foreground)',
          borderRadius: 8, padding: '6px 10px', fontSize: 13,
          fontWeight: 500, cursor: 'pointer', height: 34,
          transition: 'all 120ms',
        }}
      >
        {icon && <span style={{ display: 'flex', opacity: 0.7 }}>{Icon[icon]({ size: 14 })}</span>}
        <span>{label}</span>
        <span style={{
          fontSize: 12, color: selected.length > 0 ? 'var(--brand-blue-dark)' : 'var(--muted-foreground)',
          fontWeight: 500,
        }}>: {summary}</span>
        <span style={{ display: 'flex', opacity: 0.6, marginLeft: 2 }}>{Icon.chevDown({ size: 12 })}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 10, padding: 4, zIndex: 50,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 10px -3px rgba(0,0,0,0.04)',
          minWidth: 200,
          animation: 'menuIn 120ms ease',
        }}>
          {options.map(opt => {
            const isSel = selected.includes(opt.id);
            return (
              <div key={opt.id} onClick={() => toggle(opt.id)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-50)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 13,
                }}>
                <Checkbox checked={isSel} onChange={() => toggle(opt.id)} size={15}/>
                {renderOption ? renderOption(opt) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    {opt.icon && <span style={{ color: opt.id === 'linkedin' ? '#0A66C2' : opt.id === 'whatsapp' ? '#25D366' : '#0052D9', display: 'flex' }}>{Icon[opt.icon]({ size: 14 })}</span>}
                    {opt.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PeriodDropdown({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const current = PERIOD_OPTIONS.find(o => o.id === value);
  const isActive = value !== 'all';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: isActive ? 'var(--brand-blue-tint)' : 'white',
        border: `1px solid ${isActive ? 'var(--brand-blue)' : 'var(--border)'}`,
        color: isActive ? 'var(--brand-blue-dark)' : 'var(--foreground)',
        borderRadius: 8, padding: '6px 10px', fontSize: 13,
        fontWeight: 500, cursor: 'pointer', height: 34,
      }}>
        <span style={{ display: 'flex', opacity: 0.7 }}>{Icon.calendar({ size: 14 })}</span>
        <span>Période</span>
        <span style={{
          fontSize: 12, fontWeight: 500,
          color: isActive ? 'var(--brand-blue-dark)' : 'var(--muted-foreground)',
        }}>: {current.label}</span>
        <span style={{ display: 'flex', opacity: 0.6 }}>{Icon.chevDown({ size: 12 })}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 10, padding: 4, zIndex: 50,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          minWidth: 180,
        }}>
          {PERIOD_OPTIONS.map(opt => (
            <div key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                fontWeight: opt.id === value ? 600 : 400,
                color: opt.id === value ? 'var(--brand-blue)' : 'var(--foreground)',
              }}>
              {opt.label}
              {opt.id === value && Icon.check({ size: 14 })}
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}/>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            color: 'var(--muted-foreground)',
          }}>
            {Icon.calendar({ size: 14 })}
            Personnalisé...
          </div>
        </div>
      )}
    </div>
  );
}

function CreatorDropdown({ selected, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  // Convention: empty selected[] === "Tous" (all selected). Subset === some unchecked.
  const allIds = CREATORS.map(c => c.id);
  const isAll = selected.length === 0 || selected.length === allIds.length;
  const isActive = !isAll;
  let summary;
  if (isAll) summary = 'Tous';
  else if (selected.length === 1) summary = CREATORS.find(c => c.id === selected[0])?.name;
  else summary = `${selected.length} sur ${allIds.length}`;

  const isChecked = (id) => isAll || selected.includes(id);
  const toggle = (id) => {
    const current = isAll ? [...allIds] : [...selected];
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    // Collapse "all selected" back to []
    onChange(next.length === allIds.length ? [] : next);
  };
  const checkAll = () => onChange([]);
  const uncheckAll = () => onChange([]); // empty === all per convention; semantically there's no "none" state
  const filtered = CREATORS.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: isActive ? 'var(--brand-blue-tint)' : 'white',
        border: `1px solid ${isActive ? 'var(--brand-blue)' : 'var(--border)'}`,
        color: isActive ? 'var(--brand-blue-dark)' : 'var(--foreground)',
        borderRadius: 8, padding: '6px 10px', fontSize: 13,
        fontWeight: 500, cursor: 'pointer', height: 34,
      }}>
        <span>Créateur</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? 'var(--brand-blue-dark)' : 'var(--muted-foreground)' }}>: {summary}</span>
        <span style={{ display: 'flex', opacity: 0.6 }}>{Icon.chevDown({ size: 12 })}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 10, padding: 4, zIndex: 50,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', minWidth: 240,
        }}>
          <div style={{ padding: '6px 8px 4px', position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--muted-foreground)', display: 'flex', pointerEvents: 'none',
            }}>{Icon.search({ size: 12 })}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              style={{
                width: '100%', height: 28, padding: '0 8px 0 26px',
                border: '1px solid var(--border)', borderRadius: 6,
                fontSize: 12.5, fontFamily: 'var(--font-sans)', outline: 'none',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--brand-blue)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 10px 6px', borderBottom: '1px solid var(--border)', marginBottom: 2,
          }}>
            <button onClick={checkAll} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 11.5, fontWeight: 600, color: 'var(--brand-blue)', padding: '2px 4px',
            }}>Tout cocher</button>
            <button onClick={() => onChange(allIds.slice(0, 1))} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 11.5, fontWeight: 500, color: 'var(--muted-foreground)', padding: '2px 4px',
            }}>Inverser</button>
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: '12px 10px', fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'center' }}>
              Aucun résultat
            </div>
          )}
          {filtered.map(c => {
            const isSel = isChecked(c.id);
            return (
              <div key={c.id}
                onClick={() => toggle(c.id)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-50)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                }}>
                <Checkbox checked={isSel} onChange={() => {}} size={15}/>
                <Avatar creator={c} size={20}/>
                {c.name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FiltersBar({ filters, setFilters, totalCount, filteredCount }) {
  const hasActive = filters.channels.length > 0 || filters.statuses.length > 0
    || filters.period !== 'all' || filters.creators.length > 0;
  const reset = () => setFilters({ channels: [], statuses: [], period: 'all', creators: [] });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      padding: '12px 0',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-foreground)', marginRight: 4 }}>
        {Icon.filter({ size: 14 })}
        Filtres
      </span>
      <MultiSelectDropdown
        label="Canal" icon="sliders"
        options={CHANNEL_OPTIONS}
        selected={filters.channels}
        onChange={(v) => setFilters({ ...filters, channels: v })}
      />
      <MultiSelectDropdown
        label="Statut"
        options={STATUS_OPTIONS}
        selected={filters.statuses}
        onChange={(v) => setFilters({ ...filters, statuses: v })}
        renderOption={(opt) => <StatusBadge status={opt.id} size="sm"/>}
      />
      <PeriodDropdown
        value={filters.period}
        onChange={(v) => setFilters({ ...filters, period: v })}
      />
      <CreatorDropdown
        selected={filters.creators}
        onChange={(v) => setFilters({ ...filters, creators: v })}
      />
      {hasActive && (
        <button onClick={reset} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none', color: 'var(--muted-foreground)',
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
          padding: '4px 8px', borderRadius: 6, height: 34,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--foreground)'; e.currentTarget.style.background = 'var(--neutral-50)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)'; e.currentTarget.style.background = 'transparent'; }}>
          {Icon.rotate({ size: 13 })}
          Réinitialiser
        </button>
      )}
      <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
        <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{filteredCount}</strong> résultats sur {totalCount}
      </div>
    </div>
  );
}

window.FiltersBar = FiltersBar;
