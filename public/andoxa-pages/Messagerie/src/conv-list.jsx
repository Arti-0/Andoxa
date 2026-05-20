// Conv list — slim cards (no preview line), 2-level filters: channel pills + status pills.
const { useState: useStateCL, useMemo: useMemoCL } = React;

const Avatar = ({ name, size = 36 }) => {
  const hue = window.AndoxaData.HUE(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, hsl(${hue}, 42%, 58%), hsl(${(hue+30)%360}, 42%, 48%))`,
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
    }}>
      {window.AndoxaData.INITIALS(name)}
    </div>
  );
};

const StagePill = ({ stage }) => {
  const s = window.AndoxaData.STAGES[stage];
  return (
    <span className="pill" style={{ background: s.bg, color: s.fg }}>
      <span style={{ width: 5, height: 5, borderRadius: 5, background: s.dot, display:'inline-block' }}></span>
      {s.label}
    </span>
  );
};

function ConvList({ conversations, activeId, onSelect, filter, setFilter, channel, setChannel }) {
  // Niveau 2 (statut) — 4 filtres
  const STATUS = [
    { id: 'all',     label: 'Tous',          count: conversations.length },
    { id: 'unread',  label: 'Non lus',       count: conversations.filter(c => c.unread > 0).length },
    { id: 'relance', label: 'À relancer',    count: conversations.filter(c => c.silentDays >= 4).length },
    { id: 'rdv',     label: 'RDV à venir',   count: conversations.filter(c => c.stage === 'meeting').length },
  ];

  const filtered = useMemoCL(() => {
    let list = conversations;
    if (channel !== 'all') list = list.filter(c => c.channel === channel);
    if (filter === 'unread')  list = list.filter(c => c.unread > 0);
    if (filter === 'relance') list = list.filter(c => c.silentDays >= 4);
    if (filter === 'rdv')     list = list.filter(c => c.stage === 'meeting');
    return list;
  }, [conversations, filter, channel]);

  return (
    <div style={{width: 320, minWidth: 280, borderRight: '1px solid var(--slate-200)', display:'flex', flexDirection:'column', background: '#FCFCFD', flexShrink: 0}}>
      {/* Niveau 1 — canal en onglets pills proéminents */}
      <div style={{padding: '14px 16px 10px', borderBottom: '1px solid var(--slate-150)'}}>
        <div className="seg" style={{width:'100%'}}>
          <button className={channel==='all' ? 'active':''} onClick={()=>setChannel('all')} style={{flex:1, justifyContent:'center'}}>Tous</button>
          <button className={channel==='li' ? 'active':''} onClick={()=>setChannel('li')} style={{flex:1, justifyContent:'center'}}>
            <span style={{width:10, height:10, borderRadius:2, background:'#0A66C2'}}></span>
            LinkedIn
          </button>
          <button className={channel==='wa' ? 'active':''} onClick={()=>setChannel('wa')} style={{flex:1, justifyContent:'center'}}>
            <span style={{width:10, height:10, borderRadius:2, background:'#25D366'}}></span>
            WhatsApp
          </button>
        </div>
      </div>

      {/* Niveau 2 — filtres statut, plus discrets */}
      <div style={{padding: '10px 14px', borderBottom: '1px solid var(--slate-150)', display:'flex', gap: 4, overflowX:'auto'}}>
        {STATUS.map(f => (
          <button key={f.id} className={'filter-chip' + (filter===f.id?' active':'')} onClick={()=>setFilter(f.id)}>
            {f.label}
            <span className="count">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Cards — slim, no preview */}
      <div style={{flex:1, overflowY:'auto'}}>
        {filtered.map(c => {
          const isActive = c.id === activeId;
          const isStale = c.silentDays >= 4;
          return (
            <div key={c.id}
              className={'conv-card' + (isActive ? ' active' : '') + (isStale ? ' stale' : '')}
              onClick={() => onSelect(c.id)}
              style={{
                padding: '11px 14px',
                borderBottom: '1px solid var(--slate-150)',
                cursor: 'pointer',
                display: 'flex', gap: 11, alignItems:'center',
              }}
            >
              <Avatar name={c.name} size={40}/>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <span className={'channel-mark ' + (c.channel === 'li' ? 'ch-li' : 'ch-wa')} title={c.channel === 'li' ? 'LinkedIn' : 'WhatsApp'} style={{width:12, height:12, fontSize:7}}>
                    {c.channel === 'li' ? 'in' : 'wa'}
                  </span>
                  <span style={{fontSize:13, fontWeight:500, color:'var(--slate-900)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1}}>{c.name}</span>
                  <span style={{fontSize:10.5, color:'var(--slate-500)', flexShrink:0}}>{c.lastTime}</span>
                </div>
                <div style={{fontSize:11, color:'var(--slate-500)', marginTop: 1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                  {c.company} · {c.role}
                </div>
                <div style={{display:'flex', alignItems:'center', gap:6, marginTop: 5}}>
                  <StagePill stage={c.stage}/>
                  {isStale && (
                    <span style={{fontSize:10, color:'var(--slate-500)'}}>· {c.silentDays}j</span>
                  )}
                </div>
              </div>
              {c.unread > 0 && (
                <span style={{
                  minWidth:18, height:18, padding:'0 6px',
                  borderRadius:999, background:'var(--andoxa-blue)', color:'white',
                  fontSize:10.5, fontWeight:700,
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  {c.unread}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.ConvList = ConvList;
window.Avatar = Avatar;
window.StagePill = StagePill;
