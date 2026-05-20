// Step 1 — Prospect selection (List existing OR new selection)
const { useState: useStateP, useMemo: useMemoP, useEffect: useEffectP } = React;

function Step1Prospects({ mode, setMode, selectedListId, setSelectedListId, refinements, setRefinements, filters, setFilters, selectedProspectIds, setSelectedProspectIds }) {
  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
        Qui voulez-vous cibler ?
      </h2>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>
        Choisissez une liste existante ou composez votre cible à la volée.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        <ModeCard active={mode === 'existing'} onClick={() => setMode('existing')}
          icon="users" title="Liste existante"
          description="Choisir parmi mes listes de prospects déjà créées"
          sub="Idéal pour relancer une cible déjà segmentée"/>
        <ModeCard active={mode === 'new'} onClick={() => setMode('new')}
          icon="filter" title="Nouvelle sélection"
          description="Composer une liste à la volée depuis mon CRM"
          sub="Filtrer mes prospects selon des critères précis"/>
      </div>

      <div style={{ animation: 'fadeIn 200ms ease' }}>
        {mode === 'existing' && (
          <ExistingListPicker selectedListId={selectedListId} setSelectedListId={setSelectedListId}
            refinements={refinements} setRefinements={setRefinements}/>
        )}
        {mode === 'new' && (
          <NewSelection filters={filters} setFilters={setFilters}
            selectedIds={selectedProspectIds} setSelectedIds={setSelectedProspectIds}/>
        )}
      </div>
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, description, sub }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: 14,
      background: active ? 'var(--brand-blue-tint)' : 'white',
      border: `1.5px solid ${active ? 'var(--brand-blue)' : 'var(--border)'}`,
      borderRadius: 10, cursor: 'pointer',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      transition: 'all 120ms',
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 9,
        background: active ? 'var(--brand-blue)' : 'var(--neutral-100)',
        color: active ? 'white' : 'var(--muted-foreground)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{Icon[icon]({ size: 18 })}</span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? 'var(--brand-blue-dark)' : 'var(--foreground)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{description}</div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 6, fontStyle: 'italic' }}>{sub}</div>
      </div>
    </button>
  );
}

