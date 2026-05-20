// Cockpit — refonte 3 sections : Identité / Pipeline / Activité clé.
const sectionStyle = { padding: '22px 20px', borderBottom: '1px solid var(--slate-150)' };

function MiniStepper({ stage }) {
  const order = window.AndoxaData.PIPELINE_ORDER;
  const stages = window.AndoxaData.STAGES;
  const idx = order.indexOf(stage);
  return (
    <div style={{display:'flex', alignItems:'flex-start', gap: 0, marginTop: 4}}>
      {order.map((k, i) => {
        const isPast = i < idx;
        const isActive = i === idx;
        const s = stages[k];
        return (
          <React.Fragment key={k}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink: 0, width: 50}}>
              <div className="stepper-dot" style={{
                background: isActive ? 'var(--andoxa-blue)' : isPast ? 'var(--andoxa-blue-100)' : 'transparent',
                color: isActive ? 'white' : isPast ? 'var(--andoxa-blue)' : 'var(--slate-500)',
                border: isActive ? '2px solid var(--andoxa-blue)'
                       : isPast ? '2px solid var(--andoxa-blue-100)'
                       : '2px solid var(--slate-200)',
                boxShadow: isActive ? '0 0 0 4px rgba(0,82,217,0.12)' : 'none',
              }}>
                {isPast ? <Icon.Check size={11}/> : i+1}
              </div>
              <span style={{
                fontSize: 10, fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--slate-900)' : 'var(--slate-500)',
                whiteSpace:'nowrap',
              }}>{s.label.split(' ')[0]}</span>
            </div>
            {i < order.length - 1 && (
              <div className="stepper-line" style={{
                background: i < idx ? 'var(--andoxa-blue-100)' : 'var(--slate-200)',
                margin: '11px -2px 0 -2px',
              }}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ActivityRow({ ev, isLast }) {
  const map = {
    invite:    { Icn: Icon.Linkedin },
    accept:    { Icn: Icon.Check },
    reply:     { Icn: Icon.MessageSquare },
    'meeting-booked': { Icn: Icon.CalendarPlus },
    proposal:  { Icn: Icon.FileText },
    noshow:    { Icn: Icon.X },
  };
  const I = (map[ev.kind] || map.reply).Icn;
  return (
    <div style={{display:'flex', alignItems:'center', gap: 10, padding:'8px 0', borderBottom: isLast ? 'none' : '1px dashed var(--slate-150)'}}>
      <div style={{
        width:24, height:24, borderRadius:6,
        background: 'var(--slate-100)', color: 'var(--slate-700)',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink:0,
      }}><I size={12}/></div>
      <div style={{flex:1, fontSize: 12.5, color:'var(--slate-700)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
        {ev.label}
      </div>
      <div style={{fontSize: 11, color:'var(--slate-500)', flexShrink:0}}>{ev.date}</div>
    </div>
  );
}

function Cockpit({ conv }) {
  const stage = window.AndoxaData.STAGES[conv.stage];
  const stageIdx = window.AndoxaData.PIPELINE_ORDER.indexOf(conv.stage);
  const total = window.AndoxaData.PIPELINE_ORDER.length;
  const timeline = (conv.timeline || []).slice(-5);

  return (
    <aside style={{width: 300, minWidth: 260, borderLeft: '1px solid var(--slate-200)', background:'white', display:'flex', flexDirection:'column', flexShrink: 0, overflowY:'auto'}}>
      {/* Section 1 — Identité prospect */}
      <div style={{...sectionStyle, padding: '24px 20px', textAlign:'center'}}>
        <div style={{display:'flex', justifyContent:'center'}}>
          <Avatar name={conv.name} size={64}/>
        </div>
        <div style={{fontSize: 16, fontWeight: 500, color:'var(--slate-900)', marginTop: 12}}>{conv.name}</div>
        <div style={{fontSize: 11.5, color:'var(--slate-500)', marginTop: 3}}>{conv.role}</div>
        <div style={{fontSize: 11.5, color:'var(--slate-500)'}}>{conv.company}</div>
        <div style={{display:'flex', justifyContent:'center', marginTop: 12}}>
          <StagePill stage={conv.stage}/>
        </div>
        <button className="btn btn-primary" style={{
          width:'100%', justifyContent:'center', marginTop: 16,
          padding:'9px 12px', fontSize: 13, fontWeight: 500,
        }}>
          <Icon.Eye size={13}/>Voir la fiche complète
        </button>
      </div>

      {/* Section 2 — Pipeline visuel */}
      <div style={sectionStyle}>
        <MiniStepper stage={conv.stage}/>
        <div style={{fontSize:11, color:'var(--slate-500)', marginTop: 14, textAlign:'center'}}>
          Étape {stageIdx + 1}/{total} — <span style={{color:'var(--slate-700)', fontWeight:500}}>{stage.label}</span>
        </div>
      </div>

      {/* Section 3 — Activité clé */}
      <div style={sectionStyle}>
        <div style={{fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--slate-500)', marginBottom: 6}}>
          Activité clé
        </div>
        <div>
          {timeline.map((ev, i, arr) => (
            <ActivityRow key={i} ev={ev} isLast={i === arr.length - 1}/>
          ))}
          {timeline.length === 0 && (
            <div style={{fontSize:12, color:'var(--slate-500)', padding:'8px 0'}}>Aucune activité enregistrée.</div>
          )}
        </div>
      </div>
    </aside>
  );
}

window.Cockpit = Cockpit;
