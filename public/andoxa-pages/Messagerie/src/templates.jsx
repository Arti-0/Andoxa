// Templates page — gestion + modale rapide d'insertion exposée via window.openInsertModal
const { useState, useMemo, useRef, useEffect } = React;

const CATEGORIES = [
  { id: 'all',         emoji: '📁', label: 'Tous les templates' },
  { id: 'first',       emoji: '👋', label: 'Premier contact' },
  { id: 'relance',     emoji: '🔄', label: 'Relance' },
  { id: 'rdv',         emoji: '📅', label: 'RDV' },
  { id: 'proposal',    emoji: '📄', label: 'Proposition' },
  { id: 'followup',    emoji: '🎯', label: 'Suivi' },
  { id: 'mine',        emoji: '🌟', label: 'Mes templates' },
];

const CHANNELS = {
  li:    { label: 'LinkedIn', bg: '#EEF4FE', fg: '#0A4FA8' },
  wa:    { label: 'WhatsApp', bg: '#ECFDF5', fg: '#15803D' },
  both:  { label: 'LinkedIn & WhatsApp', bg: '#F1F5F9', fg: '#475569' },
};

const CAT_PILL = {
  first:    { label: 'Premier contact', bg: '#EEF4FE', fg: '#1A53B8' },
  relance:  { label: 'Relance',         bg: '#FEF7E6', fg: '#92590E' },
  rdv:      { label: 'RDV',             bg: '#ECFDF5', fg: '#15803D' },
  proposal: { label: 'Proposition',     bg: '#F5F3FF', fg: '#5B21B6' },
  followup: { label: 'Suivi',           bg: '#F1F5F9', fg: '#475569' },
  mine:     { label: 'Personnel',       bg: '#FFF7ED', fg: '#9A3412' },
};

const VARS = [
  { key: '{prénom}',       desc: 'Prénom du prospect' },
  { key: '{nom}',          desc: 'Nom de famille' },
  { key: '{entreprise}',   desc: 'Nom de l\'entreprise' },
  { key: '{poste}',        desc: 'Poste du prospect' },
  { key: '{lien_booking}', desc: 'Votre lien de booking' },
];

const SAMPLE = {
  '{prénom}': 'Andréas', '{nom}': 'Bodin', '{entreprise}': 'Andoxa',
  '{poste}': 'Co-fondateur', '{lien_booking}': 'calendly.com/sebastian/30min',
};

// ────────────────────────────────────────────────────────────────────────
// Andoxa app sidebar — delegates to the canonical AndoxaSidebar.
function Sidebar() {
  return <AndoxaSidebar active="inbox" logoBase="assets/" />;
}

