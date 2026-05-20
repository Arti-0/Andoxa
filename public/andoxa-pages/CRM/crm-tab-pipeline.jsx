// CRM Tab — Pipeline (Tableau hybride : funnel agrégé + sections repliables par étape)
const { useState, useMemo } = React;

// Variation hebdo mockée par étape (pour la flèche de tendance)
const TREND = {
  nouveau:     { delta: +2, dir: 'up' },
  contacte:    { delta: +1, dir: 'up' },
  qualifie:    { delta:  0, dir: 'flat' },
  rdv:         { delta: +1, dir: 'up' },
  proposition: { delta: -1, dir: 'down' },
  signe:       { delta: +1, dir: 'up' },
  perdu:       { delta:  0, dir: 'flat' },
};

const CYCLE = { nouveau: 1, contacte: 4, qualifie: 6, rdv: 5, proposition: 14, signe: 8, perdu: 12 };

function PipelineTab({ onOpenProspect }) {
  const [items, setItems] = useState(PROSPECTS);
  const [search, setSearch] = useState('');
  const [groupMode, setGroupMode] = useState('grouped'); // 'grouped' | 'list'
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState('lastActivity'); // entry | lastActivity | silence | alpha
  const [collapsed, setCollapsed] = useState(() => new Set()); // étapes repliées
  const [pillMenu, setPillMenu] = useState(null); // prospect id dont la pill est ouverte
  const [rowMenu, setRowMenu] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [funnelFilter, setFunnelFilter] = useState(null); // étape filtrée via clic funnel
  const [toast, setToast] = useState(null);

  // Recherche + filtre funnel
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(p => {
      if (funnelFilter && p.status !== funnelFilter) return false;
      if (!q) return true;
      return [p.name, p.company, p.title].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [items, search, funnelFilter]);

  // Counts par étape (sur la base totale, pas filtrée — pour la stabilité du funnel)
  const counts = useMemo(() => {
    const m = {};
    PIPELINE_ORDER.forEach(id => { m[id] = 0; });
    items.forEach(p => { if (m[p.status] !== undefined) m[p.status]++; });
    return m;
  }, [items]);

  const totalActifs = items.filter(p => p.status !== 'perdu' && p.status !== 'signe').length;

  // Tri intra-section
  const sortFn = (a, b) => {
    if (sortBy === 'alpha') return a.name.localeCompare(b.name);
    if (sortBy === 'entry') return (b.enteredAt || 0) - (a.enteredAt || 0);
    if (sortBy === 'silence') {
      const sa = parseSilence(a.lastActivity.label), sb = parseSilence(b.lastActivity.label);
      return (sb || 0) - (sa || 0);
    }
    return (a.enteredAt || 0) - (b.enteredAt || 0);
  };

  const toggleCollapse = (id) => {
    setCollapsed(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const moveProspect = (pid, newStatus) => {
    const prospect = items.find(p => p.id === pid);
    setItems(its => its.map(p => p.id === pid ? { ...p, status: newStatus } : p));
    setPillMenu(null);
    if (prospect && prospect.status !== newStatus) {
      setToast({ name: prospect.name, status: STATUSES[newStatus].label });
      setTimeout(() => setToast(null), 2800);
    }
  };

  const toggleSelect = (pid) => setSelected(s => { const n = new Set(s); n.has(pid) ? n.delete(pid) : n.add(pid); return n; });
  const clearSelection = () => setSelected(new Set());

  const onFunnelClick = (id) => {
    if (funnelFilter === id) {
      setFunnelFilter(null);
    } else {
      setFunnelFilter(id);
      // Déplie la section ciblée, replie les autres
      setCollapsed(new Set(PIPELINE_ORDER.filter(s => s !== id)));
    }
  };

  // Overall conversion : nouveau → signe
  const conversionRate = Math.round((counts.signe / Math.max(items.length, 1)) * 100);

  return (
    <div style={{ padding: '20px 28px 80px', minHeight: 'calc(100vh - 56px)', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Pipeline</h1>
          <div style={{ marginTop: 4, fontSize: 12.5, color: '#64748b' }}>
            {totalActifs} prospects actifs · Cycle moyen <span style={{ color: '#0f172a', fontWeight: 500 }}>14 jours</span> par étape · Taux de conversion global : <span style={{ color: '#0f172a', fontWeight: 500 }}>{conversionRate}%</span>
          </div>
        </div>
      </div>

      {/* Mini-funnel agrégé */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6,
        marginBottom: 18,
      }}>
        {PIPELINE_ORDER.map(id => {
          const s = STATUSES[id];
          const t = TREND[id];
          const isActive = funnelFilter === id;
          return (
            <button key={id} onClick={() => onFunnelClick(id)}
              style={{
                background: isActive ? s.bg : 'white',
                border: `1px solid ${isActive ? s.dot : '#e5e7eb'}`,
                borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 120ms', display: 'flex', flexDirection: 'column', gap: 4,
                outline: 'none',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = '#cbd5e1'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = '#e5e7eb'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }}/>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 500, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>{counts[id]}</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  fontSize: 10.5, fontWeight: 500,
                  color: t.dir === 'up' ? '#15803d' : t.dir === 'down' ? '#b91c1c' : '#94a3b8',
                }}>
                  {t.dir === 'up' && <Icon name="arrowUp" size={9}/>}
                  {t.dir === 'down' && <Icon name="arrowDown" size={9}/>}
                  {t.dir !== 'flat' && (t.delta > 0 ? '+' : '') + t.delta}
                  {t.dir === 'flat' && '—'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Funnel filter banner */}
      {funnelFilter && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 11px', borderRadius: 999,
          background: '#f1f5f9', color: '#334155',
          fontSize: 12, marginBottom: 12,
        }}>
          Filtré sur <strong style={{ fontWeight: 600 }}>{STATUSES[funnelFilter].label}</strong>
          <button onClick={() => { setFunnelFilter(null); setCollapsed(new Set()); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'inline-flex', alignItems: 'center' }}>
            <Icon name="x" size={11}/>
          </button>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          width: 320, padding: '7px 11px',
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
        }}>
          <Icon name="search" size={13} style={{ color: '#94a3b8' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un prospect…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', background: 'transparent', minWidth: 0 }}/>
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'inline-flex' }}>
              <Icon name="x" size={11}/>
            </button>
          )}
        </div>

        {/* Filtres */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setFiltersOpen(o => !o); setSortOpen(false); }}
            style={actionBtnStyle(filtersOpen)}>
            <Icon name="filter" size={12}/> Filtres
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 16, height: 16, padding: '0 5px',
              background: '#0052D9', color: 'white',
              borderRadius: 999, fontSize: 10, fontWeight: 700,
            }}>2</span>
            <Icon name="chevronDown" size={10} style={{ color: '#94a3b8' }}/>
          </button>
          {filtersOpen && (
            <FiltersPopover onClose={() => setFiltersOpen(false)}/>
          )}
        </div>

        {/* Tri */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setSortOpen(o => !o); setFiltersOpen(false); }}
            style={actionBtnStyle(sortOpen)}>
            <Icon name="sort" size={12}/> Trier
            <Icon name="chevronDown" size={10} style={{ color: '#94a3b8' }}/>
          </button>
          {sortOpen && (
            <div style={popoverStyle(220)}>
              {[
                ['entry',         'Date d\u2019entrée pipeline'],
                ['lastActivity',  'Dernière activité'],
                ['silence',       'Silence'],
                ['alpha',         'Alphabétique'],
              ].map(([id, label]) => (
                <div key={id} onClick={() => { setSortBy(id); setSortOpen(false); }}
                  style={{
                    padding: '7px 10px', borderRadius: 6, fontSize: 12.5,
                    color: sortBy === id ? '#0052D9' : '#334155',
                    fontWeight: sortBy === id ? 600 : 400,
                    background: sortBy === id ? '#f4f8fe' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                  {label}
                  {sortBy === id && <Icon name="check" size={11}/>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}/>

        {/* Toggle vue */}
        <div style={{
          display: 'inline-flex', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 3, gap: 2,
        }}>
          {[['grouped', 'Groupé', 'layers'], ['list', 'Liste', 'list']].map(([id, label, ic]) => {
            const active = groupMode === id;
            return (
              <button key={id} onClick={() => setGroupMode(id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', border: 'none', borderRadius: 6,
                background: active ? '#0052D9' : 'transparent',
                color: active ? 'white' : '#475569',
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              }}>
                <Icon name={ic} size={11}/>{label}
              </button>
            );
          })}
        </div>

        <Button variant="primary" icon="plus">Nouveau prospect</Button>
      </div>

      {/* Liste : groupée OU continue */}
      {groupMode === 'grouped' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PIPELINE_ORDER.map(stageId => {
            const stage = STATUSES[stageId];
            const rows = filtered.filter(p => p.status === stageId).sort(sortFn);
            const isCollapsed = collapsed.has(stageId);
            const totalInStage = counts[stageId];
            const isEmpty = rows.length === 0;
            // Si funnel filtré, ne montre que la section concernée (autres sections cachées)
            if (funnelFilter && funnelFilter !== stageId) return null;
            return (
              <PipelineSection
                key={stageId}
                stage={stage}
                stageId={stageId}
                rows={rows}
                totalInStage={totalInStage}
                isCollapsed={isEmpty || isCollapsed}
                isEmpty={isEmpty}
                onToggle={() => toggleCollapse(stageId)}
                onOpenProspect={onOpenProspect}
                onMove={moveProspect}
                pillMenu={pillMenu}
                setPillMenu={setPillMenu}
                rowMenu={rowMenu}
                setRowMenu={setRowMenu}
                hoverRow={hoverRow}
                setHoverRow={setHoverRow}
                selected={selected}
                toggleSelect={toggleSelect}
              />
            );
          })}
        </div>
      ) : (
        <ContinuousList
          rows={[...filtered].sort(sortFn)}
          onOpenProspect={onOpenProspect}
          onMove={moveProspect}
          pillMenu={pillMenu}
          setPillMenu={setPillMenu}
          rowMenu={rowMenu}
          setRowMenu={setRowMenu}
          hoverRow={hoverRow}
          setHoverRow={setHoverRow}
          selected={selected}
          toggleSelect={toggleSelect}
        />
      )}

      {/* Empty state global (recherche sans résultat) */}
      {filtered.length === 0 && (
        <div style={{
          padding: '48px 24px', textAlign: 'center', background: 'white',
          border: '1px dashed #e2e8f0', borderRadius: 12, marginTop: 12,
        }}>
          <div style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>Aucun prospect trouvé</div>
          <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
            {search ? `Aucun résultat pour « ${search} »` : 'Ajustez les filtres pour voir plus de prospects'}
          </div>
        </div>
      )}

      {/* Bulk action bar (sticky bottom) */}
      {selected.size > 0 && (
        <BulkBar count={selected.size} onClear={clearSelection} onMove={(st) => {
          [...selected].forEach(pid => moveProspect(pid, st));
          clearSelection();
        }}/>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#0f172a', color: 'white',
          padding: '10px 16px', borderRadius: 8, fontSize: 13,
          boxShadow: '0 10px 25px rgb(15 23 42 / 0.25)', zIndex: 60,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="check" size={13} style={{ color: '#22d3ee' }}/>
          <span><strong>{toast.name}</strong> déplacé vers <strong>{toast.status}</strong></span>
        </div>
      )}

      {/* Click-outside backdrop pour menus pills */}
      {(pillMenu || rowMenu || filtersOpen || sortOpen) && (
        <div onClick={() => { setPillMenu(null); setRowMenu(null); setFiltersOpen(false); setSortOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 5 }}/>
      )}
    </div>
  );
}

// ─── Section pipeline (header + rows) ───────────────────────
function PipelineSection({ stage, stageId, rows, totalInStage, isCollapsed, isEmpty, onToggle, onOpenProspect, onMove, pillMenu, setPillMenu, rowMenu, setRowMenu, hoverRow, setHoverRow, selected, toggleSelect }) {
  return (
    <div style={{
      background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'visible',
      opacity: isEmpty ? 0.7 : 1,
    }}>
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '12px 16px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        borderBottom: !isCollapsed ? '1px solid #f1f5f9' : 'none',
        textAlign: 'left',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.dot, flexShrink: 0 }}/>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: isEmpty ? '#94a3b8' : '#0f172a' }}>{stage.label}</span>
        <span style={{ fontSize: 12.5, color: '#64748b' }}>({totalInStage} prospect{totalInStage > 1 ? 's' : ''})</span>
        <span style={{ fontSize: 11.5, color: '#94a3b8', marginLeft: 6 }}>Cycle moyen : {CYCLE[stageId]}j</span>
        <span style={{ flex: 1 }}/>
        <Icon name="chevronDown" size={13} style={{ color: '#94a3b8', transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 150ms' }}/>
      </button>

      {!isCollapsed && rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 36 }}/>
            <col/>
            <col style={{ width: 130 }}/>
            <col style={{ width: 110 }}/>
            <col style={{ width: 150 }}/>
            <col style={{ width: 140 }}/>
            <col style={{ width: 80 }}/>
            <col style={{ width: 110 }}/>
          </colgroup>
          <tbody>
            {rows.map(p => (
              <ProspectRow key={p.id} p={p}
                onOpenProspect={onOpenProspect}
                onMove={onMove}
                pillMenu={pillMenu} setPillMenu={setPillMenu}
                rowMenu={rowMenu} setRowMenu={setRowMenu}
                hoverRow={hoverRow} setHoverRow={setHoverRow}
                selected={selected} toggleSelect={toggleSelect}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Liste continue ─────────────────────────────────────────
function ContinuousList({ rows, onOpenProspect, onMove, pillMenu, setPillMenu, rowMenu, setRowMenu, hoverRow, setHoverRow, selected, toggleSelect }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'visible' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 36 }}/>
          <col/>
          <col style={{ width: 130 }}/>
          <col style={{ width: 110 }}/>
          <col style={{ width: 150 }}/>
          <col style={{ width: 140 }}/>
          <col style={{ width: 80 }}/>
          <col style={{ width: 110 }}/>
        </colgroup>
        <thead>
          <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e5e7eb' }}>
            <th style={pTh}/>
            <th style={pTh}>Prospect</th>
            <th style={pTh}>Étape</th>
            <th style={pTh}>Source</th>
            <th style={pTh}>Activité</th>
            <th style={pTh}>Workflow</th>
            <th style={pTh}>Canaux</th>
            <th style={pTh}/>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <ProspectRow key={p.id} p={p}
              onOpenProspect={onOpenProspect}
              onMove={onMove}
              pillMenu={pillMenu} setPillMenu={setPillMenu}
              rowMenu={rowMenu} setRowMenu={setRowMenu}
              hoverRow={hoverRow} setHoverRow={setHoverRow}
              selected={selected} toggleSelect={toggleSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Ligne prospect (réutilisée par les deux modes) ─────────
function ProspectRow({ p, onOpenProspect, onMove, pillMenu, setPillMenu, rowMenu, setRowMenu, hoverRow, setHoverRow, selected, toggleSelect }) {
  const tier = silenceTier(p.lastActivity.label);
  const tColor = tier === 'red' ? '#b91c1c' : tier === 'orange' ? '#c2410c' : tier === 'amber' ? '#b45309' : '#475569';
  const tBg    = tier === 'red' ? '#fef2f2' : tier === 'orange' ? '#fff7ed' : tier === 'amber' ? '#fffbeb' : 'transparent';
  const tDot   = tier === 'red' ? '#ef4444' : tier === 'orange' ? '#f97316' : tier === 'amber' ? '#f59e0b' : null;
  const isPillOpen = pillMenu === p.id;
  const isMenuOpen = rowMenu === p.id;
  const isHovered = hoverRow === p.id;

  return (
    <tr
      onMouseEnter={() => setHoverRow(p.id)} onMouseLeave={() => setHoverRow(null)}
      onClick={(e) => { if (e.target.closest('input,button,a,[data-stop]')) return; onOpenProspect && onOpenProspect(p.id); }}
      style={{
        borderBottom: '1px solid #f5f7fa', cursor: 'pointer',
        background: isHovered ? '#f8fafd' : 'white',
      }}>
      <td style={pTd}>
        <input type="checkbox" data-stop checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
          onClick={e => e.stopPropagation()}
          style={{ accentColor: '#0052D9' }}/>
      </td>
      <td style={pTd}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={p.name} size={32}/>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.company ? <strong style={{ fontWeight: 500, color: '#475569' }}>{p.company}</strong> : <span style={{ color: '#cbd5e1' }}>Sans société</span>}
              {p.title ? ` · ${p.title}` : ''}
            </div>
          </div>
        </div>
      </td>
      <td style={pTd}>
        <div style={{ position: 'relative', display: 'inline-block' }} data-stop>
          <button onClick={(e) => { e.stopPropagation(); setPillMenu(isPillOpen ? null : p.id); setRowMenu(null); }}
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <StatusPill status={p.status}/>
            <Icon name="chevronDown" size={9} style={{ color: '#94a3b8' }}/>
          </button>
          {isPillOpen && (
            <div onClick={e => e.stopPropagation()} style={{
              position: 'absolute', left: 0, top: 'calc(100% + 4px)', zIndex: 25,
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
              boxShadow: '0 10px 25px rgb(15 23 42 / 0.14)', width: 180, padding: 4,
            }}>
              <div style={{ padding: '4px 8px 6px', fontSize: 10.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Déplacer vers
              </div>
              {PIPELINE_ORDER.map(stId => {
                const s = STATUSES[stId];
                const active = p.status === stId;
                return (
                  <div key={stId} onClick={() => onMove(p.id, stId)}
                    style={{
                      padding: '6px 8px', borderRadius: 6, fontSize: 12.5,
                      cursor: 'pointer',
                      background: active ? '#f1f5f9' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }}/>
                    <span style={{ color: active ? '#0f172a' : '#475569', fontWeight: active ? 600 : 400 }}>{s.label}</span>
                    {active && <Icon name="check" size={11} style={{ marginLeft: 'auto', color: '#0052D9' }}/>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </td>
      <td style={pTd}>
        <SourcePill source={p.source} list={p.list}/>
      </td>
      <td style={pTd}>
        {tier ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 6,
            background: tBg, color: tColor,
            fontSize: 12, fontWeight: 500,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: tDot }}/>
            {p.lastActivity.label}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: '#475569' }}>{p.lastActivity.label}</span>
        )}
      </td>
      <td style={pTd}>
        {p.workflow ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="play" size={9} style={{ color: '#6d28d9' }}/>
            <span style={{ fontSize: 11.5, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {p.workflow.name}
            </span>
            <span style={{ fontSize: 11, color: '#6d28d9', fontWeight: 600, flexShrink: 0 }}>{p.workflow.step}/{p.workflow.total}</span>
          </div>
        ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
      </td>
      <td style={pTd}>
        <div style={{ display: 'flex', gap: 3 }} data-stop>
          {p.convs.length === 0 ? <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span> : p.convs.map(c => <ChannelDot key={c} kind={c} size={16}/>)}
        </div>
      </td>
      <td style={{ ...pTd, textAlign: 'right', position: 'relative' }}>
        <div data-stop style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          {(isHovered || isMenuOpen) && (
            <React.Fragment>
              <button onClick={e => e.stopPropagation()} title="Conversation" style={ghostBtn}>
                <Icon name="message" size={12}/>
              </button>
              <button onClick={e => e.stopPropagation()} title="RDV" style={ghostBtn}>
                <Icon name="calendar" size={12}/>
              </button>
            </React.Fragment>
          )}
          <button onClick={e => { e.stopPropagation(); setRowMenu(isMenuOpen ? null : p.id); setPillMenu(null); }} style={{
            ...ghostBtn,
            background: isMenuOpen ? '#f1f5f9' : 'transparent',
          }}>
            <Icon name="moreVertical" size={13}/>
          </button>
        </div>
        {isMenuOpen && (
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', right: 12, top: 38, zIndex: 25,
            background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
            boxShadow: '0 10px 25px rgb(15 23 42 / 0.12)', width: 220, padding: 4, textAlign: 'left',
          }}>
            {['Modifier','Inviter sur LinkedIn','Ajouter à un parcours','Ajouter à une liste'].map(it => (
              <div key={it} style={menuItemStyle}>{it}</div>
            ))}
            <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }}/>
            <div style={{ ...menuItemStyle, color: '#b91c1c' }}>Supprimer</div>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Bulk action bar ───────────────────────────────────────
function BulkBar({ count, onClear, onMove }) {
  const [moveOpen, setMoveOpen] = useState(false);
  return (
    <div style={{
      position: 'sticky', bottom: 16, marginTop: 16,
      background: '#0f172a', color: 'white',
      borderRadius: 12, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 12px 28px rgb(15 23 42 / 0.25)',
      zIndex: 40,
    }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{count} prospect{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}</span>
      <button onClick={onClear} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
        Tout désélectionner
      </button>
      <span style={{ flex: 1 }}/>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setMoveOpen(o => !o)} style={bulkBtn}>
          <Icon name="arrowRight" size={11}/>Changer le statut
        </button>
        {moveOpen && (
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 50,
            background: 'white', color: '#0f172a',
            border: '1px solid #e5e7eb', borderRadius: 10,
            boxShadow: '0 10px 25px rgb(15 23 42 / 0.18)', width: 200, padding: 4,
          }}>
            {PIPELINE_ORDER.map(stId => {
              const s = STATUSES[stId];
              return (
                <div key={stId} onClick={() => { onMove(stId); setMoveOpen(false); }}
                  style={{ padding: '7px 10px', borderRadius: 6, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }}/>
                  {s.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button style={bulkBtn}>Ajouter à un parcours</button>
      <button style={bulkBtn}>Ajouter à une liste</button>
      <button style={bulkBtn}>Exporter</button>
      <button style={{ ...bulkBtn, color: '#fca5a5' }}>Supprimer</button>
    </div>
  );
}

// ─── Filters popover ───────────────────────────────────────
function FiltersPopover() {
  return (
    <div onClick={e => e.stopPropagation()} style={popoverStyle(320)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Filtres</span>
        <button style={{ background: 'transparent', border: 'none', fontSize: 11.5, color: '#0052D9', cursor: 'pointer', fontWeight: 500 }}>Tout effacer</button>
      </div>
      {[
        { label: 'Source',   value: 'Tous',          active: false },
        { label: 'Auteur',   value: 'Sebastian',     active: true  },
        { label: 'Workflow', value: 'Tous',          active: false },
        { label: 'Période',  value: 'Avril 2026',    active: true  },
      ].map(f => (
        <div key={f.label} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>{f.label}</div>
          <button style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 10px', border: '1px solid', borderRadius: 8,
            borderColor: f.active ? '#cfdcf4' : '#e2e8f0',
            background: f.active ? '#f4f8fe' : 'white',
            fontSize: 12.5, color: f.active ? '#0052D9' : '#334155', fontWeight: 500, cursor: 'pointer',
          }}>
            {f.value}<Icon name="chevronDown" size={11} style={{ color: '#94a3b8' }}/>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────
function silenceTier(label) {
  const m = /silence\s+(\d+)/i.exec(label || '');
  if (!m) return null;
  const d = parseInt(m[1], 10);
  if (d >= 15) return 'red';
  if (d >= 11) return 'orange';
  if (d >= 7)  return 'amber';
  return null;
}
function parseSilence(label) {
  const m = /silence\s+(\d+)/i.exec(label || '');
  return m ? parseInt(m[1], 10) : 0;
}

const actionBtnStyle = (open) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 11px', border: '1px solid #e2e8f0',
  background: open ? '#f8fafc' : 'white',
  borderRadius: 8, fontSize: 12.5, fontWeight: 500, color: '#334155', cursor: 'pointer',
});
const popoverStyle = (w) => ({
  position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30,
  width: w, background: 'white', border: '1px solid #e5e7eb',
  borderRadius: 10, boxShadow: '0 12px 28px rgb(15 23 42 / 0.14)',
  padding: 6,
});
const ghostBtn = { width: 26, height: 26, borderRadius: 5, border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
const pTh = { padding: '10px 12px', fontSize: 10.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' };
const pTd = { padding: '10px 12px', verticalAlign: 'middle' };
const menuItemStyle = { padding: '7px 10px', borderRadius: 6, fontSize: 13, color: '#334155', cursor: 'pointer' };
const bulkBtn = { background: 'transparent', border: '1px solid #334155', color: 'white', fontSize: 12, padding: '6px 11px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 };

Object.assign(window, { PipelineTab });
