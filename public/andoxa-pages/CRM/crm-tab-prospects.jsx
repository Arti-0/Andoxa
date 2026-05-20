// CRM Tab — Prospects (enriched table)
const { useState, useMemo } = React;

function ProspectsTab({ onOpenProspect, listFilter, onListFilter }) {
  const [filter, setFilter] = useState('tous');
  const [selected, setSelected] = useState(new Set());
  const [openMenu, setOpenMenu] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [view, setView] = useState('table'); // 'table' | 'compact'

  // Filtres mutuellement exclusifs (chaque prospect a un seul statut)
  const filters = [
    { id: 'tous',      label: 'Tous',         test: () => true },
    { id: 'nouveaux',  label: 'Nouveaux',     test: p => p.status === 'nouveau' },
    { id: 'encours',   label: 'En cours',     test: p => ['contacte','qualifie'].includes(p.status) },
    { id: 'rdv',       label: 'RDV',          test: p => p.status === 'rdv' },
    { id: 'proposition', label: 'Proposition', test: p => p.status === 'proposition' },
    { id: 'signe',     label: 'Closed won',   test: p => p.status === 'signe' },
    { id: 'perdu',     label: 'Closed lost',  test: p => p.status === 'perdu' },
  ];

  const f = filters.find(f => f.id === filter);
  const baseRows = PROSPECTS.filter(f.test);
  const rows = listFilter ? baseRows.filter(p => p.list === listFilter) : baseRows;
  const counts = filters.reduce((acc, ff) => { acc[ff.id] = PROSPECTS.filter(ff.test).length; return acc; }, {});
  const enCours = PROSPECTS.filter(p => p.status !== 'perdu' && p.status !== 'signe').length;
  const signe = PROSPECTS.filter(p => p.status === 'signe').length;
  const lost = PROSPECTS.filter(p => p.status === 'perdu').length;

  const toggleSelect = (id) => {
    setSelected(s => {
      const ns = new Set(s);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  };
  const toggleAll = () => {
    setSelected(s => s.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  };

  // Gradation par nombre de jours de silence
  const silenceTier = (label) => {
    const m = /silence\s+(\d+)/i.exec(label || '');
    if (!m) return null;
    const d = parseInt(m[1], 10);
    if (d >= 15) return 'red';
    if (d >= 11) return 'orange';
    if (d >= 7)  return 'amber';
    return null;
  };
  const tierColor = t => t === 'red' ? '#b91c1c' : t === 'orange' ? '#c2410c' : t === 'amber' ? '#b45309' : '#475569';
  const tierBg    = t => t === 'red' ? '#fef2f2' : t === 'orange' ? '#fff7ed' : t === 'amber' ? '#fffbeb' : 'transparent';
  const tierDot   = t => t === 'red' ? '#ef4444' : t === 'orange' ? '#f97316' : t === 'amber' ? '#f59e0b' : null;

  return (
    <div style={{ padding: '20px 28px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Prospects</h1>
          <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
            {PROSPECTS.length} prospects · <span style={{ color: '#0052D9', fontWeight: 500 }}>{enCours} en cours</span> · {signe} signé{signe > 1 ? 's' : ''} · {lost} perdus
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
            {[['list','Tableau','table'],['layers','Compact','compact']].map(([ic,lbl,id]) => {
              const active = view === id;
              return (
                <button key={id} onClick={() => setView(id)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                  fontSize: 12, fontWeight: 500, border: 'none',
                  background: active ? 'white' : 'transparent',
                  color: active ? '#0f172a' : '#64748b',
                  borderRadius: 6, cursor: 'pointer',
                  boxShadow: active ? '0 1px 2px rgb(15 23 42 / 0.08)' : 'none',
                }}>
                  <Icon name={ic} size={12}/>{lbl}
                </button>
              );
            })}
          </div>
          <Button variant="neutral" icon="filter">Filtres</Button>
          <Button variant="outline" icon="upload">Importer un CSV</Button>
          <Button variant="primary" icon="plus">Nouveau prospect</Button>
        </div>
      </div>

      {listFilter && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: '#eef4fe', border: '1px solid #cfdcf4', borderRadius: 10, marginBottom: 14,
        }}>
          <Icon name="layers" size={14} style={{ color: '#0052D9' }}/>
          <span style={{ fontSize: 13, color: '#0f172a' }}>
            Filtré sur la liste <b>« {listFilter} »</b> · {rows.length} prospect{rows.length > 1 ? 's' : ''}
          </span>
          <div style={{ flex: 1 }}/>
          <button onClick={() => onListFilter && onListFilter(null)} style={{
            background: 'white', border: '1px solid #cfdcf4', borderRadius: 6,
            padding: '4px 10px', fontSize: 12, color: '#0052D9', fontWeight: 500, cursor: 'pointer',
          }}>Effacer le filtre</button>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {filters.map(ff => {
          const isActive = ff.id === filter;
          return (
            <button key={ff.id} onClick={() => setFilter(ff.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
              border: '1px solid', cursor: 'pointer',
              borderColor: isActive ? '#0052D9' : '#e2e8f0',
              background: isActive ? '#e8f0fd' : 'white',
              color: isActive ? '#0052D9' : '#475569',
            }}>
              {ff.label}
              <span style={{
                fontSize: 11, padding: '0 6px', borderRadius: 999,
                background: isActive ? '#0052D9' : '#f1f5f9',
                color: isActive ? 'white' : '#64748b', minWidth: 18, textAlign: 'center',
              }}>{counts[ff.id]}</span>
            </button>
          );
        })}
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, color: '#94a3b8', width: 230 }}>
          <Icon name="search" size={13}/>
          <span>Filtrer dans la liste…</span>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, fontSize: 12.5, color: '#475569', cursor: 'pointer' }}>
          Trier : Activité <Icon name="chevronDown" size={11}/>
        </button>
      </div>

      {/* Bulk action bar (when selected) */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: '#0f172a', color: 'white', borderRadius: 10, marginBottom: 10,
          fontSize: 13,
        }}>
          <span style={{ fontWeight: 600 }}>{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
          <span style={{ width: 1, height: 16, background: '#334155' }}/>
          <button style={pillBtn}>Ajouter à une liste</button>
          <button style={pillBtn}>Ajouter à un parcours WhatsApp</button>
          <button style={pillBtn}>Changer le statut</button>
          <button style={{ ...pillBtn, color: '#fca5a5' }}>Supprimer</button>
          <div style={{ flex: 1 }}/>
          <button onClick={() => setSelected(new Set())} style={{ ...pillBtn, color: '#94a3b8' }}>Annuler</button>
        </div>
      )}

      {/* Table */}
      {view === 'table' && (
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ ...thStyle, width: 36 }}>
                <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} style={{ accentColor: '#0052D9' }}/>
              </th>
              <th style={thStyle}>Prospect</th>
              <th style={thStyle}>Statut pipeline</th>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Dernière activité</th>
              <th style={thStyle}>Workflow</th>
              <th style={thStyle}>Canaux</th>
              <th style={{ ...thStyle, width: 120, textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const tier = silenceTier(p.lastActivity.label);
              const isOpen = openMenu === p.id;
              const isHovered = hoverRow === p.id;
              return (
                <tr key={p.id}
                  onMouseEnter={() => setHoverRow(p.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: hoverRow === p.id ? '#fbfcfe' : 'white',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    if (e.target.closest('input,button,a,[data-stop]')) return;
                    onOpenProspect && onOpenProspect(p.id);
                  }}>
                  <td style={tdStyle}>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} style={{ accentColor: '#0052D9' }}/>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={p.name} size={34}/>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                          {p.title ? `${p.title}` : '—'}{p.company ? ` · ${p.company}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}><StatusPill status={p.status}/></td>
                  <td style={tdStyle}><SourcePill source={p.source} list={p.list} importedAt={p.importedAt && p.importedAt.date} onClick={(_, list) => onListFilter && onListFilter(list)}/></td>
                  <td style={tdStyle}>
                    {tier ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 8px', borderRadius: 6,
                        background: tierBg(tier), color: tierColor(tier),
                        fontSize: 12.5, fontWeight: 500,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: tierDot(tier) }}/>
                        {p.lastActivity.label}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12.5, color: '#475569' }}>{p.lastActivity.label}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {p.workflow ? (
                      <span data-stop style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '3px 8px', borderRadius: 6,
                        background: '#f5f3ff', color: '#6d28d9',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      }}>
                        <Icon name="play" size={9}/>{p.workflow.name} · {p.workflow.step}/{p.workflow.total}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div data-stop style={{ display: 'flex', gap: 4 }}>
                      {p.convs.length === 0 && <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                      {p.convs.map(c => <ChannelTooltipDot key={c} kind={c} size={20}/>)}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', position: 'relative' }}>
                    <div data-stop style={{ display: 'inline-flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                      {(isHovered || isOpen) && (
                        <React.Fragment>
                          <button onClick={(e) => e.stopPropagation()} title="Démarrer une conversation" style={rowActionBtn}>
                            <Icon name="message" size={13}/>
                          </button>
                          <button onClick={(e) => e.stopPropagation()} title="Programmer un RDV" style={rowActionBtn}>
                            <Icon name="calendar" size={13}/>
                          </button>
                        </React.Fragment>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenu(isOpen ? null : p.id); }} style={{
                        width: 28, height: 28, borderRadius: 6, border: 'none',
                        background: isOpen ? '#f1f5f9' : 'transparent', color: '#64748b',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="moreVertical" size={14}/>
                      </button>
                    </div>
                    {isOpen && (
                      <div data-stop onClick={(e) => e.stopPropagation()} style={{
                        position: 'absolute', right: 12, top: 38, zIndex: 20,
                        background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
                        boxShadow: '0 10px 25px rgb(15 23 42 / 0.12)', width: 220, padding: 4,
                      }}>
                        {['Modifier','Inviter sur LinkedIn','Ajouter à un parcours','Ajouter à une liste'].map(item => (
                          <div key={item} style={menuItem}>{item}</div>
                        ))}
                        <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }}/>
                        <div style={{ ...menuItem, color: '#b91c1c' }}>Supprimer</div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{rows.length} prospects · Page 1 sur 1</span>
            <button style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="columns" size={12}/>Colonnes
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={pageBtn} disabled>Précédent</button>
            <button style={pageBtn} disabled>Suivant</button>
          </div>
        </div>
      </div>
      )}

      {view === 'compact' && <CompactView rows={rows} selected={selected} toggleSelect={toggleSelect} toggleAll={toggleAll} hoverRow={hoverRow} setHoverRow={setHoverRow} openMenu={openMenu} setOpenMenu={setOpenMenu} onOpenProspect={onOpenProspect} onListFilter={onListFilter}/>}
    </div>
  );
}

// Mini channel dot with rich tooltip
function ChannelTooltipDot({ kind, size = 20 }) {
  const [hover, setHover] = useState(false);
  const isLI = kind === 'linkedin' || kind === 'linkedin_ext' || kind === 'linkedin_manual';
  const label = isLI ? 'Conversation LinkedIn active'
              : kind === 'whatsapp' ? 'Conversation WhatsApp active'
              : kind === 'booking' ? 'RDV via Booking'
              : 'Conversation';
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>
      <ChannelDot kind={kind} size={size}/>
      {hover && (
        <span style={{
          position: 'absolute', left: '50%', top: 'calc(100% + 6px)', transform: 'translateX(-50%)',
          zIndex: 30, background: '#0f172a', color: 'white', fontSize: 11,
          padding: '6px 9px', borderRadius: 6, whiteSpace: 'nowrap',
          boxShadow: '0 6px 16px rgb(15 23 42 / 0.18)', pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start',
        }}>
          <span>{label}</span>
          <span style={{ color: '#7dd3fc', fontWeight: 500 }}>Voir dans la Messagerie →</span>
        </span>
      )}
    </span>
  );
}

// ─── Compact view ───────────────────────────────────────────
function CompactView({ rows, selected, toggleSelect, toggleAll, hoverRow, setHoverRow, openMenu, setOpenMenu, onOpenProspect, onListFilter }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '32px 1fr 130px 100px 150px 160px 70px 40px',
        alignItems: 'center', gap: 12, padding: '8px 14px',
        borderBottom: '1px solid #e5e7eb', background: '#fafbfc',
        fontSize: 10.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} style={{ accentColor: '#0052D9' }}/>
        <span>Prospect</span><span>Statut</span><span>Source</span>
        <span>Activité</span><span>Workflow</span><span>Canaux</span><span/>
      </div>
      {rows.map(p => {
        const m = /silence\s+(\d+)/i.exec(p.lastActivity.label || '');
        let tier = null;
        if (m) { const d = parseInt(m[1], 10); tier = d >= 15 ? 'red' : d >= 11 ? 'orange' : d >= 7 ? 'amber' : null; }
        const tColor = tier === 'red' ? '#b91c1c' : tier === 'orange' ? '#c2410c' : tier === 'amber' ? '#b45309' : '#475569';
        const tDot   = tier === 'red' ? '#ef4444' : tier === 'orange' ? '#f97316' : tier === 'amber' ? '#f59e0b' : null;
        const isOpen = openMenu === p.id;
        const isHovered = hoverRow === p.id;
        return (
          <div key={p.id}
            onMouseEnter={() => setHoverRow(p.id)} onMouseLeave={() => setHoverRow(null)}
            onClick={(e) => { if (e.target.closest('input,button,a,[data-stop]')) return; onOpenProspect && onOpenProspect(p.id); }}
            style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 130px 100px 150px 160px 70px 40px',
              alignItems: 'center', gap: 12, padding: '7px 14px',
              borderBottom: '1px solid #f5f7fa',
              background: hoverRow === p.id ? '#f8fafd' : 'white',
              cursor: 'pointer', fontSize: 12.5,
            }}>
            <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} style={{ accentColor: '#0052D9' }}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Avatar name={p.name} size={24}/>
              <span style={{ fontWeight: 500, color: '#0f172a', whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ color: '#94a3b8' }}>·</span>
              <span style={{ fontSize: 11.5, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{p.company || 'Sans société'}</span>
            </div>
            <StatusPill status={p.status}/>
            <SourcePill source={p.source} list={p.list} importedAt={p.importedAt && p.importedAt.date} onClick={(_, list) => onListFilter && onListFilter(list)}/>
            <span style={{ color: tColor, fontSize: 11.5, fontWeight: tier ? 500 : 400, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {tDot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: tDot }}/>}
              {p.lastActivity.label}
            </span>
            <span style={{ fontSize: 11.5, color: p.workflow ? '#6d28d9' : '#cbd5e1', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.workflow ? `${p.workflow.name} · ${p.workflow.step}/${p.workflow.total}` : '—'}
            </span>
            <div data-stop style={{ display: 'flex', gap: 3 }}>
              {p.convs.length === 0 ? <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span> : p.convs.map(c => <ChannelTooltipDot key={c} kind={c} size={14}/>)}
            </div>
            <div data-stop style={{ position: 'relative', textAlign: 'right', display: 'inline-flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
              {(isHovered || isOpen) && (
                <React.Fragment>
                  <button onClick={(e) => e.stopPropagation()} title="Démarrer une conversation" style={{ ...rowActionBtn, width: 24, height: 24 }}>
                    <Icon name="message" size={12}/>
                  </button>
                  <button onClick={(e) => e.stopPropagation()} title="Programmer un RDV" style={{ ...rowActionBtn, width: 24, height: 24 }}>
                    <Icon name="calendar" size={12}/>
                  </button>
                </React.Fragment>
              )}
              <button onClick={(e) => { e.stopPropagation(); setOpenMenu(isOpen ? null : p.id); }} style={{
                width: 24, height: 24, borderRadius: 5, border: 'none',
                background: isOpen ? '#f1f5f9' : 'transparent', color: '#64748b', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="moreVertical" size={13}/>
              </button>
              {isOpen && (
                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 28, zIndex: 20, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 10px 25px rgb(15 23 42 / 0.12)', width: 220, padding: 4 }}>
                  {['Modifier','Inviter sur LinkedIn','Ajouter à un parcours','Ajouter à une liste'].map(it => (<div key={it} style={menuItem}>{it}</div>))}
                  <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }}/>
                  <div style={{ ...menuItem, color: '#b91c1c' }}>Supprimer</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div style={{ padding: '8px 14px', fontSize: 11.5, color: '#64748b', borderTop: '1px solid #f1f5f9' }}>{rows.length} prospects · Vue compact</div>
    </div>
  );
}

const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdStyle = { padding: '12px 16px', verticalAlign: 'middle' };
const pillBtn = { background: 'transparent', border: 'none', color: 'white', fontSize: 12.5, padding: '5px 9px', borderRadius: 6, cursor: 'pointer' };
const menuItem = { padding: '7px 10px', borderRadius: 6, fontSize: 13, color: '#334155', cursor: 'pointer' };
const pageBtn = { padding: '5px 12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: 6, fontSize: 12, color: '#94a3b8', cursor: 'not-allowed' };
const rowActionBtn = { width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

// ─── Empty state (premier login) ────────────────────────────
function ProspectsEmpty() {
  return (
    <div style={{ padding: '20px 28px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Prospects</h1>
          <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>Aucun prospect pour le moment</div>
        </div>
      </div>

      <div style={{
        background: 'white', border: '1px solid #e5e7eb', borderRadius: 16,
        padding: '64px 32px 56px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Soft halo */}
        <div aria-hidden style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 540, height: 540, borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(0,82,217,0.10), rgba(0,82,217,0) 65%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
          {/* LinkedIn × Andoxa illustration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, background: '#0a66c2',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em',
              boxShadow: '0 10px 24px rgb(10 102 194 / 0.25)',
            }}>in</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }}/>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }}/>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }}/>
            </div>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, #0052D9 0%, #2271ee 100%)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em',
              boxShadow: '0 10px 24px rgb(0 82 217 / 0.30)',
            }}>A</div>
          </div>

          <div style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>Bienvenue dans Andoxa</div>
          <p style={{ fontSize: 14, color: '#475569', maxWidth: 480, lineHeight: 1.55, margin: '4px 0 0', textWrap: 'pretty' }}>
            Andoxa importe vos prospects directement depuis LinkedIn grâce à notre extension Chrome. Installez‑la pour démarrer en un clic.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
            <Button variant="primary" icon="globe">Installer l'extension Chrome</Button>
            <button style={{
              background: 'transparent', border: 'none', color: '#475569', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', padding: '8px 12px',
            }}>Ou ajouter un prospect manuellement</button>
          </div>

          {/* Steps */}
          <div style={{
            marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14, width: '100%', maxWidth: 760,
          }}>
            {[
              { n: '1', title: 'Installez l\'extension', body: 'Ajoutez Andoxa à Chrome — 30 secondes.', icon: 'upload' },
              { n: '2', title: 'Ouvrez LinkedIn',         body: 'Lancez une recherche ou ouvrez un profil.', icon: 'search' },
              { n: '3', title: 'Cliquez sur Andoxa',      body: 'Choisissez une liste et nous enrichissons le prospect automatiquement.', icon: 'sparkles' },
            ].map(s => (
              <div key={s.n} style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                padding: 14, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#0052D9', color: 'white',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>{s.n}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{s.title}</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProspectsTab, ProspectsEmpty });