// ────────────────────────────────────────────────────────────────────────
function PageHeader({ onNew }) {
  return (
    <div style={{padding:'18px 28px 14px', borderBottom:'1px solid var(--slate-200)', background:'white'}}>
      <a href="Messagerie.html" style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'var(--slate-500)', textDecoration:'none'}}>
        <Icon.ArrowLeft size={12}/>Messagerie
      </a>
      <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:8, gap:16, flexWrap:'wrap'}}>
        <div>
          <h1 style={{fontSize:20, fontWeight:500, color:'var(--slate-900)', letterSpacing:'-0.01em'}}>Templates de messages</h1>
          <p style={{fontSize:13, color:'var(--slate-600)', marginTop:4}}>Créez et gérez vos templates pour répondre plus vite à vos prospects.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          <Icon.Plus size={14}/>Nouveau template
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
function CategoriesSidebar({ active, setActive, counts }) {
  return (
    <aside style={{width:240, borderRight:'1px solid var(--slate-200)', background:'#FCFCFD', display:'flex', flexDirection:'column', flexShrink:0}}>
      <div style={{padding:'14px 12px 6px', fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--slate-500)'}}>
        Catégories
      </div>
      <div style={{flex:1, overflowY:'auto'}}>
        {CATEGORIES.map(c => (
          <div key={c.id} className={'cat-item' + (active===c.id ? ' active':'')} onClick={()=>setActive(c.id)}>
            <span style={{fontSize:14}}>{c.emoji}</span>
            <span style={{flex:1}}>{c.label}</span>
            <span className="cat-count">({counts[c.id] || 0})</span>
          </div>
        ))}
      </div>
      <div style={{padding:'12px 12px 16px', borderTop:'1px solid var(--slate-150)'}}>
        <button className="btn" style={{width:'100%', justifyContent:'center'}}>
          <Icon.Plus size={13}/>Nouvelle catégorie
        </button>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────────
function detectVars(text) {
  const set = new Set();
  (text.match(/\{[^{}]+\}/g) || []).forEach(v => set.add(v));
  return [...set];
}

function TemplateCard({ tpl, onEdit, onDuplicate, onDelete }) {
  const cat = CAT_PILL[tpl.category] || CAT_PILL.followup;
  const ch = CHANNELS[tpl.channel] || CHANNELS.both;
  const preview = tpl.content.split('\n').join(' ').slice(0, 180);
  const vars = detectVars(tpl.content);
  return (
    <div className="tpl-card" onClick={onEdit}>
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12}}>
        <div style={{fontSize:14, fontWeight:500, color:'var(--slate-900)', flex:1, minWidth:0}}>{tpl.name}</div>
        <div style={{display:'flex', gap:6, flexShrink:0}}>
          <span className="pill" style={{background:cat.bg, color:cat.fg}}>{cat.label}</span>
          <span className="pill" style={{background:ch.bg, color:ch.fg, fontSize:10.5}}>{ch.label}</span>
        </div>
      </div>
      <div style={{fontSize:12.5, color:'var(--slate-600)', marginTop:8, lineHeight:1.55, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
        {preview}{tpl.content.length > 180 ? '…' : ''}
      </div>
      {vars.length > 0 && (
        <div style={{display:'flex', flexWrap:'wrap', gap:4, marginTop:10}}>
          {vars.map(v => <span key={v} className="var-pill">{v}</span>)}
        </div>
      )}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, paddingTop:12, borderTop:'1px solid var(--slate-150)'}}>
        <span style={{fontSize:11, color:'var(--slate-500)'}}>Utilisé {tpl.usage} fois ce mois</span>
        <div style={{display:'flex', gap:2}} onClick={e=>e.stopPropagation()}>
          <button className="icon-btn" title="Éditer" onClick={onEdit}><Icon.Pencil size={13}/></button>
          <button className="icon-btn" title="Dupliquer" onClick={onDuplicate}><Icon.Copy size={13}/></button>
          <button className="icon-btn danger" title="Supprimer" onClick={onDelete}><Icon.Trash size={13}/></button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
function EmptyState({ onNew }) {
  return (
    <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'60px 20px', textAlign:'center'}}>
      <div style={{width:80, height:80, borderRadius:20, background:'var(--andoxa-blue-50)', color:'var(--andoxa-blue)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18}}>
        <Icon.MessageSquarePlus size={40}/>
      </div>
      <h3 style={{fontSize:17, fontWeight:500, color:'var(--slate-900)'}}>Créez votre premier template</h3>
      <p style={{fontSize:13, color:'var(--slate-600)', marginTop:8, maxWidth:440, lineHeight:1.55}}>
        Les templates vous permettent de gagner du temps sur vos messages récurrents.
        Créez-en autant que vous voulez et insérez-les en 1 clic dans vos conversations.
      </p>
      <button className="btn btn-primary" style={{marginTop:20}} onClick={onNew}>
        <Icon.Plus size={14}/>Créer mon premier template
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
function EditModal({ tpl, onClose, onSave, onDelete }) {
  const isNew = !tpl.id;
  const [name, setName] = useState(tpl.name || '');
  const [category, setCategory] = useState(tpl.category || 'first');
  const [channel, setChannel] = useState(tpl.channel || 'both');
  const [content, setContent] = useState(tpl.content || '');
  const [previewOpen, setPreviewOpen] = useState(true);
  const taRef = useRef(null);

  const insertVar = (v) => {
    const ta = taRef.current; if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const next = content.slice(0, start) + v + content.slice(end);
    setContent(next);
    setTimeout(()=>{ ta.focus(); ta.setSelectionRange(start + v.length, start + v.length); }, 0);
  };

  const renderedPreview = useMemo(() => {
    let s = content;
    Object.entries(SAMPLE).forEach(([k,val]) => {
      s = s.split(k).join(`__VAR_OPEN__${val}__VAR_CLOSE__`);
    });
    return s;
  }, [content]);

  const charCount = content.length;
  const charHint = channel === 'wa'
    ? 'Optimal : 100–300 caractères pour WhatsApp'
    : channel === 'li'
      ? 'Optimal : 50–150 caractères pour LinkedIn'
      : 'Optimal : 50–150 (LinkedIn) · 100–300 (WhatsApp)';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{maxWidth:720}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px', borderBottom:'1px solid var(--slate-150)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <h2 style={{fontSize:16, fontWeight:500, color:'var(--slate-900)'}}>{isNew ? 'Nouveau template' : 'Modifier le template'}</h2>
          <button className="icon-btn" onClick={onClose}><Icon.X size={16}/></button>
        </div>

        <div style={{padding:'20px 22px', overflowY:'auto', display:'flex', flexDirection:'column', gap:16}}>
          <div>
            <label className="form-label">Nom</label>
            <input className="form-input" maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Premier contact LinkedIn — Founder B2B"/>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <label className="form-label">Catégorie</label>
              <select className="form-select" value={category} onChange={e=>setCategory(e.target.value)}>
                {CATEGORIES.filter(c=>c.id!=='all').map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Canal préféré</label>
              <div className="seg" style={{width:'100%'}}>
                <button className={channel==='li'?'active':''} onClick={()=>setChannel('li')} style={{flex:1, justifyContent:'center'}}>LinkedIn</button>
                <button className={channel==='wa'?'active':''} onClick={()=>setChannel('wa')} style={{flex:1, justifyContent:'center'}}>WhatsApp</button>
                <button className={channel==='both'?'active':''} onClick={()=>setChannel('both')} style={{flex:1, justifyContent:'center'}}>Les deux</button>
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">Message</label>
            <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:8}}>
              <span style={{fontSize:11, color:'var(--slate-500)', alignSelf:'center', marginRight:4}}>Insérer :</span>
              {VARS.map(v => (
                <button key={v.key} className="var-toolbar-btn" title={`Sera remplacé par : ${v.desc}`} onClick={()=>insertVar(v.key)}>
                  {v.key}
                </button>
              ))}
            </div>
            <textarea ref={taRef} className="form-textarea" style={{minHeight:200}} value={content} onChange={e=>setContent(e.target.value)} placeholder="Bonjour {prénom}, j'ai vu votre profil et…"/>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:6}}>
              <span style={{fontSize:11, color:'var(--slate-500)'}}>{charHint}</span>
              <span style={{fontSize:11, color:'var(--slate-500)'}}>{charCount} caractères</span>
            </div>
          </div>

          <div>
            <button onClick={()=>setPreviewOpen(o=>!o)} style={{display:'flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:500, color:'var(--slate-700)', background:'transparent', border:0, cursor:'pointer', padding:0}}>
              <span style={{transform: previewOpen?'rotate(90deg)':'none', transition:'transform 200ms', display:'flex'}}><Icon.ChevronRight size={12}/></span>
              Aperçu du rendu
            </button>
            {previewOpen && (
              <div className="preview-block" style={{marginTop:8}}>
                {renderedPreview ? renderedPreview.split('__VAR_OPEN__').map((part, i) => {
                  if (i === 0) return <span key={i}>{part}</span>;
                  const [val, rest] = part.split('__VAR_CLOSE__');
                  return <span key={i}><span className="var-resolved">{val}</span>{rest}</span>;
                }) : <span style={{color:'var(--slate-500)', fontStyle:'italic'}}>Votre message apparaîtra ici…</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{padding:'14px 22px', borderTop:'1px solid var(--slate-150)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          {!isNew ? (
            <button className="btn btn-danger-ghost" onClick={()=>{ onDelete(tpl.id); onClose(); }}>
              <Icon.Trash size={13}/>Supprimer
            </button>
          ) : <span></span>}
          <div style={{display:'flex', gap:8}}>
            <button className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" disabled={!name.trim() || !content.trim()}
              style={(!name.trim() || !content.trim()) ? {opacity:0.5, cursor:'not-allowed'} : {}}
              onClick={()=>{ onSave({ ...tpl, name, category, channel, content }); onClose(); }}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
function App() {
  const [templates, setTemplates] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('used');
  const [view, setView] = useState('detail');
  const [editing, setEditing] = useState(null);

  const counts = useMemo(() => {
    const c = { all: templates.length };
    CATEGORIES.forEach(cat => { if (cat.id !== 'all') c[cat.id] = templates.filter(t => t.category === cat.id).length; });
    c.mine = templates.length;
    return c;
  }, [templates]);

  const filtered = useMemo(() => {
    let list = templates;
    if (activeCat !== 'all' && activeCat !== 'mine') list = list.filter(t => t.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q));
    }
    if (sort === 'used')   list = [...list].sort((a,b) => b.usage - a.usage);
    if (sort === 'recent') list = [...list].sort((a,b) => b.id - a.id);
    if (sort === 'alpha')  list = [...list].sort((a,b) => a.name.localeCompare(b.name));
    return list;
  }, [templates, activeCat, search, sort]);

  const newTpl = () => setEditing({ category: activeCat === 'all' || activeCat === 'mine' ? 'first' : activeCat, channel: 'both', content: '', name: '' });

  const save = (tpl) => {
    if (tpl.id) setTemplates(ts => ts.map(t => t.id === tpl.id ? tpl : t));
    else setTemplates(ts => [...ts, { ...tpl, id: Date.now(), usage: 0 }]);
  };
  const del = (id) => setTemplates(ts => ts.filter(t => t.id !== id));
  const dup = (tpl) => setTemplates(ts => [...ts, { ...tpl, id: Date.now(), name: tpl.name + ' (copie)', usage: 0 }]);

  return (
    <div style={{height:'100vh', display:'flex', overflow:'hidden'}}>
      <Sidebar/>
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
        <PageHeader onNew={newTpl}/>
        <div style={{flex:1, display:'flex', minHeight:0}}>
          <CategoriesSidebar active={activeCat} setActive={setActiveCat} counts={counts}/>
          <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0, background:'#F7F8FA'}}>
            {templates.length === 0 ? (
              <EmptyState onNew={newTpl}/>
            ) : (
              <>
                <div style={{padding:'14px 24px', borderBottom:'1px solid var(--slate-200)', background:'white', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
                  <div className="input-shell" style={{flex:1, minWidth:240, maxWidth:420}}>
                    <Icon.Search size={13} style={{color:'var(--slate-500)'}}/>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher dans vos templates…"/>
                  </div>
                  <select className="form-select" style={{width:'auto'}} value={sort} onChange={e=>setSort(e.target.value)}>
                    <option value="used">Plus utilisés</option>
                    <option value="recent">Plus récents</option>
                    <option value="alpha">Alphabétique</option>
                  </select>
                  <div className="seg">
                    <button className={view==='compact'?'active':''} onClick={()=>setView('compact')}>Compact</button>
                    <button className={view==='detail'?'active':''} onClick={()=>setView('detail')}>Détaillé</button>
                  </div>
                </div>
                <div style={{flex:1, overflowY:'auto', padding:'20px 24px', display:'grid', gridTemplateColumns: view==='compact' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap:14, alignContent:'flex-start'}}>
                  {filtered.map(t => (
                    <TemplateCard key={t.id} tpl={t}
                      onEdit={()=>setEditing(t)}
                      onDuplicate={()=>dup(t)}
                      onDelete={()=>del(t.id)}/>
                  ))}
                  {filtered.length === 0 && (
                    <div style={{padding:40, textAlign:'center', color:'var(--slate-500)', fontSize:13}}>
                      Aucun template ne correspond à votre recherche.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {editing && <EditModal tpl={editing} onClose={()=>setEditing(null)} onSave={save} onDelete={del}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
