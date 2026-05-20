// CRM Tab — Listes (tableau dense actionnable + panneau latéral)
const { useState, useMemo } = React;

function ListesTab({ onOpenList }) {
  const [scope, setScope] = useState('all'); // all | mine | team
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // recent | conversion | volume | alpha
  const [hoverId, setHoverId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [openList, setOpenList] = useState(null); // pour panneau latéral

  // Calculer la moyenne des taux de conversion pour le badge "Bon/Moyen/Faible"
  const avgConv = useMemo(() => {
    const rates = LISTS.map(l => (l.signed / Math.max(l.count, 1)) * 100);
    return rates.reduce((s, r) => s + r, 0) / rates.length;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = LISTS.filter(l => {
      if (scope === 'mine' && l.author !== 'Sebastian Bodin') return false;
      if (scope === 'team' && l.author === 'Sebastian Bodin') return false;
      if (!q) return true;
      return [l.name, l.query].join(' ').toLowerCase().includes(q);
    });
    list = list.slice().sort((a, b) => {
      if (sortBy === 'alpha') return a.name.localeCompare(b.name);
      if (sortBy === 'volume') return b.count - a.count;
      if (sortBy === 'conversion') {
        return (b.signed / Math.max(b.count, 1)) - (a.signed / Math.max(a.count, 1));
      }
      // recent
      const n = s => parseInt((s.match(/\d+/) || [99])[0], 10);
      return n(a.createdAgo) - n(b.createdAgo);
    });
    return list;
  }, [scope, search, sortBy]);

  const totalLists = LISTS.length;

  return (
    <div style={{ padding: '20px 28px 60px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Listes</h1>
          <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
            {totalLists} sessions de prospection · La plupart proviennent de l'extension Chrome Andoxa
          </div>
        </div>
        <Button variant="outline" icon="upload">Importer un CSV</Button>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          width: 360, padding: '7px 11px',
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
        }}>
          <Icon name="search" size={13} style={{ color: '#94a3b8' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une liste…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', background: 'transparent', minWidth: 0 }}/>
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'inline-flex' }}>
              <Icon name="x" size={11}/>
            </button>
          )}
        </div>

        {/* Scope pills */}
        <div style={{ display: 'inline-flex', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 3, gap: 2 }}>
          {[['all','Toutes'],['mine','Mes listes'],['team','Listes équipe']].map(([id, lbl]) => {
            const active = scope === id;
            return (
              <button key={id} onClick={() => setScope(id)} style={{
                padding: '5px 11px', border: 'none', borderRadius: 6,
                background: active ? '#0052D9' : 'transparent',
                color: active ? 'white' : '#475569',
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              }}>{lbl}</button>
            );
          })}
        </div>

        {/* Filtres */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setFiltersOpen(o => !o); setSortOpen(false); }}
            style={actionBtn(filtersOpen)}>
            <Icon name="filter" size={12}/> Filtres
            <Icon name="chevronDown" size={10} style={{ color: '#94a3b8' }}/>
          </button>
          {filtersOpen && <FiltersPopover/>}
        </div>

        <div style={{ flex: 1 }}/>

        {/* Tri */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setSortOpen(o => !o); setFiltersOpen(false); }}
            style={actionBtn(sortOpen)}>
            <Icon name="sort" size={12}/> Trier
            <Icon name="chevronDown" size={10} style={{ color: '#94a3b8' }}/>
          </button>
          {sortOpen && (
            <div style={popoverStyle(220, 'right')}>
              {[
                ['recent',     'Plus récente'],
                ['conversion', 'Plus performante'],
                ['volume',     'Plus de prospects'],
                ['alpha',      'Alphabétique'],
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
      </div>

      {/* Tableau */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'visible' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col/>
            <col style={{ width: 130 }}/>
            <col style={{ width: 90 }}/>
            <col style={{ width: 280 }}/>
            <col style={{ width: 90 }}/>
            <col style={{ width: 110 }}/>
            <col style={{ width: 90 }}/>
            <col style={{ width: 220 }}/>
          </colgroup>
          <thead>
            <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th}>Liste</th>
              <th style={th}>Source</th>
              <th style={th}>Volume</th>
              <th style={th}>Funnel</th>
              <th style={th}>Conv.</th>
              <th style={th}>Auteur</th>
              <th style={th}>Date</th>
              <th style={th}/>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <ListRow key={l.id} l={l} avgConv={avgConv}
                hover={hoverId === l.id} setHover={setHoverId}
                menuOpen={menuId === l.id} setMenu={setMenuId}
                onOpen={() => setOpenList(l)}/>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div style={{
          padding: '48px 24px', textAlign: 'center', background: 'white',
          border: '1px dashed #e2e8f0', borderRadius: 12, marginTop: 12,
        }}>
          <div style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>Aucune liste trouvée</div>
          <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
            {search ? `Aucun résultat pour « ${search} »` : 'Ajustez les filtres pour voir plus de listes'}
          </div>
        </div>
      )}

      {/* Side panel */}
      {openList && (
        <ListDetailPanel list={openList} onClose={() => setOpenList(null)}/>
      )}

      {(filtersOpen || sortOpen || menuId) && (
        <div onClick={() => { setFiltersOpen(false); setSortOpen(false); setMenuId(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 5 }}/>
      )}
    </div>
  );
}

// ─── Ligne du tableau ──────────────────────────────────────
function ListRow({ l, avgConv, hover, setHover, menuOpen, setMenu, onOpen }) {
  const src = SOURCES[l.source];
  const total = l.count || 1;
  const convRate = (l.signed / total) * 100;
  const perf = convRate > avgConv * 1.1 ? 'good' : convRate < avgConv * 0.9 ? 'low' : 'avg';
  const perfLabel = perf === 'good' ? 'Bon' : perf === 'low' ? 'Faible' : 'Moyen';
  const perfColor = perf === 'good' ? '#15803d' : perf === 'low' ? '#b45309' : '#64748b';
  const perfBg    = perf === 'good' ? '#ecfdf5' : perf === 'low' ? '#fffbeb' : '#f1f5f9';
  const perfArrow = perf === 'good' ? '▲' : perf === 'low' ? '▼' : '·';

  const segs = [
    { n: l.count,     label: 'imp.',  c: '#cbd5e1' },
    { n: l.contacted, label: 'cont.', c: '#3b82f6' },
    { n: l.rdv,       label: 'RDV',   c: '#10b981' },
    { n: l.signed,    label: 'signé', c: '#16a34a' },
  ];
  const sumAll = segs.reduce((a, s) => a + s.n, 0) || 1;

  return (
    <tr
      onMouseEnter={() => setHover(l.id)} onMouseLeave={() => setHover(null)}
      onClick={(e) => { if (e.target.closest('button,a,[data-stop]')) return; onOpen(); }}
      style={{
        borderBottom: '1px solid #f5f7fa', cursor: 'pointer',
        background: hover ? '#f8fafd' : 'white', height: 80,
      }}>
      {/* Liste */}
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: src.tint, color: src.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={src.icon} size={16}/>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>« {l.query} »</div>
          </div>
        </div>
      </td>
      {/* Source */}
      <td style={td}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 6,
          background: src.tint, color: src.color,
          fontSize: 11.5, fontWeight: 500,
        }}>
          <Icon name={src.icon} size={10}/>{src.short}
        </span>
      </td>
      {/* Volume */}
      <td style={td}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{l.count}</div>
        {l.delta ? (
          <div style={{ fontSize: 11, color: '#15803d', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <Icon name="arrowUp" size={9}/>+{l.delta} cette sem.
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>prospects</div>
        )}
      </td>
      {/* Funnel */}
      <td style={td}>
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 8 }}
          title={`${l.count} importés → ${l.contacted} contactés → ${l.rdv} RDV → ${l.signed} signés`}>
          {segs.map((s, i) => (
            <div key={i} style={{
              width: `${(s.n / sumAll) * 100}%`,
              background: s.c, minWidth: s.n > 0 ? 3 : 0,
              borderRight: i < 3 ? '1px solid white' : 'none',
            }}/>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: '#64748b', display: 'flex', gap: 8 }}>
          <span><b style={{ color: '#0f172a', fontWeight: 600 }}>{l.count}</b> imp.</span>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span><b style={{ color: '#0f172a', fontWeight: 600 }}>{l.contacted}</b> cont.</span>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span><b style={{ color: '#0f172a', fontWeight: 600 }}>{l.rdv}</b> RDV</span>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span><b style={{ color: '#0f172a', fontWeight: 600 }}>{l.signed}</b> signé{l.signed > 1 ? 's' : ''}</span>
        </div>
      </td>
      {/* Conversion */}
      <td style={td}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{Math.round(convRate)}%</div>
        <div style={{
          marginTop: 2, fontSize: 10.5, fontWeight: 500,
          color: perfColor, display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '1px 6px', borderRadius: 4, background: perfBg,
        }}>
          <span>{perfArrow}</span>{perfLabel}
        </div>
      </td>
      {/* Auteur */}
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Avatar name={l.author} size={22}/>
          <span style={{ fontSize: 12.5, color: '#475569' }}>{l.author.split(' ')[0]}</span>
        </div>
      </td>
      {/* Date */}
      <td style={td}>
        <div style={{ fontSize: 12, color: '#475569' }}>{l.createdAgo}</div>
      </td>
      {/* Actions */}
      <td style={{ ...td, textAlign: 'right', position: 'relative' }}>
        <div data-stop style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button onClick={e => e.stopPropagation()} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 11px', borderRadius: 6,
            border: '1px solid #cfdcf4', background: hover ? '#f4f8fe' : 'white',
            color: '#0052D9', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            <Icon name="megaphone" size={11}/>Lancer une campagne
          </button>
          <button onClick={e => { e.stopPropagation(); setMenu(menuOpen ? null : l.id); }} style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: menuOpen ? '#f1f5f9' : 'transparent',
            color: '#64748b', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="moreVertical" size={13}/>
          </button>
        </div>
        {menuOpen && (
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', right: 14, top: 48, zIndex: 25,
            background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
            boxShadow: '0 10px 25px rgb(15 23 42 / 0.14)', width: 220, padding: 4, textAlign: 'left',
          }}>
            {[
              ['users',    'Voir les prospects'],
              ['edit',     'Renommer la liste'],
              ['copy',     'Dupliquer la liste'],
              ['download', 'Exporter en CSV'],
            ].map(([ic, t]) => (
              <div key={t} style={menuItem}>
                <Icon name={ic} size={12} style={{ color: '#64748b' }}/>{t}
              </div>
            ))}
            <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }}/>
            <div style={{ ...menuItem, color: '#b91c1c' }}>
              <Icon name="trash" size={12}/>Supprimer la liste
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Side panel ────────────────────────────────────────────
function ListDetailPanel({ list, onClose }) {
  const src = SOURCES[list.source];
  const total = list.count || 1;
  const convRate = Math.round((list.signed / total) * 100);
  const topProspects = PROSPECTS.filter(p => p.list === list.name).slice(0, 5);

  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 50, background: 'rgb(15 23 42 / 0.28)',
        animation: 'andoxaFadeIn 180ms ease-out',
      }}/>
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, zIndex: 51,
        background: '#fafbfc', boxShadow: '-12px 0 30px rgb(15 23 42 / 0.10)',
        display: 'flex', flexDirection: 'column',
        animation: 'andoxaSlideIn 220ms cubic-bezier(.2,.8,.2,1)',
      }}>
        <style>{`
          @keyframes andoxaSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes andoxaFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: src.tint, color: src.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={src.icon} size={18}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>{list.name}</div>
              <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>« {list.query} »</div>
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, border: 'none', borderRadius: 6,
              background: '#f1f5f9', color: '#64748b', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name="x" size={13}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Performance */}
          <SectionTitle>Performance</SectionTitle>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 18 }}>
            <FunnelLarge l={list}/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
              {[
                { label: 'Importés',  n: list.count,     c: '#64748b' },
                { label: 'Contactés', n: list.contacted, c: '#3b82f6' },
                { label: 'RDV',       n: list.rdv,       c: '#10b981' },
                { label: 'Signés',    n: list.signed,    c: '#16a34a' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fafbfc', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: s.c, letterSpacing: '-0.02em' }}>{s.n}</div>
                  <div style={{ fontSize: 10.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Taux de conversion</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#0052D9', letterSpacing: '-0.02em' }}>{convRate}%</div>
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                Cycle moyen : <b style={{ color: '#0f172a', fontWeight: 600 }}>9 jours</b>
              </div>
            </div>
          </div>

          {/* Métadonnées */}
          <SectionTitle>Métadonnées</SectionTitle>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4, marginBottom: 18 }}>
            <Meta label="Source" value={<><Icon name={src.icon} size={11} style={{ color: src.color }}/> {src.label}</>}/>
            <Meta label="Auteur" value={<><Avatar name={list.author} size={16}/> {list.author}</>}/>
            <Meta label="Créée" value={list.createdAgo + ' · ' + list.date}/>
            <Meta label="Requête" value={<span style={{ fontStyle: 'italic', color: '#64748b' }}>« {list.query} »</span>} last/>
          </div>

          {/* Top prospects */}
          <SectionTitle>Top prospects</SectionTitle>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
            {topProspects.length === 0 ? (
              <div style={{ padding: 18, fontSize: 12.5, color: '#94a3b8', textAlign: 'center' }}>
                Aucun prospect rattaché à cette liste pour le moment.
              </div>
            ) : topProspects.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderBottom: i < topProspects.length - 1 ? '1px solid #f5f7fa' : 'none',
              }}>
                <Avatar name={p.name} size={26}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.company}</div>
                </div>
                <StatusPill status={p.status}/>
              </div>
            ))}
            <div style={{ padding: '10px 12px', background: '#fafbfc', borderTop: '1px solid #f1f5f9' }}>
              <a href="#" style={{ fontSize: 12, color: '#0052D9', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Voir tous les {list.count} prospects <Icon name="arrowRight" size={11}/>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: 16, background: 'white', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            width: '100%', padding: '11px 14px', borderRadius: 8, border: 'none',
            background: '#0052D9', color: 'white', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 1px 0 rgb(15 23 42 / 0.04)',
          }}>
            <Icon name="megaphone" size={13}/>Lancer une campagne sur cette liste
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              ['users','Voir les prospects'],
              ['edit','Renommer'],
              ['download','Exporter'],
            ].map(([ic, t]) => (
              <button key={t} style={{
                flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0',
                background: 'white', color: '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>
                <Icon name={ic} size={11}/>{t}
              </button>
            ))}
          </div>
          <button style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 10px', borderRadius: 7, border: 'none',
            background: 'transparent', color: '#b91c1c', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            <Icon name="trash" size={11}/>Supprimer la liste
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

function FunnelLarge({ l }) {
  const segs = [
    { n: l.count,     label: 'Importés',  c: '#cbd5e1' },
    { n: l.contacted, label: 'Contactés', c: '#3b82f6' },
    { n: l.rdv,       label: 'RDV',       c: '#10b981' },
    { n: l.signed,    label: 'Signés',    c: '#16a34a' },
  ];
  const max = Math.max(...segs.map(s => s.n), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {segs.map((s, i) => {
        const prev = i === 0 ? null : segs[i-1].n;
        const ratio = prev ? Math.round((s.n / prev) * 100) : 100;
        return (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 70, fontSize: 11.5, color: '#475569', fontWeight: 500 }}>{s.label}</div>
            <div style={{ flex: 1, height: 18, background: '#f1f5f9', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: `${(s.n / max) * 100}%`, height: '100%', background: s.c, borderRadius: 4, transition: 'width 250ms' }}/>
            </div>
            <div style={{ width: 50, textAlign: 'right', fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{s.n}</div>
            {i > 0 && <div style={{ width: 38, fontSize: 10.5, color: '#94a3b8', textAlign: 'right' }}>{ratio}%</div>}
            {i === 0 && <div style={{ width: 38 }}/>}
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>{children}</div>
  );
}

function Meta({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderBottom: last ? 'none' : '1px solid #f5f7fa',
      fontSize: 12.5,
    }}>
      <div style={{ width: 90, color: '#94a3b8', fontSize: 11.5 }}>{label}</div>
      <div style={{ flex: 1, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function FiltersPopover() {
  return (
    <div onClick={e => e.stopPropagation()} style={popoverStyle(320)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Filtres</span>
        <button style={{ background: 'transparent', border: 'none', fontSize: 11.5, color: '#0052D9', cursor: 'pointer', fontWeight: 500 }}>Tout effacer</button>
      </div>
      {[
        ['Source',  'Tous (5)'],
        ['Auteur',  'Tous'],
        ['Période', 'Ce mois'],
      ].map(([label, value]) => (
        <div key={label} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>{label}</div>
          <button style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8,
            background: 'white', fontSize: 12.5, color: '#334155', fontWeight: 500, cursor: 'pointer',
          }}>
            {value}<Icon name="chevronDown" size={11} style={{ color: '#94a3b8' }}/>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────
function ListesEmpty() {
  return (
    <div style={{ padding: '20px 28px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Listes</h1>
          <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>Aucune liste pour le moment</div>
        </div>
      </div>

      <div style={{
        background: 'white', border: '1px solid #e5e7eb', borderRadius: 16,
        padding: '64px 32px 56px', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 540, height: 540, borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(0,82,217,0.10), rgba(0,82,217,0) 65%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 18,
            background: '#eef4fe', color: '#0052D9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 6,
          }}>
            <Icon name="list" size={38} stroke={1.6}/>
          </div>

          <div style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>Créez votre première liste</div>
          <p style={{ fontSize: 14, color: '#475569', maxWidth: 480, lineHeight: 1.55, margin: '4px 0 0', textWrap: 'pretty' }}>
            Andoxa fonctionne avec une extension Chrome qui s'intègre à LinkedIn. Importez vos premiers prospects et la liste sera créée automatiquement.
          </p>

          {/* 3 étapes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 28, maxWidth: 720, width: '100%' }}>
            {[
              { ic: 'globe',        title: 'Vous parcourez LinkedIn', sub: 'Sales Nav, recherche ou profil' },
              { ic: 'mousePointer', title: 'Vous cliquez sur l\u2019extension', sub: 'L\u2019icône Andoxa dans Chrome' },
              { ic: 'checkCircle',  title: 'La liste est créée', sub: 'Automatiquement avec les prospects' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'white', border: '1px solid #e2e8f0',
                  color: '#0052D9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <Icon name={s.ic} size={18}/>
                  <span style={{
                    position: 'absolute', top: -6, left: -6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#0052D9', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10.5, fontWeight: 700,
                  }}>{i + 1}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 28 }}>
            <Button variant="primary" icon="globe">Installer l'extension Chrome</Button>
            <button style={{
              background: 'transparent', border: 'none', color: '#475569', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer', padding: '4px 8px',
            }}>
              Ou importer un CSV à la place →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Corbeille (inchangée) ─────────────────────────────────
function CorbeilleTab() {
  return (
    <div style={{ padding: '20px 28px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Corbeille</h1>
          <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
            Les prospects supprimés sont conservés <b style={{ color: '#0f172a' }}>30 jours</b> avant suppression définitive.
          </div>
        </div>
        <Button variant="danger" icon="trash">Vider la corbeille</Button>
      </div>

      <div style={{
        background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: 24, background: '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px dashed #e2e8f0',
        }}>
          <Icon name="trash" size={36} style={{ color: '#cbd5e1' }} stroke={1.5}/>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>La corbeille est vide</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, maxWidth: 340 }}>
            Les prospects que vous supprimez apparaîtront ici. Vous pourrez les restaurer pendant 30 jours.
          </div>
        </div>
        <Button variant="ghost" icon="arrowLeft">Retour aux prospects</Button>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────
const th = { padding: '10px 14px', fontSize: 10.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' };
const td = { padding: '12px 14px', verticalAlign: 'middle' };
const menuItem = { padding: '7px 10px', borderRadius: 6, fontSize: 12.5, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 };
const actionBtn = (open) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 11px', border: '1px solid #e2e8f0',
  background: open ? '#f8fafc' : 'white',
  borderRadius: 8, fontSize: 12.5, fontWeight: 500, color: '#334155', cursor: 'pointer',
});
const popoverStyle = (w, anchor) => ({
  position: 'absolute', top: 'calc(100% + 6px)',
  [anchor === 'right' ? 'right' : 'left']: 0, zIndex: 30,
  width: w, background: 'white', border: '1px solid #e5e7eb',
  borderRadius: 10, boxShadow: '0 12px 28px rgb(15 23 42 / 0.14)',
  padding: 6,
});

Object.assign(window, { ListesTab, ListesEmpty, CorbeilleTab });
