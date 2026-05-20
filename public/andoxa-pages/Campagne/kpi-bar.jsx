// KPI Bar — top of page

const PERIOD_LABELS = {
  '7':   { vsLabel: 'vs 7j préc.',    horizon: 'sur les 7 derniers jours',  fullLabel: '7 derniers jours' },
  '30':  { vsLabel: 'vs 30j préc.',   horizon: 'sur les 30 derniers jours', fullLabel: '30 derniers jours' },
  '90':  { vsLabel: 'vs 90j préc.',   horizon: 'sur les 90 derniers jours', fullLabel: '90 derniers jours' },
  'all': { vsLabel: 'vs période préc.', horizon: 'sur toute la période',    fullLabel: 'toute la période' },
};

// Compute KPI values for a given period & creator selection.
// When creators is empty → "Tous" → use raw values.
// When subset selected → scale by sum of CREATOR_KPI_SHARE for those creators.
function computeKpis(period, selectedCreators) {
  const ds = KPI_DATASETS[period] || KPI_DATASETS['7'];
  const allCreatorIds = CREATORS.map(c => c.id);
  const isAll = selectedCreators.length === 0 || selectedCreators.length === allCreatorIds.length;
  const share = isAll ? 1 : selectedCreators.reduce((s, id) => s + (CREATOR_KPI_SHARE[id] || 0), 0);
  const scale = (n) => n === null ? null : Math.round(n * share);
  const scaleFloat = (n) => n === null ? null : Math.round(n * share * 10) / 10;

  return {
    invitations: {
      value: scale(ds.invitations.value),
      delta: ds.invitations.delta,
      spark: ds.invitations.spark.map(v => Math.round(v * share)),
    },
    acceptanceRate: {
      // Rate stays roughly stable regardless of creator subset (it's a ratio).
      value: ds.acceptanceRate.value,
      unit: '%',
      delta: ds.acceptanceRate.delta,
      spark: ds.acceptanceRate.spark,
    },
    messages: {
      value: scale(ds.messages.value),
      delta: ds.messages.delta,
      spark: ds.messages.spark.map(v => Math.round(v * share)),
    },
    meetings: {
      value: scale(ds.meetings.value),
      delta: ds.meetings.delta,
      spark: ds.meetings.spark.map(v => Math.round(v * share)),
    },
    calls: {
      value: scale(ds.calls.value),
      delta: ds.calls.delta,
      spark: ds.calls.spark.map(v => Math.round(v * share)),
    },
  };
}

