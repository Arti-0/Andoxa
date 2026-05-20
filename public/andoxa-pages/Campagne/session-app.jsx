// Session app — wires topbar + queue + focus + qualbar + modals.

function SessionApp() {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [statuses, setStatuses] = React.useState({}); // { prospectId: { id, label, color, time } }
  const [sessionDurationSec, setSessionDurationSec] = React.useState(32 * 60 + 14);

  // Modals
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const [showRecap, setShowRecap] = React.useState(false);
  const [showBooking, setShowBooking] = React.useState(false);
  const [showCallback, setShowCallback] = React.useState(false);
  const [showScriptEditor, setShowScriptEditor] = React.useState(false);

  // Scripts
  const [sessionScript, setSessionScript] = React.useState(DEFAULT_SCRIPT);
  const [individualScripts, setIndividualScripts] = React.useState({}); // { prospectId: text }

  // Notes per prospect
  const [notesByProspect, setNotesByProspect] = React.useState({});
  const [focusNotesSignal, setFocusNotesSignal] = React.useState(0);

  // Queue filters
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const searchRef = React.useRef(null);

  // Auto-advance toggle
  const [autoAdvance, setAutoAdvance] = React.useState(true);

  const toast = React.useContext(ToastContext);
  const prospects = SESSION_PROSPECTS;
  const current = prospects[currentIdx];

  // Session timer
  React.useEffect(() => {
    const t = setInterval(() => setSessionDurationSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ---------- Actions ----------
  const goNext = () => {
    if (currentIdx < prospects.length - 1) setCurrentIdx(i => i + 1);
    else setShowRecap(true);
  };
  const goPrev = () => { if (currentIdx > 0) setCurrentIdx(i => i - 1); };
  const jumpTo = (i) => setCurrentIdx(i);

  const recordOutcome = (outcome) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setStatuses(s => ({ ...s, [current.id]: { ...outcome, time } }));
    toast.push({
      message: `${current.firstName} ${current.lastName} — ${outcome.label}`,
      sub: 'Fiche CRM mise à jour',
    });
    if (autoAdvance) setTimeout(goNext, 280);
  };

  const handleQualPick = (outcome) => recordOutcome(outcome);
  const handleCallback = () => setShowCallback(true);

  const confirmCallback = (slot) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setStatuses(s => ({ ...s, [current.id]: { id: 'callback', label: 'À rappeler', color: '#D97706', time } }));
    toast.push({ message: `À rappeler — ${slot.label.toLowerCase()}`, sub: `${current.firstName} ${current.lastName}` });
    setShowCallback(false);
    if (autoAdvance) setTimeout(goNext, 280);
  };

  const confirmBooking = (slot) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setStatuses(s => ({ ...s, [current.id]: { id: 'rdv', label: 'RDV pris', color: '#5B2EBF', time } }));
    toast.push({ message: `RDV pris — ${slot.date} ${slot.time}`, sub: `${current.firstName} ${current.lastName}` });
    setShowBooking(false);
    if (autoAdvance) setTimeout(goNext, 280);
  };

  // Script handlers
  const setIndividualScript = (pid, text) => {
    setIndividualScripts(s => ({ ...s, [pid]: text }));
  };
  const resetIndividualScript = (pid) => {
    setIndividualScripts(s => { const n = { ...s }; delete n[pid]; return n; });
  };
  const saveSessionScript = (text) => {
    setSessionScript(text);
    setShowScriptEditor(false);
    toast.push({ message: 'Script de session enregistré' });
  };

  // Notes
  const addNote = (pid, text) => {
    if (!text.trim()) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setNotesByProspect(n => ({
      ...n,
      [pid]: [...(n[pid] || []), { author: SESSION_META.agent.name, time, body: text }],
    }));
  };

  // ---------- Keyboard shortcuts ----------
  React.useEffect(() => {
    const handler = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const inField = tag === 'textarea' || tag === 'input' || e.target.isContentEditable;

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        if (inField) return;
        e.preventDefault(); setShowShortcuts(s => !s); return;
      }
      if (e.key === '/' && !inField) {
        e.preventDefault(); searchRef.current?.focus(); return;
      }
      if (e.key === 'Escape') {
        if (showShortcuts) setShowShortcuts(false);
        else if (showBooking) setShowBooking(false);
        else if (showCallback) setShowCallback(false);
        else if (showScriptEditor) setShowScriptEditor(false);
        else if (showRecap) setShowRecap(false);
        return;
      }
      if (inField) return;
      if (showShortcuts || showBooking || showRecap || showCallback || showScriptEditor) return;

      if (e.key === ' ') { e.preventDefault(); goNext(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); return; }
      if (e.key === 'c' || e.key === 'C') { navigator.clipboard?.writeText(current.phone); toast.push({ message: 'Numéro copié' }); return; }
      if (e.key === 'l' || e.key === 'L') { if (current.linkedin) window.open(current.linkedin, '_blank'); return; }
      if (e.key === 'n' || e.key === 'N') { setFocusNotesSignal(v => v + 1); return; }

      // Outcome shortcuts
      const k = e.key.toUpperCase();
      if (k === 'R') { e.preventDefault(); setShowBooking(true); return; }
      if (k === 'A') { e.preventDefault(); handleCallback(); return; }
      const o = OUTCOMES.find(x => x.shortcut === k);
      if (o && o.id !== 'rdv' && o.id !== 'callback') { e.preventDefault(); recordOutcome(o); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIdx, showShortcuts, showBooking, showRecap, showCallback, showScriptEditor, autoAdvance]);

  // ---------- Render ----------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#FAFAFB' }}>
      <SessionTopbar
        campaignName={SESSION_META.campaign}
        goal={SESSION_META.goal}
        completed={Object.keys(statuses).length}
        sessionDurationSec={sessionDurationSec}
        agent={SESSION_META.agent}
        onExit={() => setShowRecap(true)}
        onShortcuts={() => setShowShortcuts(true)}
        onConfigureScript={() => setShowScriptEditor(true)}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <QueueRail
          prospects={prospects}
          currentIdx={currentIdx}
          statuses={statuses}
          onJump={jumpTo}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={currentIdx > 0}
          hasNext={currentIdx < prospects.length - 1}
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
          searchRef={searchRef}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ProspectFocus
            prospect={current}
            sessionScript={sessionScript}
            individualScripts={individualScripts}
            setIndividualScript={setIndividualScript}
            resetIndividualScript={resetIndividualScript}
            onOpenBooking={() => setShowBooking(true)}
            onConfigureScript={() => setShowScriptEditor(true)}
            notesByProspect={notesByProspect}
            addNote={addNote}
            toast={toast}
            focusNotesSignal={focusNotesSignal}
          />
          <QualificationBar
            onPick={handleQualPick}
            onCallback={handleCallback}
            onSkip={goNext}
            onPrev={goPrev}
            hasPrev={currentIdx > 0}
            hasNext={currentIdx < prospects.length - 1}
            autoAdvance={autoAdvance}
            setAutoAdvance={setAutoAdvance}
          />
        </div>
      </div>

      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)}/>
      <BookingModal open={showBooking} onClose={() => setShowBooking(false)} onConfirm={confirmBooking} prospect={current}/>
      <CallbackPopover open={showCallback} onClose={() => setShowCallback(false)} onPick={confirmCallback}/>
      <ScriptEditorModal
        open={showScriptEditor}
        onClose={() => setShowScriptEditor(false)}
        onSave={saveSessionScript}
        initialValue={sessionScript}
        prospects={prospects}
        currentProspectIdx={currentIdx}
      />
      <SessionRecap
        open={showRecap}
        onClose={() => setShowRecap(false)}
        onResume={() => setShowRecap(false)}
        processed={statuses}
        prospects={prospects}
        durationSec={sessionDurationSec}
        outcomes={OUTCOMES}
      />
    </div>
  );
}

function SessionRoot() {
  return (
    <ToastProvider>
      <SessionApp/>
    </ToastProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SessionRoot/>);
