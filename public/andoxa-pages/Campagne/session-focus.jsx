// Prospect focus card — center column. Sober, tool-style.

function ProspectFocus({ prospect, sessionScript, individualScripts, setIndividualScript, resetIndividualScript, onOpenBooking, onConfigureScript, notesByProspect, addNote, toast, focusNotesSignal }) {
  const [tab, setTab] = React.useState('script');
  React.useEffect(() => { setTab('script'); }, [prospect.id]);

  const initials = prospect.firstName[0] + prospect.lastName[0];

  const copyPhone = (number) => {
    navigator.clipboard?.writeText(number);
    toast.push({ message: 'Numéro copié' });
  };

  return (
    <main style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '20px 24px 24px' }}>
      {/* BLOC 1: Identity */}
      <section style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12, flexShrink: 0,
          background: 'var(--neutral-100)', color: 'var(--foreground)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 600,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            {prospect.firstName} <span style={{ textTransform: 'uppercase' }}>{prospect.lastName}</span>
          </h1>
          <div style={{ fontSize: 13.5, color: 'var(--foreground)', marginTop: 2 }}>
            {prospect.jobTitle} · <span style={{ color: 'var(--muted-foreground)' }}>{prospect.company}</span>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span>{prospect.location}</span>
            <span>·</span>
            <span>{prospect.headcount}</span>
            <span>·</span>
            <span>{prospect.sector}</span>
          </div>
        </div>
        {prospect.linkedin && (
          <a href={prospect.linkedin} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12.5, color: '#0A66C2', textDecoration: 'none', fontWeight: 500,
          }}>
            Profil LinkedIn {Icon.external({ size: 11 })}
          </a>
        )}
      </section>

      {/* BLOC 2: Phone (no call button) */}
      <section style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', marginBottom: 14,
        background: 'white', border: '1px solid var(--border)', borderRadius: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'var(--neutral-100)', color: 'var(--foreground)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.phone({ size: 16 })}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 2 }}>
            Mobile · à composer sur votre téléphone
          </div>
          <div
            onClick={() => copyPhone(prospect.phone)}
            title="Cliquer pour copier"
            style={{
              fontSize: 19, fontWeight: 600, letterSpacing: '0.005em',
              fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
              color: 'var(--foreground)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#0052D9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--foreground)'; }}
          >
            {prospect.phone}
            <span style={{ display: 'flex', opacity: 0.5 }}>{Icon.copy({ size: 13 })}</span>
          </div>

        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, padding: '2px 6px', borderRadius: 4, background: 'var(--neutral-100)', color: 'var(--muted-foreground)', fontWeight: 600 }}>C</span>
      </section>

      {/* BLOC 3: Primary action — Book a meeting */}
      <section style={{
        background: 'linear-gradient(135deg, #F5F0FF 0%, #EFE7FF 100%)',
        border: '1px solid #5B2EBF33',
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
            Caler un RDV maintenant
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 2 }}>
            Si le prospect accepte, prenez le RDV en direct.
          </div>
        </div>
        <button onClick={onOpenBooking} style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '11px 20px', borderRadius: 9, border: 'none',
          background: '#5B2EBF', color: 'white',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 3px 10px -2px rgba(91,46,191,0.35)',
        }}>
          {Icon.calendar({ size: 15 })}
          Réserver un RDV
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.18)', fontWeight: 600 }}>R</span>
        </button>
      </section>

      {/* BLOC 4: Tabs */}
      <section style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 8px' }}>
          {[
            { id: 'script', label: 'Script' },
            { id: 'historique', label: 'Historique' },
            { id: 'notes', label: 'Notes en direct' },
          ].map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '12px 14px 11px',
                border: 'none', background: 'transparent',
                fontSize: 13, fontWeight: active ? 600 : 500,
                color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                borderBottom: `2px solid ${active ? '#0052D9' : 'transparent'}`,
                marginBottom: -1, cursor: 'pointer',
              }}>{t.label}</button>
            );
          })}
        </div>
        <div style={{ padding: '18px 20px' }}>
          {tab === 'script' && (
            <ScriptTab
              prospect={prospect}
              sessionScript={sessionScript}
              individualScript={individualScripts[prospect.id]}
              setIndividualScript={(t) => setIndividualScript(prospect.id, t)}
              resetIndividualScript={() => resetIndividualScript(prospect.id)}
              onConfigureScript={onConfigureScript}
            />
          )}
          {tab === 'historique' && <HistoryTab prospect={prospect}/>}
          {tab === 'notes' && (
            <NotesTab
              prospect={prospect}
              notes={notesByProspect[prospect.id] || []}
              addNote={(t) => addNote(prospect.id, t)}
              focusSignal={focusNotesSignal}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function ScriptTab({ prospect, sessionScript, individualScript, setIndividualScript, resetIndividualScript, onConfigureScript }) {
  const [editing, setEditing] = React.useState(false);
  const isOverridden = individualScript !== undefined;
  const baseTemplate = isOverridden ? individualScript : sessionScript;
  const rendered = interpolateScript(baseTemplate || '', prospect);

  // No script defined at all
  if (!sessionScript && !isOverridden) {
    return (
      <div style={{ padding: '24px 12px', textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, color: 'var(--foreground)', fontWeight: 500, marginBottom: 6 }}>
          Aucun script défini pour cette session
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginBottom: 14, lineHeight: 1.55, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
          Rédigez votre propre script. Utilisez des variables comme {'{{firstName}}'} pour personnaliser automatiquement.
        </div>
        <button onClick={onConfigureScript} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 14px', borderRadius: 7,
          border: '1px solid var(--border)', background: 'white',
          fontSize: 13, fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer',
        }}>{Icon.plus({ size: 13 })} Configurer le script</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOverridden && (
            <>
              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 9999, background: 'var(--brand-blue-tint)', color: '#0052D9', fontWeight: 600 }}>
                Modifié pour ce prospect
              </span>
              <button onClick={resetIndividualScript} style={{ fontSize: 11.5, color: 'var(--muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Réinitialiser au script de session
              </button>
            </>
          )}
        </div>
        <button onClick={() => setEditing(e => !e)} title="Modifier pour ce prospect" style={{
          width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'white',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)',
        }}>
          {Icon.edit({ size: 13 })}
        </button>
      </div>

      {editing ? (
        <textarea
          value={baseTemplate}
          onChange={(e) => setIndividualScript(e.target.value)}
          onBlur={() => setEditing(false)}
          autoFocus
          style={{
            width: '100%', minHeight: 240, resize: 'vertical',
            padding: '12px 14px', borderRadius: 8,
            border: '1px solid #0052D9', background: 'white',
            fontSize: 14, fontFamily: 'var(--font-sans)', lineHeight: 1.65,
            color: 'var(--foreground)', outline: 'none',
          }}
        />
      ) : (
        <div style={{
          fontSize: 14.5, lineHeight: 1.7, color: 'var(--foreground)',
          whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)',
        }}>{rendered}</div>
      )}
    </div>
  );
}

