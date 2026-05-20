// Thread — header épuré: avatar, nom + pill stage + linkedin icon, ⋯ menu.
// Composer footer keeps Templates/Booking/Paperclip.
const { useState: useStateTh, useRef: useRefTh, useEffect: useEffectTh } = React;

const DateSep = ({ label }) => (
  <div style={{display:'flex', alignItems:'center', gap:10, margin:'20px 0 12px', padding:'0 6px'}}>
    <div style={{flex:1, height:1, background:'var(--slate-150)'}}></div>
    <span style={{fontSize:11, fontWeight:500, color:'var(--slate-500)'}}>{label}</span>
    <div style={{flex:1, height:1, background:'var(--slate-150)'}}></div>
  </div>
);

const LinkPreview = ({ p }) => (
  <a className="link-preview" style={{display:'flex', gap:0, marginTop: 8, textDecoration:'none', maxWidth: 360}}>
    <div style={{width: 4, background: p.favicon, flexShrink:0}}></div>
    <div style={{padding: '8px 12px', flex:1, minWidth:0}}>
      <div style={{fontSize:11, color:'var(--slate-500)', display:'flex', alignItems:'center', gap:4}}>
        <Icon.ExternalLink size={10}/>{p.url}
      </div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--slate-900)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{p.title}</div>
      <div style={{fontSize:11.5, color:'var(--slate-500)', marginTop:2, lineHeight: 1.45}}>{p.desc}</div>
    </div>
  </a>
);

const Bubble = ({ m }) => {
  if (m.kind === 'date') return <DateSep label={m.label}/>;

  if (m.kind === 'auto') {
    return (
      <div style={{display:'flex', justifyContent:'center', margin:'14px 0'}}>
        <div className="bubble-auto" style={{
          padding:'7px 14px', borderRadius: 999, fontSize: 11.5, color:'var(--slate-600)',
          display:'flex', alignItems:'center', gap:8,
          background:'rgba(0,82,217,0.05)', border:'1px solid rgba(0,82,217,0.12)',
        }}>
          <Icon.Zap size={11} style={{color:'var(--andoxa-blue)'}}/>
          <span style={{fontSize:10.5, fontWeight:600, color:'var(--slate-700)', letterSpacing:'0.02em'}}>
            Auto · WhatsApp
          </span>
          <span>{m.text}</span>
          <span style={{color:'var(--slate-500)'}}>· {m.time}</span>
        </div>
      </div>
    );
  }

  const out = m.dir === 'out';
  return (
    <div style={{display:'flex', justifyContent: out ? 'flex-end' : 'flex-start', margin:'8px 0'}}>
      <div style={{maxWidth: '78%', display:'flex', flexDirection:'column', alignItems: out ? 'flex-end' : 'flex-start'}}>
        <div className={out ? 'bubble-out' : 'bubble-in'} style={{
          padding: '12px 15px',
          borderRadius: out ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          fontSize: 13.5, lineHeight: 1.6, color:'var(--slate-800)',
          textWrap: 'pretty',
        }}>
          {m.text && <div style={{whiteSpace: 'pre-wrap'}}>{m.text}</div>}
          {m.bullets && (
            <ul style={{margin:'10px 0 2px', paddingLeft: 18, display:'flex', flexDirection:'column', gap: 5}}>
              {m.bullets.map((b,i) => <li key={i} style={{fontSize: 13, lineHeight: 1.55}}>{b}</li>)}
            </ul>
          )}
          {m.signature && <div style={{marginTop: 8, fontSize: 12, color:'var(--slate-500)', fontStyle:'italic'}}>{m.signature}</div>}
          {m.linkPreview && <LinkPreview p={m.linkPreview}/>}
        </div>
        <div style={{display:'flex', alignItems:'center', gap:6, marginTop: 5, fontSize: 10.5, color:'var(--slate-500)', padding: '0 4px'}}>
          <span>{m.time}</span>
          {out && <Icon.CheckCheck size={12} style={{color:'var(--andoxa-blue)'}}/>}
        </div>
      </div>
    </div>
  );
};