function ExistingListPicker({ selectedListId, setSelectedListId, refinements, setRefinements }) {
  const [search, setSearch] = useStateP('');
  const [sourceF, setSourceF] = useStateP('');
  const [authorF, setAuthorF] = useStateP('');
  const [sort, setSort] = useStateP('date');
  const [refineOpen, setRefineOpen] = useStateP(false);

  const filtered = useMemoP(() => {
    let r = PROSPECT_LISTS.filter(l =>
      (!search || l.name.toLowerCase().includes(search.toLowerCase())) &&
      (!sourceF || l.source === sourceF) &&
      (!authorF || l.author.id === authorF)
    );
    if (sort === 'date') r = [...r].sort((a, b) => b.id.localeCompare(a.id));
    if (sort === 'count') r = [...r].sort((a, b) => b.count - a.count);
    if (sort === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [search, sourceF, authorF, sort]);

  const selected = PROSPECT_LISTS.find(l => l.id === selectedListId);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>{Icon.search({ size: 14 })}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une liste..."
            style={{ width: '100%', height: 32, padding: '0 10px 0 32px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, outline: 'none' }}/>
        </div>
        <select value={sourceF} onChange={(e) => setSourceF(e.target.value)}
          style={selectStyle()}>
          <option value="">Toutes sources</option>
          {ALL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={authorF} onChange={(e) => setAuthorF(e.target.value)} style={selectStyle()}>
          <option value="">Tous auteurs</option>
          {ALL_AUTHORS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectStyle()}>
          <option value="date">Tri : Date</option>
          <option value="count">Tri : Nb prospects</option>
          <option value="name">Tri : Nom</option>
        </select>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--neutral-50)', zIndex: 1 }}>
            <tr>
              <th style={thStyle(40)}></th>
              <th style={thStyle()}>Nom de la liste</th>
              <th style={thStyle(120)}>Source</th>
              <th style={thStyle(80, 'right')}>Prospects</th>
              <th style={thStyle(60, 'right')}>Tél.</th>
              <th style={thStyle(140)}>Auteur</th>
              <th style={thStyle(90)}>Date</th>
              <th style={thStyle(40)}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const isSel = selectedListId === l.id;
              return (
                <tr key={l.id} onClick={() => setSelectedListId(l.id)} style={{
                  cursor: 'pointer',
                  background: isSel ? 'var(--brand-blue-tint)' : l.highlight ? 'rgba(255, 103, 0, 0.04)' : 'white',
                  borderTop: '1px solid var(--border)',
                }}>
                  <td style={tdStyle()}>
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: `2px solid ${isSel ? 'var(--brand-blue)' : 'var(--neutral-300)'}`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSel && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-blue)' }}/>}
                    </span>
                  </td>
                  <td style={{ ...tdStyle(), fontWeight: 600 }}>
                    {l.name}
                    {l.highlight && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, padding: '2px 6px', background: 'var(--brand-orange)', color: 'white', borderRadius: 4 }}>Récente</span>}
                  </td>
                  <td style={tdStyle()}>{l.source}</td>
                  <td style={{ ...tdStyle('right'), fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{l.count}</td>
                  <td style={{ ...tdStyle('right'), fontVariantNumeric: 'tabular-nums', color: 'var(--muted-foreground)' }}>{l.withPhone}</td>
                  <td style={tdStyle()}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: l.author.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{l.author.initials}</span>
                      <span style={{ fontSize: 12 }}>{l.author.name}</span>
                    </span>
                  </td>
                  <td style={{ ...tdStyle(), color: 'var(--muted-foreground)', fontSize: 11.5 }}>{l.createdAt}</td>
                  <td style={tdStyle()} title={`Aperçu : ${l.sample.join(', ')}`}>
                    <span style={{ color: 'var(--muted-foreground)', cursor: 'help' }}>{Icon.info({ size: 13 })}</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, fontSize: 12.5, color: 'var(--muted-foreground)' }}>Aucune liste ne correspond.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{
          marginTop: 10, padding: 12,
          background: 'var(--brand-blue-tint)', border: '1px solid #C5DAF8', borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          animation: 'fadeIn 180ms ease',
        }}>
          <span style={{ color: 'var(--brand-blue)', display: 'flex' }}>{Icon.check({ size: 14 })}</span>
          <span style={{ fontSize: 12.5, flex: 1 }}>
            Liste sélectionnée : <strong style={{ fontWeight: 700 }}>{selected.name}</strong>
            {' · '}
            <strong style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{computeRefinedCount(selected, refinements)}</strong>
            {' '}prospects
            {' · '}
            <span style={{ color: 'var(--muted-foreground)' }}>{selected.withPhone} avec téléphone</span>
          </span>
          <button onClick={() => setRefineOpen(o => !o)} style={linkBtn()}>
            {refineOpen ? 'Masquer' : 'Affiner cette liste'}
          </button>
          <button onClick={() => setSelectedListId(null)} style={linkBtn('var(--muted-foreground)')}>
            Modifier
          </button>
        </div>
      )}

      {selected && refineOpen && (
        <div style={{
          marginTop: 8, padding: 12,
          border: '1px solid var(--border)', borderRadius: 10,
          background: 'white',
          animation: 'fadeIn 180ms ease',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Affiner</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Switch checked={refinements.excludeContacted} onChange={(v) => setRefinements({ ...refinements, excludeContacted: v })} label="Exclure les prospects déjà contactés"/>
            <Switch checked={refinements.excludeMeeting} onChange={(v) => setRefinements({ ...refinements, excludeMeeting: v })} label="Exclure les statuts RDV / Signé"/>
            <Switch checked={refinements.onlyWithPhone} onChange={(v) => setRefinements({ ...refinements, onlyWithPhone: v })} label="Uniquement les prospects avec téléphone"/>
            <Switch checked={refinements.excludeActive} onChange={(v) => setRefinements({ ...refinements, excludeActive: v })} label="Exclure les prospects déjà dans une campagne active"/>
          </div>
        </div>
      )}
    </div>
  );
}

function computeRefinedCount(list, r) {
  if (!list) return 0;
  let n = list.count;
  if (r.excludeContacted) n = Math.round(n * 0.85);
  if (r.excludeMeeting) n = Math.round(n * 0.93);
  if (r.onlyWithPhone) n = list.withPhone;
  if (r.excludeActive) n = Math.round(n * 0.95);
  return n;
}