function HistoryTab({ prospect }) {
  if (prospect.history.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--muted-foreground)', textAlign: 'center', padding: '20px 0' }}>
      Aucune interaction antérieure.
    </div>;
  }
  const colors = {
    linkedin: { bg: '#EDF6FF', fg: '#0A66C2' },
    email:    { bg: '#F0EAFE', fg: '#5B2EBF' },
    phone:    { bg: '#E8F0FD', fg: '#0052D9' },
    note:     { bg: 'var(--neutral-100)', fg: 'var(--foreground)' },
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {prospect.history.map((h, i) => {
        const c = colors[h.kind];
        const iconName = h.kind === 'email' ? 'message' : (h.kind === 'note' ? 'edit' : h.kind);
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '10px 0',
            borderBottom: i < prospect.history.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              background: c.bg, color: c.fg,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{Icon[iconName]({ size: 12 })}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>{h.label}</div>
              {h.body && <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 3, lineHeight: 1.5 }}>{h.body}</div>}
              <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 2 }}>{h.date}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotesTab({ prospect, notes, addNote, focusSignal }) {
  const [val, setVal] = React.useState('');
  const taRef = React.useRef(null);
  React.useEffect(() => { setVal(''); }, [prospect.id]);
  React.useEffect(() => { if (focusSignal) taRef.current?.focus(); }, [focusSignal]);

  const handleBlur = () => {
    if (val.trim()) {
      addNote(val.trim());
      setVal('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <textarea
        ref={taRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        placeholder="Notes pendant l'appel…"
        autoFocus
        style={{
          width: '100%', minHeight: 110, resize: 'vertical',
          padding: '11px 13px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--neutral-50)',
          fontSize: 13.5, fontFamily: 'var(--font-sans)', lineHeight: 1.55,
          color: 'var(--foreground)', outline: 'none',
        }}
        onFocus={(e) => { e.target.style.borderColor = '#0052D9'; e.target.style.background = 'white'; }}
      />
      {notes.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', textAlign: 'center', padding: '10px 0' }}>
          Aucune note pour ce prospect
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.04em' }}>
            Notes précédentes
          </div>
          {notes.slice().reverse().map((n, i) => (
            <div key={i} style={{ padding: '10px 12px', background: 'var(--neutral-50)', borderRadius: 7, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 3 }}>
                {n.author} · {n.time}
              </div>
              {n.body}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.ProspectFocus = ProspectFocus;
