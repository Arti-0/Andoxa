// Prospect Profile — Main component (Andréas BODIN)
const { useState } = React;

const ANDREAS = {
  id: 'p1',
  name: 'Andréas BODIN',
  title: 'Chef de projet — Développement commercial',
  company: 'IÉSEG CONSEIL Paris',
  status: 'proposition',
  source: 'linkedin',
  workflow: { name: 'Parcours Classique', step: 4, total: 5 },
  list: 'Inbound Avril 2026',
  enrichedDaysAgo: 9,
  enteredAt: 14,
  msgsCount: 5, rdvCount: 1, noShow: 0,
  industry: 'Conseil étudiant — Junior-Entreprise',
  size: '80+ membres',
  location: 'Paris, France',
  website: 'iesegconseil.com',
  linkedinUrl: 'linkedin.com/in/andreas-bodin',
};

const NOTES = [
  { id: 'n1', author: 'Sebastian Bodin', when: 'il y a 11j',
    body: "Profil très qualifié — IÉSEG CONSEIL gère 80+ Junior-Entreprises. Approche personnalisée recommandée." },
  { id: 'n2', author: 'Andréas BODIN', when: 'il y a 5j',
    body: "RDV bien passé. Intéressé par le parcours WhatsApp pour activer leurs alumni — à valider avec son équipe." },
];

