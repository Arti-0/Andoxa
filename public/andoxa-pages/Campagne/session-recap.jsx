// Session recap — shown when user clicks "Quitter la session" or finishes all prospects.

function SessionRecap({ open, onClose, onResume, processed, prospects, durationSec, outcomes }) {
  if (!open) return null;

  const total = Object.keys(processed).length;
  const byOutcome = {};
  Object.values(processed).forEach(o => { byOutcome[o.id] = (byOutcome[o.id] || 0) + 1; });

  const rdvCount = byOutcome['rdv'] || 0;
  const callbackCount = byOutcome['callback'] || 0;
  const refusedCount = byOutcome['refused'] || 0;

  const mm = Math.floor(durationSec / 60);
  const avgPerCall = total ? Math.round(durationSec / total / 60 * 10) / 10 : 0;
  const conversionRate = total ? Math.round((rdvCount / total) * 100) : 0;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, animation: 'fadeIn 150ms ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'white', borderRadius: 14,
        width: 'min(720px, 92vw)', maxHeight: '90vh', overflow: 'auto',
        animation: 'modalIn 200ms ease',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999, background: 'var(--neutral-100)', color: 'var(--foreground)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', marginBottom: 8, textTransform: 'uppercase' }}>
                Récapitulatif
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em' }}>Session terminée</h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted-foreground)', marginTop: 4 }}>
                {SESSION_META.campaign} · {mm} min en ligne
              </p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
              {Icon.x({ size: 14 })}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, borderBottom: '1px solid var(--border)' }}>
          <KpiBlock label="Appels" value={total} sub={`/ ${prospects.length} ciblés`}/>
          <KpiBlock label="RDV pris" value={rdvCount} sub={`Conversion ${conversionRate}%`} accent="#16A34A"/>
          <KpiBlock label="À rappeler" value={callbackCount} sub="Replanifié auto"/>
          <KpiBlock label="Durée moyenne" value={avgPerCall + ' min'} sub="Par appel"/>
        </div>

        {/* Outcome breakdown */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.04em', marginBottom: 10 }}>
            Répartition des résultats
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 9999, overflow: 'hidden', background: 'var(--neutral-100)' }}>
            {outcomes.map(o => {
              const count = byOutcome[o.id] || 0;
              const pct = total ? (count / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div key={o.id} title={`${o.label}: ${count}`} style={{ width: `${pct}%`, background: o.color }}/>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
            {outcomes.map(o => {
              const count = byOutcome[o.id] || 0;
              if (count === 0) return null;
              return (
                <div key={o.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.color }}/>
                  <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{o.label}</span>
                  <span style={{ color: 'var(--muted-foreground)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tomorrow */}
        <div style={{ padding: '20px 28px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.04em', marginBottom: 10 }}>
            À faire demain
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <NextItem icon="rotate" label={`${callbackCount} prospect${callbackCount > 1 ? 's' : ''} à rappeler`} sub="Replanifié dans les 48h"/>
            {rdvCount > 0 && <NextItem icon="calendar" label={`${rdvCount} RDV à préparer`} sub="Brief auto envoyé sur le calendrier" accent/>}
            <NextItem icon="users" label={`${prospects.length - total} prospects à reprendre`} sub="Reportés à la prochaine session"/>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onResume} style={{
            padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>Reprendre la session</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>{Icon.download({ size: 13 })} Exporter</button>
            <button style={{
              padding: '8px 16px', borderRadius: 7, border: 'none',
              background: 'var(--foreground)', color: 'white',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Retour aux campagnes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiBlock({ label, value, sub, accent }) {
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: 'var(--neutral-50)',
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.04em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: accent || 'var(--foreground)' }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function NextItem({ icon, label, sub, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 8,
      background: accent ? 'var(--brand-blue-tint)' : 'var(--neutral-50)',
      border: `1px solid ${accent ? '#0052D922' : 'var(--border)'}`,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: accent ? '#0052D9' : 'white',
        color: accent ? 'white' : 'var(--foreground)',
        border: accent ? 'none' : '1px solid var(--border)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{Icon[icon]({ size: 14 })}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

window.SessionRecap = SessionRecap;
