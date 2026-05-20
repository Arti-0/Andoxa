// Session de calls modal — 2-step wizard
const { useState: useStateS, useEffect: useEffectS, useMemo: useMemoS, useRef: useRefS } = React;

const TEAM_MEMBERS = [
  { id: 'sb', name: 'Sebastian Bodin', role: 'Head of Sales', initials: 'SB', color: '#0052D9' },
  { id: 'an', name: 'Andréas BODIN', role: 'CTO', initials: 'AB', color: '#FF6700' },
  { id: 'ml', name: 'Marie Lambert', role: 'Account Executive', initials: 'ML', color: '#5B2EBF' },
  { id: 'tr', name: 'Thomas Roux', role: 'SDR', initials: 'TR', color: '#0E7A3A' },
];

const DURATIONS = [
  { id: '30', label: '30 min' },
  { id: '60', label: '1h' },
  { id: '120', label: '2h' },
  { id: '240', label: '4h' },
  { id: '0', label: 'Illimitée' },
];

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatDateLong(dateStr, timeStr) {
  if (!dateStr) return '—';
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  const days = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${days[d.getDay()]}. ${day} ${months[m - 1]}${timeStr ? ' · ' + timeStr : ''}`;
}

function CallSessionModal({ open, onClose, onCreate, onDraft }) {
  const [step, setStep] = useStateS(1);
  const [maxStepReached, setMaxStepReached] = useStateS(1);
  const [direction, setDirection] = useStateS('forward');

  // Step 1
  const [prospectMode, setProspectMode] = useStateS('existing');
  const [selectedListId, setSelectedListId] = useStateS(null);
  const [refinements, setRefinements] = useStateS({ excludeContacted: false, excludeMeeting: false, onlyWithPhone: true, excludeActive: true });
  const [newSelFilters, setNewSelFilters] = useStateS({ search: '', statuses: [], sources: [], tags: [], industries: [], sizes: [], withPhone: true, withEmail: false, withWA: false, location: '', excludeActive: true });
  const [selectedProspectIds, setSelectedProspectIds] = useStateS([]);
  const [phoneOnly, setPhoneOnly] = useStateS(true); // for existing list view

  // Step 2
  const [name, setName] = useStateS('');
  const [touchedName, setTouchedName] = useStateS(false);
  const [description, setDescription] = useStateS('');
  const [scheduleMode, setScheduleMode] = useStateS('now'); // 'now' | 'later'
  const [scheduleDate, setScheduleDate] = useStateS('');
  const [scheduleTime, setScheduleTime] = useStateS('14:00');
  const [assigneeId, setAssigneeId] = useStateS('sb');
  const [callOrder, setCallOrder] = useStateS('list'); // 'list' | 'random' | 'priority'
  const [advancedOpen, setAdvancedOpen] = useStateS(false);
  const [waSequence, setWaSequence] = useStateS(true);
  const [notifyTeam, setNotifyTeam] = useStateS(false);
  const [duration, setDuration] = useStateS('60');
  const [confirmExit, setConfirmExit] = useStateS(false);

  const overlayRef = useRefS(null);
  const nameRef = useRefS(null);

  useEffectS(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1); setMaxStepReached(1);
        setProspectMode('existing'); setSelectedListId(null);
        setRefinements({ excludeContacted: false, excludeMeeting: false, onlyWithPhone: true, excludeActive: true });
        setNewSelFilters({ search: '', statuses: [], sources: [], tags: [], industries: [], sizes: [], withPhone: true, withEmail: false, withWA: false, location: '', excludeActive: true });
        setSelectedProspectIds([]);
        setPhoneOnly(true);
        setName(''); setTouchedName(false); setDescription('');
        setScheduleMode('now'); setScheduleDate(''); setScheduleTime('14:00');
        setAssigneeId('sb'); setCallOrder('list');
        setAdvancedOpen(false); setWaSequence(true); setNotifyTeam(false); setDuration('60');
        setConfirmExit(false);
      }, 200);
    }
  }, [open]);

  useEffectS(() => {
    if (!open) return;
    setTimeout(() => { if (step === 2 && nameRef.current) nameRef.current.focus(); }, 350);
  }, [step, open]);

  const isDirty = !!(selectedListId || selectedProspectIds.length || name || description);

  useEffectS(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isDirty) setConfirmExit(true);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isDirty, onClose]);

  const selectedList = PROSPECT_LISTS.find(l => l.id === selectedListId) || null;

  // Force phone-only refinement for existing
  const effectiveRefinements = { ...refinements, onlyWithPhone: phoneOnly };
  const prospectCount = prospectMode === 'existing'
    ? (selectedList ? Math.min(computeRefinedCount(selectedList, effectiveRefinements), selectedList.withPhone) : 0)
    : selectedProspectIds.length;
  const prospectLabel = prospectMode === 'existing' && selectedList
    ? selectedList.name
    : prospectMode === 'new' && selectedProspectIds.length
    ? `Sélection à la volée (${selectedProspectIds.length})`
    : '—';

  const step1Valid = prospectCount > 0;
  const nameValid = name.trim().length >= 3 && name.trim().length <= 80;
  const nameError = touchedName && name.trim().length > 0 && name.trim().length < 3
    ? "Le nom doit faire au moins 3 caractères"
    : touchedName && name.trim().length > 80
    ? "Le nom ne peut pas dépasser 80 caractères"
    : '';

  const isPlannedFuture = (() => {
    if (scheduleMode !== 'later') return true;
    if (!scheduleDate) return false;
    const ts = new Date(`${scheduleDate}T${scheduleTime || '00:00'}`).getTime();
    return ts > Date.now();
  })();
  const step2Valid = nameValid && (scheduleMode === 'now' || (scheduleDate && isPlannedFuture));

  const goNext = () => {
    setDirection('forward');
    const next = Math.min(step + 1, 2);
    setStep(next); setMaxStepReached(m => Math.max(m, next));
  };
  const goPrev = () => { setDirection('backward'); setStep(s => Math.max(s - 1, 1)); };
  const handleClose = () => { if (isDirty) setConfirmExit(true); else onClose(); };

  // auto-suggest name on step 2 entry if empty
  useEffectS(() => {
    if (step === 2 && !name) {
      const d = new Date();
      const fmt = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      setName(`Session du ${fmt}`);
    }
  }, [step]);

  const assignee = TEAM_MEMBERS.find(m => m.id === assigneeId);
  const startsNow = scheduleMode === 'now';
  const primaryLabel = startsNow ? 'Créer et démarrer' : 'Créer la session';

  const handleCreate = () => {
    onCreate({
      type: 'call_session',
      name, description, prospectCount, assignee,
      scheduleMode, scheduleDate, scheduleTime,
      callOrder, waSequence, notifyTeam, duration,
      startsNow,
    });
  };
  const handleSaveDraft = () => {
    onDraft({ name, prospectCount });
  };

  if (!open) return null;

  return (
    <div ref={overlayRef} onClick={handleClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20, animation: 'fadeIn 180ms ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'white', borderRadius: 14,
        width: 'min(1080px, 100%)', maxHeight: 'calc(100vh - 40px)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 60px -15px rgba(0,0,0,0.3)',
        animation: 'modalIn 220ms ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--brand-orange)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Icon.phone({ size: 16 })}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>Nouvelle session d'appels</div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>
                {step === 1
                  ? <span>Choisissez les prospects à appeler. Le téléphone est requis.</span>
                  : <span>Cible : <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{prospectLabel}</strong> ({prospectCount} prospects) <a href="#" onClick={(e) => { e.preventDefault(); setDirection('backward'); setStep(1); }} style={{ color: 'var(--brand-blue)', textDecoration: 'none', fontWeight: 500, marginLeft: 4 }}>Modifier</a></span>}
              </div>
            </div>
          </div>
          <button onClick={handleClose} aria-label="Fermer" style={{
            width: 30, height: 30, border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', borderRadius: 8, color: 'var(--muted-foreground)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-100)'; e.currentTarget.style.color = 'var(--foreground)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            {Icon.x({ size: 16 })}
          </button>
        </div>

        <SessionStepper step={step} setStep={(n) => { setDirection(n < step ? 'backward' : 'forward'); setStep(n); }} maxStepReached={maxStepReached}/>

        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <div key={step} style={{
            animation: `${direction === 'forward' ? 'slideInRight' : 'slideInLeft'} 280ms ease`,
            padding: '20px 24px',
          }}>
            {step === 1 && (
              <SessionStep1
                mode={prospectMode} setMode={setProspectMode}
                selectedListId={selectedListId} setSelectedListId={setSelectedListId}
                phoneOnly={phoneOnly} setPhoneOnly={setPhoneOnly}
                refinements={refinements} setRefinements={setRefinements}
                filters={newSelFilters} setFilters={setNewSelFilters}
                selectedProspectIds={selectedProspectIds} setSelectedProspectIds={setSelectedProspectIds}
              />
            )}
            {step === 2 && (
              <SessionStep2
                prospectCount={prospectCount} prospectLabel={prospectLabel}
                onModify={() => { setDirection('backward'); setStep(1); }}
                name={name} setName={setName} touchedName={touchedName} setTouchedName={setTouchedName} nameError={nameError} nameRef={nameRef}
                description={description} setDescription={setDescription}
                scheduleMode={scheduleMode} setScheduleMode={setScheduleMode}
                scheduleDate={scheduleDate} setScheduleDate={setScheduleDate}
                scheduleTime={scheduleTime} setScheduleTime={setScheduleTime}
                isPlannedFuture={isPlannedFuture}
                assigneeId={assigneeId} setAssigneeId={setAssigneeId}
                callOrder={callOrder} setCallOrder={setCallOrder}
                advancedOpen={advancedOpen} setAdvancedOpen={setAdvancedOpen}
                waSequence={waSequence} setWaSequence={setWaSequence}
                notifyTeam={notifyTeam} setNotifyTeam={setNotifyTeam}
                duration={duration} setDuration={setDuration}
                assignee={assignee} startsNow={startsNow}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--neutral-50)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
            Étape <strong style={{ fontWeight: 600, color: 'var(--foreground)' }}>{step}</strong> sur 2
            {step === 1 && prospectCount > 0 && (
              <span style={{ marginLeft: 10, color: 'var(--brand-orange-dark)', fontWeight: 600 }}>· {prospectCount} prospect{prospectCount > 1 ? 's' : ''} avec téléphone</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 1 ? (
              <>
                <Button variant="secondary" onClick={handleClose}>Annuler</Button>
                <Button variant="primary" disabled={!step1Valid} onClick={goNext}
                  rightIcon={Icon.arrowRight({ size: 14 })}>
                  Suivant{prospectCount > 0 ? ` (${prospectCount} prospect${prospectCount > 1 ? 's' : ''})` : ''}
                </Button>
              </>
            ) : (
              <>
                <button onClick={goPrev} style={{
                  background: 'transparent', border: 'none', color: 'var(--muted-foreground)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 12px', borderRadius: 8,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--foreground)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}>
                  {Icon.arrowLeft({ size: 14 })} Précédent
                </button>
                <Button variant="secondary" onClick={handleSaveDraft}>Enregistrer en brouillon</Button>
                <Button variant="primary" disabled={!step2Valid} onClick={handleCreate}
                  leftIcon={startsNow ? Icon.zap({ size: 14 }) : Icon.calendar({ size: 14 })}>
                  {primaryLabel}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {confirmExit && (
        <div onClick={(e) => { e.stopPropagation(); setConfirmExit(false); }} style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 220,
          animation: 'fadeIn 150ms ease',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: 14, padding: 24,
            maxWidth: 420, width: 'calc(100% - 40px)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            animation: 'modalIn 180ms ease',
          }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Quitter sans enregistrer ?</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted-foreground)', lineHeight: 1.55, marginBottom: 20 }}>
              Vos modifications seront perdues. Cette action est irréversible.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onClick={() => setConfirmExit(false)}>Annuler</Button>
              <Button variant="primary" onClick={() => { setConfirmExit(false); onClose(); }}
                style={{ background: '#DC2626', borderColor: '#DC2626' }}>Quitter</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionStepper({ step, setStep, maxStepReached }) {
  const steps = [
    { n: 1, label: 'Prospects' },
    { n: 2, label: 'Configuration' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '14px 24px 14px', borderBottom: '1px solid var(--border)' }}>
      {steps.map((s, i) => {
        const isCurrent = s.n === step;
        const isDone = s.n < step;
        const canClick = s.n <= maxStepReached;
        return (
          <React.Fragment key={s.n}>
            <button onClick={() => canClick && setStep(s.n)} disabled={!canClick} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 8px', border: 'none', background: 'transparent',
              cursor: canClick ? 'pointer' : 'default', borderRadius: 6,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11.5, fontWeight: 700,
                background: isDone ? 'var(--brand-orange)' : isCurrent ? 'var(--foreground)' : 'var(--neutral-100)',
                color: isDone || isCurrent ? 'white' : 'var(--muted-foreground)',
              }}>{isDone ? Icon.check({ size: 12 }) : s.n}</span>
              <span style={{
                fontSize: 13, fontWeight: isCurrent ? 600 : 500,
                color: isCurrent ? 'var(--foreground)' : isDone ? 'var(--foreground)' : 'var(--muted-foreground)',
              }}>{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <span style={{ flex: 1, height: 1, background: isDone ? 'var(--brand-orange)' : 'var(--border)', margin: '0 8px' }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============= STEP 1 =============
function SessionStep1({ mode, setMode, selectedListId, setSelectedListId, phoneOnly, setPhoneOnly, refinements, setRefinements, filters, setFilters, selectedProspectIds, setSelectedProspectIds }) {
  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
        Qui voulez-vous appeler ?
      </h2>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>
        Choisissez une liste existante ou composez votre cible. Seuls les prospects avec téléphone peuvent être appelés.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        <SModeCard active={mode === 'existing'} onClick={() => setMode('existing')}
          icon="inbox" title="Liste existante"
          description="Choisir parmi mes listes de prospects déjà créées"/>
        <SModeCard active={mode === 'new'} onClick={() => setMode('new')}
          icon="filter" title="Nouvelle sélection"
          description="Composer une liste à la volée depuis mon CRM"/>
      </div>

      <div style={{ animation: 'fadeIn 200ms ease' }}>
        {mode === 'existing' && (
          <ExistingListPickerS selectedListId={selectedListId} setSelectedListId={setSelectedListId}
            phoneOnly={phoneOnly} setPhoneOnly={setPhoneOnly}
            refinements={refinements} setRefinements={setRefinements}/>
        )}
        {mode === 'new' && (
          <NewSelectionS filters={filters} setFilters={setFilters}
            selectedIds={selectedProspectIds} setSelectedIds={setSelectedProspectIds}/>
        )}
      </div>
    </div>
  );
}

function SModeCard({ active, onClick, icon, title, description }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: 14,
      background: active ? 'var(--brand-orange-tint)' : 'white',
      border: `1.5px solid ${active ? 'var(--brand-orange)' : 'var(--border)'}`,
      borderRadius: 10, cursor: 'pointer',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      transition: 'all 120ms',
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 9,
        background: active ? 'var(--brand-orange)' : 'var(--neutral-100)',
        color: active ? 'white' : 'var(--muted-foreground)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{Icon[icon]({ size: 18 })}</span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? 'var(--brand-orange-dark)' : 'var(--foreground)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{description}</div>
      </div>
    </button>
  );
}

function ExistingListPickerS({ selectedListId, setSelectedListId, phoneOnly, setPhoneOnly, refinements, setRefinements }) {
  const [search, setSearch] = useStateS('');
  const [refineOpen, setRefineOpen] = useStateS(false);

  const filtered = useMemoS(() => {
    return PROSPECT_LISTS.filter(l =>
      (!search || l.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search]);

  const selected = PROSPECT_LISTS.find(l => l.id === selectedListId);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>{Icon.search({ size: 14 })}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une liste..."
            style={{ width: '100%', height: 32, padding: '0 10px 0 32px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, outline: 'none' }}/>
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
          <input type="checkbox" checked={phoneOnly} onChange={(e) => setPhoneOnly(e.target.checked)} style={{ accentColor: 'var(--brand-orange)' }}/>
          Afficher uniquement les prospects avec téléphone
        </label>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--neutral-50)', zIndex: 1 }}>
            <tr>
              <th style={thStyleS(40)}></th>
              <th style={thStyleS()}>Nom de la liste</th>
              <th style={thStyleS(120)}>Source</th>
              <th style={thStyleS(80, 'right')}>Prospects</th>
              <th style={thStyleS(110)}>Téléphone</th>
              <th style={thStyleS(140)}>Auteur</th>
              <th style={thStyleS(90)}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const isSel = selectedListId === l.id;
              const phoneRatio = l.count > 0 ? l.withPhone / l.count : 0;
              const lowPhone = phoneRatio < 0.5;
              return (
                <tr key={l.id} onClick={() => setSelectedListId(l.id)} style={{
                  cursor: 'pointer',
                  background: isSel ? 'var(--brand-orange-tint)' : 'white',
                  borderTop: '1px solid var(--border)',
                }}>
                  <td style={tdStyleS()}>
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: `2px solid ${isSel ? 'var(--brand-orange)' : 'var(--neutral-300)'}`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSel && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-orange)' }}/>}
                    </span>
                  </td>
                  <td style={{ ...tdStyleS(), fontWeight: 600 }}>
                    {l.name}
                    {lowPhone && <span title="Moins de 50% des prospects ont un téléphone" style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, padding: '2px 6px', background: '#FFF3E0', color: '#9A6700', border: '1px solid #F0CF8C', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {Icon.alertTriangle({ size: 10 })}
                      Peu de tél.
                    </span>}
                  </td>
                  <td style={tdStyleS()}>{l.source}</td>
                  <td style={{ ...tdStyleS('right'), fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{l.count}</td>
                  <td style={tdStyleS()}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                      background: lowPhone ? '#FFF3E0' : '#E8F7EF',
                      color: lowPhone ? '#9A6700' : '#0E7A3A',
                      border: `1px solid ${lowPhone ? '#F0CF8C' : '#C5E5D2'}`,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {Icon.phone({ size: 10 })}
                      {l.withPhone}/{l.count}
                    </span>
                  </td>
                  <td style={tdStyleS()}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: l.author.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{l.author.initials}</span>
                      <span style={{ fontSize: 12 }}>{l.author.name}</span>
                    </span>
                  </td>
                  <td style={{ ...tdStyleS(), color: 'var(--muted-foreground)', fontSize: 11.5 }}>{l.createdAt}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, fontSize: 12.5, color: 'var(--muted-foreground)' }}>Aucune liste ne correspond.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <>
          <div style={{
            marginTop: 10, padding: 12,
            background: 'var(--brand-orange-tint)', border: '1px solid #FFD2B0', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            animation: 'fadeIn 180ms ease',
          }}>
            <span style={{ color: 'var(--brand-orange)', display: 'flex' }}>{Icon.check({ size: 14 })}</span>
            <span style={{ fontSize: 12.5, flex: 1 }}>
              Liste sélectionnée : <strong style={{ fontWeight: 700 }}>{selected.name}</strong>
              {' · '}
              <strong style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{phoneOnly ? selected.withPhone : selected.count}</strong>
              {' '}prospect{(phoneOnly ? selected.withPhone : selected.count) > 1 ? 's' : ''} appelable{(phoneOnly ? selected.withPhone : selected.count) > 1 ? 's' : ''}
            </span>
            <button onClick={() => setRefineOpen(o => !o)} style={{ background: 'transparent', border: 'none', color: 'var(--brand-orange-dark)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {refineOpen ? 'Masquer' : 'Affiner'}
            </button>
            <button onClick={() => setSelectedListId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Modifier
            </button>
          </div>

          {/* Sample preview */}
          <div style={{ marginTop: 8, padding: '8px 12px', fontSize: 11.5, color: 'var(--muted-foreground)' }}>
            Aperçu : {selected.sample.slice(0, 5).join(', ')}{selected.sample.length > 5 ? '...' : ''}
          </div>

          {refineOpen && (
            <div style={{
              marginTop: 4, padding: 12,
              border: '1px solid var(--border)', borderRadius: 10,
              background: 'white',
              animation: 'fadeIn 180ms ease',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Affiner la liste</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Switch checked={refinements.excludeContacted} onChange={(v) => setRefinements({ ...refinements, excludeContacted: v })} label="Exclure les prospects déjà contactés"/>
                <Switch checked={refinements.excludeMeeting} onChange={(v) => setRefinements({ ...refinements, excludeMeeting: v })} label="Exclure les statuts RDV / Signé"/>
                <Switch checked={refinements.excludeActive} onChange={(v) => setRefinements({ ...refinements, excludeActive: v })} label="Exclure les prospects déjà dans une session active"/>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NewSelectionS({ filters, setFilters, selectedIds, setSelectedIds }) {
  // Force withPhone always true
  useEffectS(() => {
    if (!filters.withPhone) setFilters({ ...filters, withPhone: true });
  }, [filters.withPhone]);

  const filtered = useMemoS(() => {
    return ALL_PROSPECTS.filter(p => {
      if (!p.hasPhone) return false; // hard requirement
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!`${p.firstName} ${p.lastName} ${p.company}`.toLowerCase().includes(q)) return false;
      }
      if (filters.statuses.length && !filters.statuses.includes(p.status)) return false;
      if (filters.sources.length && !filters.sources.includes(p.source)) return false;
      if (filters.tags.length && !filters.tags.some(t => p.tags.includes(t))) return false;
      if (filters.industries.length && !filters.industries.includes(p.industry)) return false;
      if (filters.sizes.length && !filters.sizes.includes(p.size)) return false;
      if (filters.location && !p.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.excludeActive && p.inActive) return false;
      return true;
    });
  }, [filters]);

  useEffectS(() => {
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
          <ChipMulti options={CRM_STATUSES} value={filters.statuses} onChange={(v) => setFilters({ ...filters, statuses: v })}/>
        </FilterGroup>
        <FilterGroup label="Source">
          <ChipMulti options={ALL_SOURCES} value={filters.sources} onChange={(v) => setFilters({ ...filters, sources: v })}/>
        </FilterGroup>
        <FilterGroup label="Tags">
          <ChipMulti options={ALL_TAGS} value={filters.tags} onChange={(v) => setFilters({ ...filters, tags: v })}/>
        </FilterGroup>
        <FilterGroup label="Industrie">
          <ChipMulti options={INDUSTRIES} value={filters.industries} onChange={(v) => setFilters({ ...filters, industries: v })}/>
        </FilterGroup>
        <FilterGroup label="Taille entreprise">
          <ChipMulti options={COMPANY_SIZES} value={filters.sizes} onChange={(v) => setFilters({ ...filters, sizes: v })}/>
        </FilterGroup>

        <FilterGroup label="Coordonnées">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div title="Le téléphone est requis pour les sessions d'appels" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: 'var(--brand-orange-tint)', border: '1px solid #FFD2B0', borderRadius: 6, fontSize: 11.5, color: 'var(--brand-orange-dark)', cursor: 'help' }}>
              <input type="checkbox" checked readOnly disabled style={{ accentColor: 'var(--brand-orange)' }}/>
              <span style={{ fontWeight: 600 }}>Avec téléphone</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '1px 5px', background: 'var(--brand-orange)', color: 'white', borderRadius: 3 }}>REQUIS</span>
            </div>
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
            label="Exclure les prospects déjà dans une session active"/>
        </div>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'white', display: 'flex', flexDirection: 'column', maxHeight: 460 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
          <span><strong style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{filtered.length}</strong> prospect{filtered.length > 1 ? 's' : ''} avec téléphone</span>
          <span style={{ color: 'var(--muted-foreground)' }}><strong style={{ color: 'var(--brand-orange)', fontWeight: 700 }}>{selectedCount}</strong> sélectionné{selectedCount > 1 ? 's' : ''}</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--neutral-50)', zIndex: 1 }}>
              <tr>
                <th style={thStyleS(36)}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ accentColor: 'var(--brand-orange)' }}/>
                </th>
                <th style={thStyleS()}>Nom</th>
                <th style={thStyleS()}>Titre · Entreprise</th>
                <th style={thStyleS(60)}>Tél.</th>
                <th style={thStyleS(90)}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isSel = selectedIds.includes(p.id);
                return (
                  <tr key={p.id} onClick={() => toggleOne(p.id)} style={{
                    cursor: 'pointer', borderTop: '1px solid var(--border)',
                    background: isSel ? 'var(--brand-orange-tint)' : 'white',
                  }}>
                    <td style={tdStyleS()}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleOne(p.id)} onClick={(e) => e.stopPropagation()} style={{ accentColor: 'var(--brand-orange)' }}/>
                    </td>
                    <td style={tdStyleS()}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: p.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{p.initials}</span>
                        <span style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</span>
                      </span>
                    </td>
                    <td style={{ ...tdStyleS(), color: 'var(--muted-foreground)' }}>
                      <span style={{ color: 'var(--foreground)' }}>{p.jobTitle}</span> · {p.company}
                    </td>
                    <td style={{ ...tdStyleS(), color: '#0E7A3A' }}>{Icon.check({ size: 12 })}</td>
                    <td style={tdStyleS()}>
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--neutral-100)', color: 'var(--neutral-700)' }}>{p.status}</span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, fontSize: 12.5, color: 'var(--muted-foreground)' }}>Aucun prospect avec téléphone ne correspond aux filtres.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--neutral-50)', fontSize: 11.5, color: 'var(--muted-foreground)' }}>
          {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''} sur {filtered.length} avec téléphone
        </div>
      </div>
    </div>
  );
}

function thStyleS(w, align) {
  return { textAlign: align || 'left', fontSize: 10.5, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '8px 10px', width: w };
}
function tdStyleS(align) {
  return { padding: '8px 10px', fontSize: 12, textAlign: align || 'left', verticalAlign: 'middle' };
}

// ============= STEP 2 =============
function SessionStep2({
  prospectCount, prospectLabel, onModify,
  name, setName, touchedName, setTouchedName, nameError, nameRef,
  description, setDescription,
  scheduleMode, setScheduleMode, scheduleDate, setScheduleDate, scheduleTime, setScheduleTime, isPlannedFuture,
  assigneeId, setAssigneeId,
  callOrder, setCallOrder,
  advancedOpen, setAdvancedOpen, waSequence, setWaSequence, notifyTeam, setNotifyTeam, duration, setDuration,
  assignee, startsNow,
}) {
  const sectionStyle = {
    border: '1px solid var(--border)', borderRadius: 10, padding: 14,
    background: 'white',
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'block' };

  const startsLabel = startsNow
    ? `Maintenant (${new Date().toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})`
    : (scheduleDate ? formatDateLong(scheduleDate, scheduleTime) : '— sélectionner une date —');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760, margin: '0 auto' }}>
      {/* Recap banner */}
      <div style={{
        padding: '10px 14px', background: 'var(--brand-orange-tint)', border: '1px solid #FFD2B0',
        borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5,
      }}>
        <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--brand-orange)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.users({ size: 14 })}</span>
        <span style={{ flex: 1 }}>Sélection : <strong style={{ fontWeight: 700 }}>{prospectCount} prospect{prospectCount > 1 ? 's' : ''}</strong> <span style={{ color: 'var(--muted-foreground)' }}>· {prospectLabel}</span></span>
        <button onClick={onModify} style={{ background: 'transparent', border: 'none', color: 'var(--brand-orange-dark)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Modifier</button>
      </div>

      {/* Bloc 1 — Identité */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Identité de la session</span>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
          Nom de la session <span style={{ color: 'var(--color-destructive)' }}>*</span>
        </label>
        <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouchedName(true)}
          placeholder="Ex : Appels relance leads MQL — 12 mai" maxLength={100}
          style={{
            width: '100%', height: 36, padding: '0 12px',
            border: `1px solid ${nameError ? 'var(--color-destructive)' : 'var(--border)'}`,
            borderRadius: 8, background: 'white', fontSize: 13, outline: 'none',
          }}
          onFocus={(e) => { if (!nameError) e.target.style.borderColor = 'var(--brand-orange)'; }}
          onBlurCapture={(e) => { e.target.style.borderColor = nameError ? 'var(--color-destructive)' : 'var(--border)'; }}
        />
        {nameError && <div style={{ fontSize: 11.5, color: 'var(--color-destructive)', marginTop: 4 }}>{nameError}</div>}

        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginTop: 12, marginBottom: 6 }}>
          Description / objectif <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>(optionnel)</span>
        </label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          placeholder="Ex : Qualifier l'intérêt des leads ayant téléchargé le livre blanc Q1"
          style={{
            width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8,
            background: 'white', fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.5, outline: 'none',
            resize: 'vertical', minHeight: 60,
          }}/>
      </div>

      {/* Bloc 2 — Planification */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Planification</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <RadioCard active={scheduleMode === 'now'} onClick={() => setScheduleMode('now')}
            icon="zap" title="Démarrer maintenant" sub="La session démarre dès la création"/>
          <RadioCard active={scheduleMode === 'later'} onClick={() => setScheduleMode('later')}
            icon="calendar" title="Planifier pour plus tard" sub="Choisir date et heure de démarrage"/>
        </div>
        {scheduleMode === 'later' && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, animation: 'fadeIn 180ms ease' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>Date</label>
              <input type="date" min={todayStr()} value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)' }}/>
            </div>
            <div style={{ width: 140 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>Heure</label>
              <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)' }}/>
            </div>
            {scheduleDate && !isPlannedFuture && (
              <div style={{ display: 'flex', alignItems: 'flex-end', fontSize: 11.5, color: 'var(--color-destructive)', paddingBottom: 8 }}>
                Date dans le passé
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bloc 3 — Assigné */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Assigné à</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TEAM_MEMBERS.map(m => {
            const isSel = assigneeId === m.id;
            return (
              <button key={m.id} onClick={() => setAssigneeId(m.id)} style={{
                padding: '8px 12px', borderRadius: 9999,
                border: `1.5px solid ${isSel ? 'var(--brand-orange)' : 'var(--border)'}`,
                background: isSel ? 'var(--brand-orange-tint)' : 'white',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: 12.5, fontWeight: isSel ? 600 : 500,
                color: isSel ? 'var(--brand-orange-dark)' : 'var(--foreground)',
              }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: m.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{m.initials}</span>
                <span>{m.name}</span>
                <span style={{ color: 'var(--muted-foreground)', fontWeight: 400, fontSize: 11.5 }}>· {m.role}</span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {Icon.info({ size: 11 })}
          L'assigné sera responsable des appels et des qualifications.
        </div>
      </div>

      {/* Bloc 4 — Ordre d'appel */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Ordre d'appel</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <RadioPill active={callOrder === 'list'} onClick={() => setCallOrder('list')} icon="inbox" label="Ordre de la liste"/>
          <RadioPill active={callOrder === 'random'} onClick={() => setCallOrder('random')} icon="rotate" label="Aléatoire"/>
          <RadioPill active={callOrder === 'priority'} onClick={() => setCallOrder('priority')} icon="arrowUp" label="Priorité statut CRM"/>
        </div>
        {callOrder === 'priority' && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--muted-foreground)', animation: 'fadeIn 150ms ease' }}>
            Ordre : <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>RDV → Qualifié → Contacté → Nouveau</strong>
          </div>
        )}
      </div>

      {/* Bloc 5 — Avancé */}
      <div style={{ ...sectionStyle, padding: 0 }}>
        <button onClick={() => setAdvancedOpen(o => !o)} style={{
          width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12.5, fontWeight: 600, color: 'var(--foreground)', textAlign: 'left',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {Icon.sliders({ size: 14 })}
            Options avancées
          </span>
          <span style={{ color: 'var(--muted-foreground)', transform: advancedOpen ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}>{Icon.chevDown({ size: 14 })}</span>
        </button>
        {advancedOpen && (
          <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn 200ms ease', borderTop: '1px solid var(--border)' }}>
            <div style={{ paddingTop: 12 }}>
              <Switch checked={waSequence} onChange={setWaSequence}
                label="Activer la séquence WhatsApp post-RDV par défaut"/>
              <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 4, paddingLeft: 32 }}>
                Tous les RDV bookés pendant la session activeront automatiquement la séquence WhatsApp (sous réserve du consentement coché au booking).
              </div>
            </div>
            <Switch checked={notifyTeam} onChange={setNotifyTeam} label="Notifier l'équipe au démarrage"/>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>Durée estimée</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {DURATIONS.map(d => (
                  <button key={d.id} onClick={() => setDuration(d.id)} style={{
                    padding: '5px 10px',
                    border: `1px solid ${duration === d.id ? 'var(--brand-orange)' : 'var(--border)'}`,
                    background: duration === d.id ? 'var(--brand-orange-tint)' : 'white',
                    color: duration === d.id ? 'var(--brand-orange-dark)' : 'var(--foreground)',
                    borderRadius: 7, cursor: 'pointer',
                    fontSize: 11.5, fontWeight: duration === d.id ? 600 : 500,
                  }}>{d.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloc 6 — Récap */}
      <div style={{
        background: 'var(--neutral-50)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 14,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        <RecapItem icon="users" label="Prospects" value={`${prospectCount} à appeler`}/>
        <RecapItem icon={startsNow ? 'zap' : 'calendar'} label="Démarrage" value={startsLabel}/>
        <RecapItem icon="clock" label="Durée estimée" value={DURATIONS.find(d => d.id === duration)?.label || '1h'}/>
        <RecapItem icon="users" label="Assigné" value={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: assignee?.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{assignee?.initials}</span>
            {assignee?.name}
          </span>
        }/>
      </div>
    </div>
  );
}

function RadioCard({ active, onClick, icon, title, sub }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, textAlign: 'left', padding: 12,
      background: active ? 'var(--brand-orange-tint)' : 'white',
      border: `1.5px solid ${active ? 'var(--brand-orange)' : 'var(--border)'}`,
      borderRadius: 9, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        border: `2px solid ${active ? 'var(--brand-orange)' : 'var(--neutral-300)'}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-orange)' }}/>}
      </span>
      <span style={{ width: 28, height: 28, borderRadius: 7, background: active ? 'var(--brand-orange)' : 'var(--neutral-100)', color: active ? 'white' : 'var(--muted-foreground)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {Icon[icon]({ size: 14 })}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--brand-orange-dark)' : 'var(--foreground)' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>{sub}</div>
      </div>
    </button>
  );
}

function RadioPill({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 12px', borderRadius: 9999,
      border: `1.5px solid ${active ? 'var(--brand-orange)' : 'var(--border)'}`,
      background: active ? 'var(--brand-orange-tint)' : 'white',
      color: active ? 'var(--brand-orange-dark)' : 'var(--foreground)',
      cursor: 'pointer',
      fontSize: 12, fontWeight: active ? 600 : 500,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {Icon[icon]({ size: 13 })}
      {label}
    </button>
  );
}

function RecapItem({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ width: 26, height: 26, borderRadius: 7, background: 'white', border: '1px solid var(--border)', color: 'var(--brand-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {Icon[icon]({ size: 13 })}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

window.CallSessionModal = CallSessionModal;