function Stepper() {
  const currentIdx = PIPELINE_ORDER.indexOf('proposition');
  const stages = PIPELINE_ORDER.filter(s => s !== 'perdu');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {stages.map((s, i) => {
        const st = STATUSES[s];
        const isCurrent = i === currentIdx;
        const isPast = i < currentIdx;
        const dot = isCurrent ? '#0052D9' : isPast ? '#93c5fd' : '#e2e8f0';
        const txt = isCurrent ? '#0052D9' : isPast ? '#475569' : '#94a3b8';
        const fw  = isCurrent ? 600 : isPast ? 500 : 400;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: 0, flex: '0 0 auto' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: dot, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, boxShadow: isCurrent ? '0 0 0 4px #e8f0fd' : 'none' }}>
                {isPast && <span style={{fontSize:11}}>✓</span>}
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5, color: txt, fontWeight: fw, whiteSpace: 'nowrap' }}>{st.label}</div>
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: '0 -2px', background: i < currentIdx ? '#93c5fd' : '#e2e8f0', marginTop: -16 }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PipelineWorkflowSection() {
  return (
    <Card padding={20}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Pipeline & Workflow</h3>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Dans le pipeline depuis 14j</span>
      </div>
      <div style={{ padding: '4px 4px 14px' }}>
        <Stepper/>
      </div>

      {/* Workflow card */}
      <div style={{
        marginTop: 12, padding: 14,
        background: 'linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%)',
        border: '1px solid #e9d5ff', borderRadius: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="play" size={13}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>Parcours Classique</div>
            <div style={{ fontSize: 12, color: '#6d28d9', marginTop: 1 }}>Étape 4 / 5 — Envoi proposition</div>
          </div>
          <div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 600, background: 'white', padding: '4px 9px', borderRadius: 6, border: '1px solid #e9d5ff' }}>80%</div>
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {[1,2,3,4,5].map(n => (
            <div key={n} style={{ flex: 1, height: 5, borderRadius: 3, background: n <= 4 ? '#8b5cf6' : '#e9d5ff' }}/>
          ))}
        </div>
        <div style={{
          marginTop: 12, padding: 10, background: 'white',
          borderRadius: 8, fontSize: 12.5, color: '#475569',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="clock" size={13} style={{ color: '#8b5cf6' }}/>
          <span>Prochaine action : <b style={{ color: '#0f172a' }}>J+2 — Relance proposition WhatsApp</b></span>
          <div style={{ flex: 1 }}/>
          <Button variant="primary" size="sm">Envoyer la prochaine étape</Button>
        </div>
      </div>
    </Card>
  );
}

function TimelineSection() {
  const [filter, setFilter] = useState('tous');
  const filters = [
    { id: 'tous', label: 'Tous', n: TIMELINE.length },
    { id: 'conv', label: 'Conversations', n: TIMELINE.filter(t => t.type === 'linkedin' || t.type === 'whatsapp').length },
    { id: 'pipe', label: 'Pipeline',      n: TIMELINE.filter(t => t.type === 'pipeline' || t.type === 'rdv').length },
    { id: 'wf',   label: 'Workflows',     n: TIMELINE.filter(t => t.type === 'workflow').length },
    { id: 'note', label: 'Notes',         n: TIMELINE.filter(t => t.type === 'note' || t.type === 'enrich').length },
  ];
  const events = TIMELINE.filter(t => {
    if (filter === 'tous') return true;
    if (filter === 'conv') return t.type === 'linkedin' || t.type === 'whatsapp';
    if (filter === 'pipe') return t.type === 'pipeline' || t.type === 'rdv';
    if (filter === 'wf')   return t.type === 'workflow';
    if (filter === 'note') return t.type === 'note' || t.type === 'enrich';
  });

  return (
    <Card padding={20}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Timeline d'activité</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {filters.map(f => {
            const active = f.id === filter;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '4px 9px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                border: '1px solid', cursor: 'pointer',
                borderColor: active ? '#0052D9' : '#e2e8f0',
                background: active ? '#e8f0fd' : 'white',
                color: active ? '#0052D9' : '#475569',
              }}>{f.label} <span style={{ opacity: 0.7, marginLeft: 2 }}>{f.n}</span></button>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: 28 }}>
        <div style={{ position: 'absolute', left: 9, top: 6, bottom: 6, width: 1.5, background: '#e2e8f0' }}/>
        {events.map((e) => {
          const t = TIMELINE_TYPES[e.type];
          const dirArrow = e.dir === 'sent' ? '↑' : e.dir === 'received' ? '↓' : '';
          return (
            <div key={e.id} style={{ position: 'relative', paddingBottom: 18 }}>
              <div style={{
                position: 'absolute', left: -22, top: 4,
                width: 18, height: 18, borderRadius: '50%',
                background: t.tint, color: t.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, border: `2px solid white`,
                boxShadow: `0 0 0 2px ${t.color}`,
              }}>{t.icon}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{e.title}</span>
                {dirArrow && <span style={{ fontSize: 11, color: t.color }}>{dirArrow}</span>}
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{e.when}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>· {e.author}</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4, lineHeight: 1.55 }}>
                {(e.type === 'linkedin' || e.type === 'whatsapp') ? (
                  <div style={{
                    padding: '8px 12px', background: t.tint, borderRadius: 8,
                    borderLeft: `3px solid ${t.color}`, fontStyle: 'italic',
                  }}>“{e.body}”</div>
                ) : e.type === 'origin' ? (
                  <div style={{
                    padding: '12px 14px', background: t.tint, borderRadius: 10,
                    border: `1px solid ${t.color}25`,
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <div style={{ fontSize: 12.5, color: '#0f172a' }}>{e.body}</div>
                    {e.list && (
                      <div style={{ fontSize: 12, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Ajouté à la liste{' '}
                        <a href={'CRM.html?list=' + encodeURIComponent(e.list)} style={{
                          color: t.color, fontWeight: 500, textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>« {e.list} » <Icon name="externalLink" size={11}/></a>
                      </div>
                    )}
                    {e.enrich && (
                      <div style={{ fontSize: 12, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="sparkles" size={11} style={{ color: t.color }}/>{e.enrich}
                      </div>
                    )}
                  </div>
                ) : (
                  <span>{e.body}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ConversationsSection() {
  const items = [
    { kind: 'linkedin', last: 'Avec plaisir, je vous propose mardi prochain à 11h.', when: 'il y a 8j', unread: 0 },
    { kind: 'whatsapp', last: "Merci Sebastian, je regarde ça avec l'équipe et reviens vers vous d'ici jeudi.", when: 'il y a 2j', unread: 1 },
  ];
  return (
    <Card padding={20}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Conversations actives</h3>
        <Button variant="ghost" size="sm" icon="message">Démarrer une conversation</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(it => {
          const cfg = SOURCES[it.kind];
          return (
            <div key={it.kind} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12,
              border: '1px solid #e5e7eb', borderRadius: 10, background: '#fbfcfe', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fbfcfe'; }}>
              <ChannelDot kind={it.kind} size={32}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>· {it.when}</span>
                  {it.unread > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: '#0052D9', color: 'white' }}>{it.unread}</span>}
                </div>
                <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.last}</div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#0052D9', fontWeight: 500 }}>
                Ouvrir <Icon name="arrowRight" size={12}/>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NotesSection() {
  const [val, setVal] = useState('');
  return (
    <Card padding={20}>
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Notes</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {NOTES.map(n => (
          <div key={n.id} style={{ padding: 12, background: '#fffbeb', borderLeft: '3px solid #f59e0b', borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.55 }}>{n.body}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar name={n.author} size={16}/>{n.author} · {n.when}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, border: '1px solid #e5e7eb', borderRadius: 10, padding: 4, background: 'white', display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <textarea
          value={val} onChange={e => setVal(e.target.value)}
          placeholder="Ajouter une note pour l'équipe…"
          style={{
            flex: 1, border: 'none', outline: 'none', resize: 'none',
            padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', minHeight: 60, background: 'transparent',
          }}/>
        <Button variant={val ? 'primary' : 'neutral'} size="sm" style={{ margin: 6 }}>Ajouter</Button>
      </div>
    </Card>
  );
}

function ContexteSection() {
  const items = [
    { icon: 'briefcase', label: 'Industrie',     value: ANDREAS.industry },
    { icon: 'users',     label: 'Taille',        value: ANDREAS.size },
    { icon: 'map',       label: 'Localisation',  value: ANDREAS.location },
    { icon: 'globe',     label: 'Site web',      value: ANDREAS.website },
  ];
  return (
    <Card padding={20}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Contexte entreprise</h3>
        <Button variant="ghost" size="sm" icon="sparkles">Enrichir</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {items.map(it => (
          <div key={it.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={it.icon} size={14}/>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{it.label}</div>
              <div style={{ fontSize: 13.5, color: '#0f172a', marginTop: 2, fontWeight: 500 }}>{it.value || <span style={{ color: '#cbd5e1', fontWeight: 400 }}>Non renseigné</span>}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MetadonneesSection() {
  const [open, setOpen] = useState(false);
  return (
    <Card padding={open ? 20 : 14}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Métadonnées</h3>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} style={{ color: '#94a3b8' }}/>
      </div>
      {open && (
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: 12.5 }}>
          {[
            ['Source d’acquisition', 'LinkedIn (extension)'],
            ['Date de création', '12 avril 2026'],
            ['Dernière mise à jour', '26 avril 2026'],
            ['Liste(s)', 'Inbound Avril 2026'],
            ['Auteur', 'Sebastian Bodin'],
            ['ID interne', 'prsp_8f3a2c91'],
          ].map(([k,v]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{k}</div>
              <div style={{ color: '#334155', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Right column

function SyntheseCard() {
  return (
    <Card padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Synthèse</span>
        <StatusPill status={ANDREAS.status} size="lg"/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Dans le pipeline</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>14 jours</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Entré le</div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: '#0f172a', marginTop: 4 }}>13 avril 2026</div>
        </div>
      </div>
      <div style={{ paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 8 }}>Engagement</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: 'message', label: 'Messages échangés', value: '5' },
            { icon: 'calendar', label: 'RDV bookés', value: '1' },
            { icon: 'check', label: 'No-show', value: '0' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
              <Icon name={s.icon} size={13} style={{ color: '#94a3b8' }}/>
              <span style={{ color: '#475569' }}>{s.label}</span>
              <div style={{ flex: 1 }}/>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ paddingTop: 14, borderTop: '1px solid #f1f5f9', marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name="Sebastian Bodin" size={26}/>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Commercial assigné</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>Sebastian Bodin</div>
        </div>
      </div>
    </Card>
  );
}

function NextActionCard() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0052D9 0%, #1A6AFF 100%)',
      borderRadius: 12, padding: 18, color: 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="target" size={14} style={{ opacity: 0.9 }}/>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, opacity: 0.9 }}>Prochaine action suggérée</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>Étape Proposition depuis 14 jours</div>
      <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4, lineHeight: 1.5 }}>
        Dernière réponse il y a 2 jours · Le prospect a annoncé un retour jeudi. Programmer une relance vendredi si pas de nouvelle.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button style={{
          flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8,
          background: 'white', color: '#0052D9', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
        }}>Programmer une relance</button>
        <button style={{
          padding: '8px 12px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
          background: 'transparent', color: 'white', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
        }}>Plus tard</button>
      </div>
    </div>
  );
}

function DocumentsCard() {
  return (
    <Card padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Documents & devis</span>
        <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '2px 7px', borderRadius: 999, fontWeight: 600, textTransform: 'uppercase' }}>V2</span>
      </div>
      <div style={{
        border: '1.5px dashed #cbd5e1', borderRadius: 10, padding: '20px 14px',
        textAlign: 'center', background: '#fbfcfe',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e8f0fd', color: '#0052D9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Icon name="file" size={16}/>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: '#475569' }}>Glissez un devis ou contrat ici</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>PDF, DOCX · L'extraction du montant arrivera en V2</div>
      </div>
    </Card>
  );
}

// Header / banner
function HeaderBanner() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Card padding={22}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <Avatar name={ANDREAS.name} size={84}/>
        <div style={{ flex: '1 1 360px', minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>{ANDREAS.name}</h2>
            <StatusPill status={ANDREAS.status} size="lg"/>
            <a href="#" style={{ color: '#0052D9', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              <Icon name="externalLink" size={12}/>{ANDREAS.linkedinUrl}
            </a>
          </div>
          <div style={{ fontSize: 14, color: '#475569', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {ANDREAS.title}
            <span style={{ color: '#cbd5e1' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="building" size={13} style={{ color: '#94a3b8' }}/>{ANDREAS.company}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: '#dcfce7', color: '#15803d', fontSize: 11.5, fontWeight: 500 }}>
              <Icon name="sparkles" size={10}/>Enrichi il y a {ANDREAS.enrichedDaysAgo}j
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: '#f1f5f9', color: '#475569', fontSize: 11.5, fontWeight: 500 }}>
              <Icon name="list" size={10}/>{ANDREAS.list}
            </span>
            <SourcePill source={ANDREAS.source}/>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="primary" icon="message">Démarrer conversation</Button>
          <Button variant="outline" icon="calendar">Programmer un RDV</Button>
          <Button variant="outline" icon="play">Ajouter à un parcours</Button>
          <button onClick={() => setMenuOpen(o => !o)} style={{
            width: 36, height: 36, borderRadius: 8,
            border: '1px solid #e2e8f0', background: menuOpen ? '#f1f5f9' : 'white',
            color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="moreVertical" size={15}/>
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: 44, right: 0, zIndex: 30,
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
              boxShadow: '0 10px 25px rgb(15 23 42 / 0.12)', width: 220, padding: 4,
            }}>
              {['Modifier','Enrichir','Inviter sur LinkedIn','Inviter avec message','Session d’appels','Associer une conversation existante'].map(it => (
                <div key={it} style={{ padding: '7px 10px', borderRadius: 6, fontSize: 13, color: '#334155', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{it}</div>
              ))}
              <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }}/>
              <div style={{ padding: '7px 10px', borderRadius: 6, fontSize: 13, color: '#b91c1c', cursor: 'pointer' }}>Supprimer</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Profile() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f6f7f9' }}>
      <Sidebar active="crm"/>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar title="CRM"/>
        {/* Breadcrumb */}
        <div style={{ padding: '14px 28px 4px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#64748b' }}>
          <a href="CRM.html" style={{ color: '#0052D9', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="arrowLeft" size={13}/>Retour
          </a>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span>CRM</span><span style={{ color: '#cbd5e1' }}>›</span>
          <span>Prospects</span><span style={{ color: '#cbd5e1' }}>›</span>
          <span style={{ color: '#0f172a', fontWeight: 500 }}>{ANDREAS.name}</span>
        </div>

        <div style={{ padding: '12px 28px 60px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 18 }}>
          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <HeaderBanner/>
            <PipelineWorkflowSection/>
            <TimelineSection/>
            <ConversationsSection/>
            <NotesSection/>
            <ContexteSection/>
            <MetadonneesSection/>
          </div>

          {/* Right col (sticky) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 76, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
            <NextActionCard/>
            <SyntheseCard/>
            <DocumentsCard/>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Profile });