function ContextMenu({ open, onClose }) {
  if (!open) return null;
  const items = [
    { icon: 'Tag',      label: 'Changer le statut du prospect' },
    { icon: 'Mail',     label: 'Marquer comme non lu' },
    { icon: 'Archive',  label: 'Archiver la conversation' },
    { icon: 'Linkedin', label: 'Voir le profil LinkedIn' },
    { kind: 'sep' },
    { icon: 'Trash',    label: 'Supprimer la conversation', danger: true },
  ];
  return (
    <>
      <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:50}}></div>
      <div style={{
        position:'absolute', top: 38, right: 0, zIndex: 51,
        background:'white', border:'1px solid var(--slate-200)',
        borderRadius: 10, boxShadow:'0 8px 24px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.05)',
        minWidth: 240, padding: 4,
      }}>
        {items.map((it, i) => {
          if (it.kind === 'sep') return <div key={i} style={{height:1, background:'var(--slate-150)', margin:'4px 0'}}></div>;
          const I = Icon[it.icon];
          return (
            <button key={i} onClick={onClose} style={{
              width:'100%', display:'flex', alignItems:'center', gap:10,
              padding:'8px 10px', border:0, background:'transparent', cursor:'pointer',
              fontSize: 12.5, color: it.danger ? '#B91C1C' : 'var(--slate-700)',
              borderRadius: 6, fontFamily:'inherit', textAlign:'left',
            }}
            onMouseEnter={(e)=> e.currentTarget.style.background = it.danger ? '#FEF2F2' : 'var(--slate-50)'}
            onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}>
              {I && <I size={14}/>}
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// Quick-insert templates popover (composer)
const QUICK_TEMPLATES = [
  { id: 1, name: 'Premier contact LinkedIn — Founder B2B', channel: 'li',
    content: 'Bonjour {prénom}, j\'ai vu votre parcours chez {entreprise}, votre approche m\'intéresse. Seriez-vous disponible pour un échange de 15 min cette semaine ?' },
  { id: 2, name: 'Relance après 7j de silence', channel: 'li',
    content: 'Bonjour {prénom}, je me permets de revenir vers vous concernant ma proposition d\'échange. Est-ce que cela reste pertinent pour vous ?' },
  { id: 3, name: 'Proposition de RDV — créneaux', channel: 'both',
    content: 'Bonjour {prénom}, super que cela vous intéresse. Voici mon lien pour réserver un créneau qui vous convient : {lien_booking}' },
  { id: 4, name: 'Confirmation RDV WhatsApp', channel: 'wa',
    content: 'Bonjour {prénom}, je vous confirme notre RDV. À tout à l\'heure !' },
  { id: 5, name: 'Suivi post-proposition', channel: 'li',
    content: 'Bonjour {prénom}, avez-vous eu le temps de regarder la proposition envoyée ? Je suis dispo pour échanger sur les points qui vous semblent flous.' },
];
const QUICK_FILTERS = [
  { id: 'all',     label: 'Tous' },
  { id: 'first',   label: 'Premier contact' },
  { id: 'relance', label: 'Relance' },
  { id: 'rdv',     label: 'RDV' },
  { id: 'suivi',   label: 'Suivi' },
  { id: 'mine',    label: 'Mes templates' },
];

function resolveVars(text, conv) {
  const first = (conv.name || '').split(' ')[0] || '';
  const last  = (conv.name || '').split(' ').slice(1).join(' ') || '';
  return text
    .replace(/\{prénom\}/g, first)
    .replace(/\{nom\}/g, last)
    .replace(/\{entreprise\}/g, conv.company || '')
    .replace(/\{poste\}/g, conv.role || '')
    .replace(/\{lien_booking\}/g, 'calendly.com/sebastian/30min');
}

function QuickInsertModal({ conv, onClose, onPick }) {
  const [q, setQ] = useStateTh('');
  const [f, setF] = useStateTh('all');
  const list = QUICK_TEMPLATES.filter(t => {
    if (q && !(t.name + ' ' + t.content).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const channelMeta = { li: {bg:'#EEF4FE', fg:'#0A4FA8', label:'LinkedIn'}, wa: {bg:'#ECFDF5', fg:'#15803D', label:'WhatsApp'}, both: {bg:'#F1F5F9', fg:'#475569', label:'Les deux'} };

  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(15,23,42,0.35)', zIndex: 60, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth: 480, maxHeight: 540, background:'white',
        borderRadius: 14, boxShadow:'0 24px 60px rgba(15,23,42,0.25)',
        display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--slate-150)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <Icon.FileText size={14} style={{color:'var(--slate-700)'}}/>
            <span style={{fontSize:14, fontWeight:500, color:'var(--slate-900)'}}>Insérer un template</span>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon.X size={14}/></button>
        </div>
        <div style={{padding:'12px 16px 8px'}}>
          <div className="input-shell" style={{padding:'6px 10px'}}>
            <Icon.Search size={13} style={{color:'var(--slate-500)'}}/>
            <input autoFocus placeholder="Rechercher un template…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <div style={{display:'flex', flexWrap:'wrap', gap:4, marginTop:10}}>
            {QUICK_FILTERS.map(x => (
              <button key={x.id} className={'filter-chip' + (f===x.id ? ' active':'')} onClick={()=>setF(x.id)}>{x.label}</button>
            ))}
          </div>
        </div>
        <div style={{flex:1, overflowY:'auto', padding:'4px 8px 8px'}}>
          {list.map(t => {
            const ch = channelMeta[t.channel];
            return (
              <button key={t.id} onClick={()=>{ onPick(resolveVars(t.content, conv)); onClose(); }} style={{
                display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left',
                padding:'10px 12px', border:0, background:'transparent', borderRadius:8, cursor:'pointer',
                transition:'background 120ms',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--slate-50)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:500, color:'var(--slate-900)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.name}</div>
                  <div style={{fontSize:11.5, color:'var(--slate-500)', marginTop:2, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', lineHeight:1.45}}>
                    {t.content}
                  </div>
                </div>
                <span className="pill" style={{background:ch.bg, color:ch.fg, fontSize:10.5, flexShrink:0}}>{ch.label}</span>
              </button>
            );
          })}
          {list.length === 0 && (
            <div style={{padding:'24px 16px', textAlign:'center', fontSize:12.5, color:'var(--slate-500)'}}>Aucun template trouvé.</div>
          )}
        </div>
        <div style={{padding:'10px 16px', borderTop:'1px solid var(--slate-150)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <a href="Templates.html" style={{fontSize:11.5, color:'var(--andoxa-blue)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4}}>
            Gérer mes templates <Icon.ArrowRight size={11}/>
          </a>
          <span style={{fontSize:10.5, color:'var(--slate-500)'}}>Variables remplacées automatiquement</span>
        </div>
      </div>
    </div>
  );
}

function Thread({ conv, thread }) {
  const scrollRef = useRefTh(null);
  const [draft, setDraft] = useStateTh('');
  const [menuOpen, setMenuOpen] = useStateTh(false);
  const [tplOpen, setTplOpen] = useStateTh(false);

  useEffectTh(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conv.id]);

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0, background:'#FCFCFD'}}>
      {/* Épuré: avatar, nom + stage pill + linkedin, ⋯ menu */}
      <div style={{padding:'14px 22px', borderBottom:'1px solid var(--slate-150)', display:'flex', alignItems:'center', gap: 14, background:'white', boxShadow:'0 1px 0 rgba(15,23,42,0.04), 0 4px 8px -6px rgba(15,23,42,0.08)', position:'relative', zIndex: 2}}>
        <Avatar name={conv.name} size={40}/>
        <div style={{minWidth:0, display:'flex', flexDirection:'column', flex:1}}>
          <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
            <span style={{fontSize:14.5, fontWeight:500, color:'var(--slate-900)'}}>{conv.name}</span>
            <StagePill stage={conv.stage}/>
            <a href="#" title="Voir le profil LinkedIn" style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              width:22, height:22, borderRadius:5, background:'#EEF4FE', color:'#0A66C2',
              textDecoration:'none', transition:'background 120ms',
            }}
            onMouseEnter={(e)=> e.currentTarget.style.background = '#DDE9FB'}
            onMouseLeave={(e)=> e.currentTarget.style.background = '#EEF4FE'}>
              <Icon.Linkedin size={12}/>
            </a>
          </div>
          <div style={{fontSize:11.5, color:'var(--slate-500)', marginTop: 2}}>
            {conv.company} · {conv.role}
          </div>
        </div>
        <div style={{position:'relative'}}>
          <button className="icon-btn" title="Plus d'actions" onClick={()=>setMenuOpen(o=>!o)}>
            <Icon.MoreH size={16}/>
          </button>
          <ContextMenu open={menuOpen} onClose={()=>setMenuOpen(false)}/>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{flex:1, overflowY:'auto', padding:'24px 26px 16px'}}>
        {thread.map((m, i) => <Bubble key={i} m={m}/>)}
      </div>

      {/* Composer — Templates / Booking / Paperclip in footer */}
      <div style={{padding:'14px 22px 18px', borderTop:'1px solid var(--slate-150)', background:'white'}}>
        <div style={{border:'1px solid var(--slate-200)', borderRadius:12, background:'white'}}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Votre message…"
            style={{
              width:'100%', resize:'none', border:0, outline:0, padding:'12px 14px 6px',
              fontSize: 13.5, lineHeight: 1.55, fontFamily:'inherit', color:'var(--slate-900)',
              minHeight: 60, background:'transparent',
            }}
          />
          <div style={{display:'flex', alignItems:'center', gap:4, padding:'6px 8px 8px'}}>
            <button className="btn btn-ghost" style={{padding:'5px 8px'}} title="Insérer un template" onClick={()=>setTplOpen(true)}><Icon.FileText size={14}/>Templates</button>
            <button className="btn btn-ghost" style={{padding:'5px 8px'}} title="Insérer un lien Calendly"><Icon.Calendar size={14}/>Lien booking</button>
            <button className="btn btn-ghost" style={{padding:'5px 8px'}} title="Pièce jointe"><Icon.Paperclip size={14}/></button>
            <div style={{marginLeft:'auto'}}>
              <button className="btn btn-primary" style={{padding:'7px 14px'}} title="Envoyer (⏎)">
                <Icon.Send size={13}/>Envoyer
              </button>
            </div>
          </div>
        </div>
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:6, fontSize:10.5, color:'var(--slate-400)'}}>
          <span><span className="kbd" style={{fontSize:10}}>⏎</span> envoyer · <span className="kbd" style={{fontSize:10}}>Maj+⏎</span> saut de ligne</span>
        </div>
      </div>
      {tplOpen && <QuickInsertModal conv={conv} onClose={()=>setTplOpen(false)} onPick={(text)=>setDraft(d => d ? (d + '\n\n' + text) : text)}/>}
    </div>
  );
}

window.Thread = Thread;
