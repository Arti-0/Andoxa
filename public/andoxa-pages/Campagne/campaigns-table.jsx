// Campagnes table — main listing view

const TYPE_PERF = {
  invitation: (c) => {
    if (c.processed === 0) return null;
    const rate = (c.accepted / c.processed) * 100;
    const tier = rate > 30 ? 'high' : rate >= 15 ? 'mid' : 'low';
    return { rate: rate.toFixed(0), label: 'acceptation', tier };
  },
  message: (c) => {
    if (c.processed === 0) return null;
    const rate = (c.replied / c.processed) * 100;
    const tier = rate > 30 ? 'high' : rate >= 15 ? 'mid' : 'low';
    return { rate: rate.toFixed(0), label: 'réponse', tier };
  },
  invitation_message: (c) => {
    if (c.processed === 0) return null;
    const rate = (c.replied / c.processed) * 100;
    const tier = rate > 30 ? 'high' : rate >= 15 ? 'mid' : 'low';
    return { rate: rate.toFixed(0), label: 'réponse', tier };
  },
  whatsapp_message: (c) => {
    if (c.processed === 0) return null;
    const rate = (c.replied / c.processed) * 100;
    const tier = rate > 30 ? 'high' : rate >= 15 ? 'mid' : 'low';
    return { rate: rate.toFixed(0), label: 'réponse', tier };
  },
};

const PERF_COLORS = {
  high: { fg: '#0E7A3A', bg: '#E8F4EC' },
  mid:  { fg: '#5B6072', bg: '#F1F2F4' },
  low:  { fg: '#A8221C', bg: '#FDECEC' },
};

function PerfInline({ campaign }) {
  const fn = TYPE_PERF[campaign.type];
  if (!fn) return <span style={{ color: 'var(--muted-foreground)' }}>—</span>;
  const perf = fn(campaign);
  if (!perf) return <span style={{ color: 'var(--muted-foreground)' }}>—</span>;
  const c = PERF_COLORS[perf.tier];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 13, fontWeight: 600, color: c.fg,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {perf.rate}% <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--muted-foreground)' }}>{perf.label}</span>
      </span>
      {campaign.meetings > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 11.5, color: 'var(--muted-foreground)',
        }}>
          {Icon.calendar({ size: 11 })} {campaign.meetings} RDV
        </span>
      )}
    </div>
  );
}

const STATUS_ACTIONS = {
  running:   ['view', 'pause', 'duplicate', 'delete'],
  paused:    ['view', 'resume', 'duplicate', 'delete'],
  completed: ['view', 'duplicate', 'delete'],
  failed:    ['view', 'duplicate', 'delete'],
  draft:     ['view', 'launch', 'duplicate', 'delete'],
};
const ACTION_LABELS = {
  view: { label: 'Voir', icon: 'eye' },
  pause: { label: 'Mettre en pause', icon: 'pause' },
  resume: { label: 'Reprendre', icon: 'play' },
  launch: { label: 'Lancer', icon: 'play' },
  duplicate: { label: 'Dupliquer', icon: 'copy' },
  delete: { label: 'Supprimer', icon: 'trash', destructive: true },
};