function NewSelection({ filters, setFilters, selectedIds, setSelectedIds }) {
  const [savePopover, setSavePopover] = useStateP(false);
  const [saveName, setSaveName] = useStateP('');

  const filtered = useMemoP(() => {
    return ALL_PROSPECTS.filter(p => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!`${p.firstName} ${p.lastName} ${p.company}`.toLowerCase().includes(q)) return false;
      }
      if (filters.statuses.length && !filters.statuses.includes(p.status)) return false;
      if (filters.sources.length && !filters.sources.includes(p.source)) return false;
      if (filters.tags.length && !filters.tags.some(t => p.tags.includes(t))) return false;
      if (filters.industries.length && !filters.industries.includes(p.industry)) return false;
      if (filters.sizes.length && !filters.sizes.includes(p.size)) return false;
      if (filters.withPhone && !p.hasPhone) return false;
      if (filters.withEmail && !p.hasEmail) return false;
      if (filters.withWA && !p.hasWA) return false;
      if (filters.location && !(p.location.toLowerCase().includes(filters.location.toLowerCase()))) return false;
      if (filters.excludeActive && p.inActive) return false;
      return true;
    });
  }, [filters]);

  // Keep selectedIds within filtered
  useEffectP(() => {
    setSelectedIds(prev => prev.filter(id => filtered.some(p => p.id === id)));
  }, [filtered.length]);

  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.includes(p.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(prev => prev.filter(id => !filtered.some(p => p.id === id)));
    else setSelectedIds(prev => [...new Set([...prev, ...filtered.map(p => p.id)])]);
  };
  const toggleOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectedCount = filtered.filter(p => selectedIds.includes(p.id)).length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12 }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'white', maxHeight: 460, overflow: 'auto' }}>
        <FilterGroup label="Recherche">
          <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Nom, entreprise..."
            style={{ width: '100%', height: 30, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, outline: 'none' }}/>
        </FilterGroup>

        <FilterGroup label="Statut CRM">
          <ChipMulti options={CRM_STATUSES} value={filters.statuses}
            onChange={(v) => setFilters({ ...filters, statuses: v })}/>
        </FilterGroup>

        <FilterGroup label="Source">
          <ChipMulti options={ALL_SOURCES} value={filters.sources}
            onChange={(v) => setFilters({ ...filters, sources: v })}/>
        </FilterGroup>

        <FilterGroup label="Tags">
          <ChipMulti options={ALL_TAGS} value={filters.tags}
            onChange={(v) => setFilters({ ...filters, tags: v })}/>
        </FilterGroup>

        <FilterGroup label="Industrie">
          <ChipMulti options={INDUSTRIES} value={filters.industries}
            onChange={(v) => setFilters({ ...filters, industries: v })}/>
        </FilterGroup>

        <FilterGroup label="Taille entreprise">
          <ChipMulti options={COMPANY_SIZES} value={filters.sizes}
            onChange={(v) => setFilters({ ...filters, sizes: v })}/>
        </FilterGroup>

        <FilterGroup label="Coordonnées">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Switch checked={filters.withPhone} onChange={(v) => setFilters({ ...filters, withPhone: v })} label="Avec téléphone"/>
            <Switch checked={filters.withEmail} onChange={(v) => setFilters({ ...filters, withEmail: v })} label="Avec email"/>
            <Switch checked={filters.withWA} onChange={(v) => setFilters({ ...filters, withWA: v })} label="Avec WhatsApp"/>
          </div>
        </FilterGroup>

        <FilterGroup label="Localisation">
          <input value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            placeholder="Ville, pays..."
            style={{ width: '100%', height: 30, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, outline: 'none' }}/>
        </FilterGroup>

        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <Switch checked={filters.excludeActive} onChange={(v) => setFilters({ ...filters, excludeActive: v })}
            label="Exclure les prospects déjà dans une campagne active"/>
        </div>

        <div style={{ marginTop: 10, position: 'relative' }}>
          <button onClick={() => setSavePopover(o => !o)} style={{
            width: '100%', padding: '7px 10px',
            background: 'white', border: '1px dashed var(--brand-blue)',
            color: 'var(--brand-blue)', borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>+ Enregistrer comme liste</button>
          {savePopover && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 6,
              background: 'white', border: '1px solid var(--border)', borderRadius: 8,
              padding: 10, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15)', zIndex: 10,
              animation: 'fadeIn 150ms ease',
            }}>
              <input value={saveName} onChange={(e) => setSaveName(e.target.value)}
                placeholder="Nom de la liste" autoFocus
                style={{ width: '100%', height: 28, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, marginBottom: 6, outline: 'none' }}/>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => setSavePopover(false)} style={{ ...miniBtn(), background: 'transparent' }}>Annuler</button>
                <button onClick={() => { setSavePopover(false); setSaveName(''); }} style={{ ...miniBtn(), background: 'var(--brand-blue)', color: 'white', borderColor: 'var(--brand-blue)' }}>Enregistrer</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'white', display: 'flex', flexDirection: 'column', maxHeight: 460 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
          <span><strong style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{filtered.length}</strong> prospect{filtered.length > 1 ? 's' : ''} match{filtered.length > 1 ? 'ent' : 'e'}</span>
          <span style={{ color: 'var(--muted-foreground)' }}><strong style={{ color: 'var(--brand-blue)', fontWeight: 700 }}>{selectedCount}</strong> sélectionné{selectedCount > 1 ? 's' : ''}</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--neutral-50)', zIndex: 1 }}>
              <tr>
                <th style={thStyle(36)}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ accentColor: 'var(--brand-blue)' }}/>
                </th>
                <th style={thStyle()}>Nom</th>
                <th style={thStyle()}>Titre · Entreprise</th>
                <th style={thStyle(90)}>Statut</th>
                <th style={thStyle(80)}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isSel = selectedIds.includes(p.id);
                return (
                  <tr key={p.id} onClick={() => toggleOne(p.id)} style={{
                    cursor: 'pointer', borderTop: '1px solid var(--border)',
                    background: isSel ? 'var(--brand-blue-tint)' : 'white',
                  }}>
                    <td style={tdStyle()}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleOne(p.id)} onClick={(e) => e.stopPropagation()} style={{ accentColor: 'var(--brand-blue)' }}/>
                    </td>
                    <td style={tdStyle()}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: p.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{p.initials}</span>
                        <span style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</span>
                      </span>
                    </td>
                    <td style={{ ...tdStyle(), color: 'var(--muted-foreground)' }}>
                      <span style={{ color: 'var(--foreground)' }}>{p.jobTitle}</span> · {p.company}
                    </td>
                    <td style={tdStyle()}>
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--neutral-100)', color: 'var(--neutral-700)' }}>{p.status}</span>
                    </td>
                    <td style={{ ...tdStyle(), color: 'var(--muted-foreground)', fontSize: 11 }}>{p.lastAction}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, fontSize: 12.5, color: 'var(--muted-foreground)' }}>Aucun prospect ne correspond aux filtres.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--neutral-50)', fontSize: 11.5, color: 'var(--muted-foreground)' }}>
          {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''} sur {filtered.length} filtré{filtered.length > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ChipMulti({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {options.map(opt => {
        const active = value.includes(opt);
        return (
          <button key={opt} onClick={() => onChange(active ? value.filter(v => v !== opt) : [...value, opt])} style={{
            padding: '3px 8px', fontSize: 11, fontWeight: active ? 600 : 500,
            background: active ? 'var(--brand-blue)' : 'white',
            color: active ? 'white' : 'var(--foreground)',
            border: `1px solid ${active ? 'var(--brand-blue)' : 'var(--border)'}`,
            borderRadius: 9999, cursor: 'pointer',
          }}>{opt}</button>
        );
      })}
    </div>
  );
}

function selectStyle() {
  return { height: 32, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'white', outline: 'none', fontFamily: 'var(--font-sans)' };
}
function thStyle(w, align) {
  return { textAlign: align || 'left', fontSize: 10.5, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '8px 10px', width: w };
}
function tdStyle(align) {
  return { padding: '8px 10px', fontSize: 12, textAlign: align || 'left', verticalAlign: 'middle' };
}
function linkBtn(color) {
  return { background: 'transparent', border: 'none', color: color || 'var(--brand-blue)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 };
}
function miniBtn() {
  return { padding: '5px 10px', fontSize: 11.5, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'white' };
}

window.Step1Prospects = Step1Prospects;