// Smooth count-up hook — animates to target over ~400ms
function useAnimatedNumber(target) {
  const [val, setVal] = React.useState(target);
  const fromRef = React.useRef(target);
  React.useEffect(() => {
    if (target === null || target === undefined) { setVal(target); return; }
    const from = fromRef.current ?? target;
    const to = target;
    if (from === to) return;
    const duration = 420;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setVal(Math.round(v));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return val;
}

function KpiCard({ label, value, unit, delta, spark, tooltip, color = '#0052D9', vsLabel }) {
  const [hover, setHover] = React.useState(false);
  const animated = useAnimatedNumber(value);
  const isUp = delta > 0;
  const isFlat = delta === 0 || delta === null || delta === undefined;
  const deltaColor = isFlat ? 'var(--muted-foreground)' : isUp ? '#0E7A3A' : '#A8221C';
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 18px 14px',
        display: 'flex', flexDirection: 'column', gap: 2,
        flex: 1, minWidth: 0,
        transition: 'border-color 120ms, box-shadow 120ms',
        borderColor: hover ? 'var(--neutral-200)' : 'var(--border)',
        boxShadow: hover ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          fontSize: 12.5, color: 'var(--muted-foreground)', fontWeight: 500,
          letterSpacing: '-0.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</span>
        <span style={{
          color: 'var(--muted-foreground)', display: 'flex', cursor: 'help',
          opacity: 0.5,
        }} title={tooltip}>{Icon.info({ size: 13 })}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <span style={{
          fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em',
          color: 'var(--foreground)', lineHeight: 1.05,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {animated === null || animated === undefined ? '—' : animated.toLocaleString('fr-FR')}
        </span>
        {unit && <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--muted-foreground)' }}>{unit}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 12 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 12, fontWeight: 600, color: deltaColor,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {!isFlat && (isUp ? Icon.arrowUp({ size: 11 }) : Icon.arrowDown({ size: 11 }))}
          {delta === null || delta === undefined ? '—' : isFlat ? '— stable' : `${Math.abs(delta).toFixed(1)}%`}
          <span style={{ color: 'var(--muted-foreground)', fontWeight: 400, marginLeft: 2 }}>{vsLabel}</span>
        </span>
        <Sparkline data={spark} color={color} width={78} height={26}/>
      </div>
      {hover && tooltip && (
        <div style={{
          position: 'absolute', top: 8, right: 12, transform: 'translateY(-100%)',
          background: 'var(--neutral-950)', color: 'white',
          padding: '6px 10px', borderRadius: 6, fontSize: 11.5,
          whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none',
        }}>{tooltip}</div>
      )}
    </div>
  );
}

function KpiBar({ period = '7', creators = [] }) {
  const kpis = React.useMemo(() => computeKpis(period, creators), [period, creators]);
  const labels = PERIOD_LABELS[period] || PERIOD_LABELS['7'];
  const horizon = labels.horizon;
  const vsLabel = labels.vsLabel;

  // Creator-scope hint
  const allCreatorIds = CREATORS.map(c => c.id);
  const isAllCreators = creators.length === 0 || creators.length === allCreatorIds.length;
  const creatorScope = isAllCreators
    ? 'toute l\'équipe'
    : creators.length === 1
      ? CREATORS.find(c => c.id === creators[0])?.name
      : `${creators.length} créateurs`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11.5, color: 'var(--muted-foreground)',
        fontWeight: 500, letterSpacing: '0.01em',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {Icon.calendar({ size: 12 })}
          Indicateurs <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{horizon}</strong>
        </span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>{creatorScope}</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: 12,
      }}>
        <KpiCard
          label="Invitations LinkedIn"
          value={kpis.invitations.value}
          delta={kpis.invitations.delta}
          spark={kpis.invitations.spark}
          color="#0A66C2"
          vsLabel={vsLabel}
          tooltip={`Invitations LinkedIn envoyées ${horizon}`}
        />
        <KpiCard
          label="Taux d'acceptation"
          value={kpis.acceptanceRate.value}
          unit="%"
          delta={kpis.acceptanceRate.delta}
          spark={kpis.acceptanceRate.spark}
          color="#0E7A3A"
          vsLabel={vsLabel}
          tooltip={`% d'invitations acceptées ${horizon}`}
        />
        <KpiCard
          label="Messages envoyés"
          value={kpis.messages.value}
          delta={kpis.messages.delta}
          spark={kpis.messages.spark}
          color="#0052D9"
          vsLabel={vsLabel}
          tooltip={`LinkedIn + WhatsApp combinés, ${horizon}`}
        />
        <KpiCard
          label="RDV bookés"
          value={kpis.meetings.value}
          delta={kpis.meetings.delta}
          spark={kpis.meetings.spark}
          color="#FF6700"
          vsLabel={vsLabel}
          tooltip={`Rendez-vous générés depuis les campagnes, ${horizon}`}
        />
        <KpiCard
          label="Appels passés"
          value={kpis.calls.value}
          delta={kpis.calls.delta}
          spark={kpis.calls.spark}
          color="#5B2EBF"
          vsLabel={vsLabel}
          tooltip={`Total des appels passés en sessions, ${horizon}`}
        />
      </div>
    </div>
  );
}

window.KpiBar = KpiBar;