function ActionMenu({ campaign, onAction }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const actions = STATUS_ACTIONS[campaign.status] || ['view', 'duplicate', 'delete'];
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          width: 28, height: 28, borderRadius: 6,
          border: 'none', background: open ? 'var(--neutral-100)' : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--muted-foreground)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}>
        {Icon.more({ size: 16 })}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 8, padding: 4, zIndex: 80,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)', minWidth: 180,
          animation: 'menuIn 120ms ease',
        }}>
          {actions.map((a, i) => {
            const meta = ACTION_LABELS[a];
            const isLast = i === actions.length - 1;
            const isDestructive = meta.destructive;
            return (
              <React.Fragment key={a}>
                {isDestructive && actions.length > 1 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}/>}
                <div onClick={() => { setOpen(false); onAction(a, campaign); }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isDestructive ? '#FDECEC' : 'var(--neutral-50)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                    fontSize: 13, color: isDestructive ? 'var(--color-destructive)' : 'var(--foreground)',
                  }}>
                  <span style={{ display: 'flex', opacity: 0.7 }}>{Icon[meta.icon]({ size: 14 })}</span>
                  {meta.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CampaignsTable({ items, selected, setSelected, onAction, sortBy, setSortBy, flashedId }) {
  const allSelected = items.length > 0 && items.every(c => selected.includes(c.id));
  const someSelected = !allSelected && items.some(c => selected.includes(c.id));
  const toggleAll = () => setSelected(allSelected ? [] : items.map(c => c.id));
  const toggleOne = (id) => setSelected(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  const SortHeader = ({ id, children, align = 'left' }) => {
    const active = sortBy.field === id;
    return (
      <th onClick={() => setSortBy({ field: id, dir: active && sortBy.dir === 'desc' ? 'asc' : 'desc' })}
        style={{
          textAlign: align, padding: '0 14px', height: 38,
          fontSize: 11.5, fontWeight: 600, color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
          letterSpacing: '0.02em', textTransform: 'uppercase', cursor: 'pointer',
          userSelect: 'none', whiteSpace: 'nowrap',
          background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--border)',
        }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {children}
          <span style={{ opacity: active ? 1 : 0.3, display: 'flex' }}>
            {active && sortBy.dir === 'asc' ? Icon.chevUp({ size: 11 }) : Icon.chevDown({ size: 11 })}
          </span>
        </span>
      </th>
    );
  };

  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 42 }}/>
          <col/>
          <col style={{ width: 130 }}/>
          <col style={{ width: 170 }}/>
          <col style={{ width: 200 }}/>
          <col style={{ width: 140 }}/>
          <col style={{ width: 120 }}/>
          <col style={{ width: 120 }}/>
          <col style={{ width: 56 }}/>
        </colgroup>
        <thead>
          <tr>
            <th style={{
              padding: '0 0 0 14px', height: 38, background: 'var(--neutral-50)',
              borderBottom: '1px solid var(--border)',
            }}>
              <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll}/>
            </th>
            <SortHeader id="name">Campagne</SortHeader>
            <SortHeader id="channel">Canal</SortHeader>
            <SortHeader id="type">Type</SortHeader>
            <SortHeader id="progress">Progression</SortHeader>
            <SortHeader id="performance">Performance</SortHeader>
            <SortHeader id="status">Statut</SortHeader>
            <SortHeader id="launchedAt">Lancée</SortHeader>
            <th style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)' }}/>
          </tr>
        </thead>
        <tbody>
          {items.map((c, i) => {
            const isSelected = selected.includes(c.id);
            const ch = CHANNEL_META[c.channel];
            return (
              <tr key={c.id}
                onMouseEnter={(e) => { if (!isSelected && c.id !== flashedId) e.currentTarget.style.background = 'var(--neutral-50)'; }}
                onMouseLeave={(e) => { if (!isSelected && c.id !== flashedId) e.currentTarget.style.background = 'white'; }}
                style={{
                  background: c.id === flashedId ? 'rgba(255, 103, 0, 0.12)' : isSelected ? 'var(--brand-blue-tint)' : 'white',
                  borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--border)',
                  transition: 'background 600ms',
                }}>
                <td style={{ padding: '14px 0 14px 14px' }}>
                  <Checkbox checked={isSelected} onChange={() => toggleOne(c.id)}/>
                </td>
                <td style={{ padding: '14px' }}>
                  <a href="#" onClick={(e) => e.preventDefault()} style={{
                    fontSize: 13.5, fontWeight: 500, color: 'var(--foreground)',
                    textDecoration: 'none', display: 'block',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-blue)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground)'}
                  title={c.name}>
                    {c.name}
                  </a>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Avatar creator={CREATORS.find(x => x.id === c.creator)} size={16}/>
                    <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>
                      {c.creatorName} · {c.total} prospects
                    </span>
                  </div>
                </td>
                <td style={{ padding: '14px' }}>
                  <ChannelPill channel={c.channel}/>
                </td>
                <td style={{ padding: '14px' }}>
                  <TypeBadge type={c.type}/>
                </td>
                <td style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <ProgressBar value={c.processed} max={c.total} color={c.status === 'failed' ? '#DC2626' : ch.color}/>
                    <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                      {c.processed}/{c.total} prospects traités
                    </span>
                  </div>
                </td>
                <td style={{ padding: '14px' }}>
                  <PerfInline campaign={c}/>
                </td>
                <td style={{ padding: '14px' }}>
                  <StatusBadge status={c.status}/>
                </td>
                <td style={{ padding: '14px', fontSize: 12.5, color: 'var(--muted-foreground)' }}>
                  {formatRelativeDate(c.launchedAt)}
                </td>
                <td style={{ padding: '14px 14px 14px 0', textAlign: 'right' }}>
                  <ActionMenu campaign={c} onAction={onAction}/>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

window.CampaignsTable = CampaignsTable;
