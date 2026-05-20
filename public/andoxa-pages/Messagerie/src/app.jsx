// App shell — refactored TopBar: title + Templates btn left, scoped search right.
const { useState: useStateApp } = React;

function TopBar({ onOpenTemplates }) {
  return (
    <div style={{
      height: 56, borderBottom:'1px solid var(--slate-200)',
      display:'flex', alignItems:'center', gap: 14,
      padding: '0 22px', background:'white', flexShrink:0,
    }}>
      <span style={{fontSize:18, fontWeight:500, color:'var(--slate-900)', letterSpacing:'-0.01em'}}>Messagerie</span>
      <button className="btn" onClick={onOpenTemplates} style={{padding:'6px 11px'}}>
        <Icon.FileText size={14}/>Templates
      </button>
      <div style={{flex:1}}></div>
      <div className="input-shell" style={{width: 360, padding:'6px 10px'}}>
        <Icon.Search size={13} style={{color:'var(--slate-500)'}}/>
        <input placeholder="Rechercher un prospect, un message…"/>
      </div>
      <button className="icon-btn" title="Notifications"><Icon.Bell size={14}/></button>
    </div>
  );
}

function App() {
  const { CONVERSATIONS, THREAD_ANDREAS } = window.AndoxaData;
  const [activeId, setActiveId] = useStateApp('andreas');
  const [filter, setFilter] = useStateApp('all');
  const [channel, setChannel] = useStateApp('all');

  const conv = CONVERSATIONS.find(c => c.id === activeId) || CONVERSATIONS[0];
  const thread = conv.id === 'andreas' ? THREAD_ANDREAS : [
    { kind:'date', label: 'Aujourd\'hui' },
    { kind:'msg', dir:'in', time: conv.lastTime, text: conv.lastMessage },
  ];
  const convWithTimeline = conv.id === 'andreas' ? conv : { ...conv, timeline: conv.timeline || [
    { kind:'invite', label:'Invitation envoyée', date:'il y a 12j' },
    { kind:'accept', label:'Invitation acceptée', date:'il y a 9j' },
    { kind:'reply', label:'Premier échange', date:'il y a 5j' },
  ]};

  return (
    <div style={{height:'100vh', display:'flex', overflow:'hidden'}}>
      <Sidebar/>
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
        <TopBar onOpenTemplates={()=>{ window.location.href = 'Templates.html'; }}/>
        <div style={{flex:1, display:'flex', minHeight:0}}>
          <ConvList
            conversations={CONVERSATIONS}
            activeId={activeId} onSelect={setActiveId}
            filter={filter} setFilter={setFilter}
            channel={channel} setChannel={setChannel}
          />
          <Thread conv={conv} thread={thread}/>
          <Cockpit conv={convWithTimeline}/>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
