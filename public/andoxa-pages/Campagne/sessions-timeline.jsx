// Sessions cards grid + Timeline view

function SessionCard({ session, onAction }) {
  const [hover, setHover] = React.useState(false);
  const isRunning = session.status === 'running';
  const isReady = session.status === 'ready';
  const pct = session.total ? (session.processed / session.total) * 100 : 0;

  let primaryBtn;
  if (isReady) primaryBtn = { label: 'Démarrer la session', variant: 'primary', icon: 'play', action: 'start' };
  else if (isRunning) primaryBtn = { label: 'Reprendre', variant: 'primary', icon: 'play', action: 'resume' };
  else primaryBtn = { label: 'Voir les détails', variant: 'secondary', icon: 'eye', action: 'view' };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: isRunning ? '#F5F8FF' : 'white',
        border: `${isRunning ? '1.5px' : '1px'} solid ${isRunning ? '#0052D9' : 'var(--border)'}`,
        borderLeft: isRunning ? '5px solid #0052D9' : '1px solid var(--border)',
        borderRadius: 14,
        padding: 20,
        display: 'flex', flexDirection: 'column', gap: 16,
        transition: 'all 150ms ease',
        boxShadow: hover ? '0 4px 12px -4px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)' : 'none',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
        position: 'relative',
      }}
    >
      {isRunning && (
        <span style={{
          position: 'absolute', top: 16, right: 16,
          width: 8, height: 8, borderRadius: '50%',
          background: '#0052D9',
          boxShadow: '0 0 0 4px rgba(0, 82, 217, 0.18)',
          animation: 'pulse 1.6s ease-in-out infinite',
        }}/>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Session d'appels
          </div>
          <div style={{
            fontSize: 18, fontWeight: 600, marginTop: 4,
            letterSpacing: '-0.02em', color: 'var(--foreground)',
          }}>
            {formatLongDate(session.date)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <StatusBadge status={session.status}/>
            <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>
              · {session.creatorName}
            </span>
          </div>
        </div>
        <ActionMenu campaign={{ ...session, status: 'completed' }} onAction={(a) => onAction(a, session)}/>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
        background: isRunning ? 'rgba(0, 82, 217, 0.10)' : 'var(--border)',
        borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${isRunning ? 'rgba(0, 82, 217, 0.18)' : 'var(--border)'}`,
      }}>
        <Metric label="Prospects" value={`${session.processed}/${session.total}`} sub="traités" tinted={isRunning}/>
        <Metric label="RDV pris" value={session.meetings} accent={session.meetings > 0 ? '#FF6700' : null} tinted={isRunning}/>
        <Metric label="Qualifications" value={session.qualifications} tinted={isRunning}/>
        <Metric label="Taux de décrochage" value={session.pickupRate !== null ? `${session.pickupRate}%` : '—'}
          accent={session.pickupRate !== null && session.pickupRate >= 60 ? '#0E7A3A' : null} tinted={isRunning}/>
      </div>

      {(isRunning || (session.processed > 0 && session.processed < session.total)) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <ProgressBar value={session.processed} max={session.total} color="#0052D9"/>
          <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(pct)}% complété
          </span>
        </div>
      )}

      <Button
        variant={primaryBtn.variant}
        size="md"
        leftIcon={Icon[primaryBtn.icon]({ size: 14 })}
        onClick={() => onAction(primaryBtn.action, session)}
        fullWidth
      >
        {primaryBtn.label}
      </Button>
    </div>
  );
}

function Metric({ label, value, sub, accent, tinted }) {
  return (
    <div style={{ background: tinted ? '#F8FAFF' : 'white', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, letterSpacing: '-0.005em' }}>
        {label}
      </span>
      <span style={{
        fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em',
        color: accent || 'var(--foreground)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
        {sub && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted-foreground)', marginLeft: 4 }}>{sub}</span>}
      </span>
    </div>
  );
}

function SessionsGrid({ sessions, onAction }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
      gap: 16,
    }}>
      {sessions.map(s => <SessionCard key={s.id} session={s} onAction={onAction}/>)}
    </div>
  );
}

// ---------- Timeline ----------
function getDayBucket(iso) {
  if (!iso) return 'older';
  const d = new Date(iso);
  const now = new Date('2026-05-06T12:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  if (d >= today) return 'today';
  if (d >= yest) return 'yesterday';
  if (d >= weekAgo) return 'thisWeek';
  return 'older';
}
const BUCKET_LABELS = {
  today: 'Aujourd\'hui',
  yesterday: 'Hier',
  thisWeek: 'Cette semaine',
  older: 'Plus ancien',
};

function TimelineRow({ item, onAction }) {
  const isCampaign = item.kind === 'campaign';
  const ch = CHANNEL_META[item.channel];
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr 140px 140px 110px 36px',
        alignItems: 'center', gap: 14,
        padding: '10px 14px',
        background: hover ? 'var(--neutral-50)' : 'transparent',
        borderRadius: 8,
        transition: 'background 100ms',
        cursor: 'pointer',
      }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${ch.color}15`, color: ch.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {Icon[ch.icon]({ size: 16 })}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 13.5, fontWeight: 500, color: 'var(--foreground)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{item.name}</span>
          {isCampaign && <TypeBadge type={item.type}/>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 2 }}>
          {isCampaign ? `${item.processed}/${item.total} traités · ${item.meetings} RDV` : `${item.processed}/${item.total} appels · ${item.meetings} RDV`}
          {' · '}{item.creatorName}
        </div>
      </div>
      <div>
        <ChannelPill channel={item.channel}/>
      </div>
      <div>
        <StatusBadge status={item.status}/>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>
        {formatRelativeDate(item.launchedAt || item.date)}
      </div>
      <ActionMenu campaign={item} onAction={onAction}/>
    </div>
  );
}

function Timeline({ items, onAction }) {
  const buckets = { today: [], yesterday: [], thisWeek: [], older: [] };
  items.forEach(it => {
    const date = it.launchedAt || it.date;
    buckets[getDayBucket(date)].push(it);
  });
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {Object.keys(buckets).map(bucket => {
        if (buckets[bucket].length === 0) return null;
        return (
          <div key={bucket}>
            <div style={{
              padding: '10px 14px', fontSize: 11.5, fontWeight: 600,
              color: 'var(--muted-foreground)', letterSpacing: '0.04em',
              textTransform: 'uppercase', background: 'var(--neutral-50)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {BUCKET_LABELS[bucket]}
              <span style={{ fontWeight: 500, color: 'var(--muted-foreground)', opacity: 0.7 }}>
                · {buckets[bucket].length}
              </span>
            </div>
            <div style={{ padding: 6 }}>
              {buckets[bucket].map(it => <TimelineRow key={it.id} item={it} onAction={onAction}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.SessionsGrid = SessionsGrid;
window.Timeline = Timeline;
