// Andoxa Calendrier — KPI cards row

function KpiCards() {
  const cards = [
    {
      label: "Aujourd'hui",
      value: '5',
      sub: 'RDV programmés',
      detail: '2 réalisés · 3 à venir',
      detailColor: '#0052D9',
    },
    {
      label: 'Cette semaine',
      value: '12',
      sub: 'RDV programmés',
      detail: '78% de taux de réalisation',
      detailColor: '#10B981',
    },
    {
      label: 'Performance 30 jours',
      value: '47',
      sub: 'RDV honorés',
      detail: '+18% vs. mois précédent',
      detailColor: '#10B981',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
      margin: '14px 0',
    }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          background: '#fff',
          border: '1px solid #EDF1F5',
          borderRadius: 10,
          padding: '16px 18px',
        }}>
          <div style={{
            fontSize: 10.5, fontWeight: 600, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 10,
          }}>{c.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontSize: 28, fontWeight: 500, color: '#0F172A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{c.value}</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>{c.sub}</span>
          </div>
          <div style={{ fontSize: 11.5, color: c.detailColor, marginTop: 8, fontWeight: 500 }}>{c.detail}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { KpiCards });
