// LinkedIn Campaign Creation Modal — main component
const { useState: useStateM, useEffect: useEffectM, useRef: useRefM, useMemo: useMemoM } = React;

function CreateCampaignModal({ open, onClose, onCreate, onDraft }) {
  const [step, setStep] = useStateM(1);
  const [maxStepReached, setMaxStepReached] = useStateM(1);
  // Step 1 — prospects
  const [prospectMode, setProspectMode] = useStateM('existing'); // 'existing' | 'new'
  const [selectedListId, setSelectedListId] = useStateM(null);
  const [refinements, setRefinements] = useStateM({ excludeContacted: false, excludeMeeting: false, onlyWithPhone: false, excludeActive: true });
  const [newSelFilters, setNewSelFilters] = useStateM({ search: '', statuses: [], sources: [], tags: [], industries: [], sizes: [], withPhone: false, withEmail: false, withWA: false, location: '', excludeActive: true });
  const [selectedProspectIds, setSelectedProspectIds] = useStateM([]);
  const [type, setType] = useStateM(null); // 'invitation_only' | 'message_only' | 'invitation_message'
  const [name, setName] = useStateM('');
  const [touchedName, setTouchedName] = useStateM(false);
  const [hasNote, setHasNote] = useStateM(false);
  const [invitationNote, setInvitationNote] = useStateM('');
  const [message, setMessage] = useStateM('');
  const [delay, setDelay] = useStateM('24');
  const [saveAsTemplate, setSaveAsTemplate] = useStateM(false);
  const [previewProspect, setPreviewProspect] = useStateM(0);
  const [confirmExit, setConfirmExit] = useStateM(false);
  const [direction, setDirection] = useStateM('forward'); // for slide animation

  const inviteRef = useRefM(null);
  const messageRef = useRefM(null);
  const nameRef = useRefM(null);
  const overlayRef = useRefM(null);

  // Reset on close
  useEffectM(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1); setMaxStepReached(1);
        setProspectMode('existing'); setSelectedListId(null);
        setRefinements({ excludeContacted: false, excludeMeeting: false, onlyWithPhone: false, excludeActive: true });
        setNewSelFilters({ search: '', statuses: [], sources: [], tags: [], industries: [], sizes: [], withPhone: false, withEmail: false, withWA: false, location: '', excludeActive: true });
        setSelectedProspectIds([]);
        setType(null); setName(''); setTouchedName(false);
        setHasNote(false); setInvitationNote(''); setMessage('');
        setDelay('24'); setSaveAsTemplate(false); setPreviewProspect(0);
        setConfirmExit(false);
      }, 200);
    }
  }, [open]);

  // Auto-focus first field on step entry
  useEffectM(() => {
    if (!open) return;
    setTimeout(() => {
      if (step === 2 && nameRef.current && type) nameRef.current.focus();
      if (step === 3) {
        if (type === 'message_only' && messageRef.current) messageRef.current.focus();
        else if (type === 'invitation_only' && hasNote && inviteRef.current) inviteRef.current.focus();
        else if (type === 'invitation_message' && hasNote && inviteRef.current) inviteRef.current.focus();
      }
    }, 350);
  }, [step, open]);

  // Escape & dirty check
  const isDirty = !!(type || name || invitationNote || message || selectedListId || selectedProspectIds.length);

  // Resolve current prospect target & count
  const selectedList = PROSPECT_LISTS.find(l => l.id === selectedListId) || null;
  const prospectCount = prospectMode === 'existing'
    ? (selectedList ? computeRefinedCount(selectedList, refinements) : 0)
    : selectedProspectIds.length;
  const prospectLabel = prospectMode === 'existing' && selectedList
    ? selectedList.name
    : prospectMode === 'new' && selectedProspectIds.length
    ? `Sélection à la volée (${selectedProspectIds.length})`
    : '—';
  useEffectM(() => {
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

  // Validation
  const nameValid = name.trim().length >= 3 && name.trim().length <= 80;
  const nameError = touchedName && name.trim().length > 0 && name.trim().length < 3
    ? "Le nom doit faire au moins 3 caractères"
    : touchedName && name.trim().length > 80
    ? "Le nom ne peut pas dépasser 80 caractères"
    : '';

  const step1Valid = prospectMode === 'existing' ? !!selectedListId : selectedProspectIds.length > 0;
  const step2Valid = !!type && nameValid;
  const step3Valid = (() => {
    if (type === 'invitation_only') {
      if (hasNote) return invitationNote.trim().length > 0 && invitationNote.length <= 300;
      return true;
    }
    if (type === 'message_only') return message.trim().length > 0 && message.length <= 2000;
    if (type === 'invitation_message') {
      const noteOk = !hasNote || (invitationNote.trim().length > 0 && invitationNote.length <= 300);
      return noteOk && message.trim().length > 0 && message.length <= 2000;
    }
    return false;
  })();

  const goNext = () => {
    setDirection('forward');
    const next = Math.min(step + 1, 4);
    setStep(next); setMaxStepReached(m => Math.max(m, next));
  };
  const goPrev = () => { setDirection('backward'); setStep(s => Math.max(s - 1, 1)); };

  const handleClose = () => { if (isDirty) setConfirmExit(true); else onClose(); };

  const handleCreate = () => { onCreate({ type, name, hasNote, invitationNote, message, delay }); };
  const handleSaveDraft = () => { onDraft({ type, name, hasNote, invitationNote, message, delay }); };

  if (!open) return null;

  const prospect = MOCK_PROSPECTS[previewProspect];
  const TYPE_META = {
    invitation_only: { label: 'Invitation seule', icon: 'userPlus' },
    message_only: { label: 'Message', icon: 'message' },
    invitation_message: { label: 'Invitation + Message', icon: 'workflow' },
  };

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
              background: '#0A66C2', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Icon.linkedin({ size: 18 })}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>Créer une campagne LinkedIn</div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                {step === 1 ? (
                  <span>Choisissez les prospects à cibler.</span>
                ) : (
                  <span>Cible : <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{prospectLabel}</strong> ({prospectCount} prospects) <a href="#" onClick={(e) => { e.preventDefault(); setDirection('backward'); setStep(1); }} style={{ color: 'var(--brand-blue)', textDecoration: 'none', fontWeight: 500, marginLeft: 4 }}>Modifier</a></span>
                )}
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

        <Stepper step={step} setStep={(n) => { setDirection(n < step ? 'backward' : 'forward'); setStep(n); }} maxStepReached={maxStepReached}/>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <div key={step} style={{
            animation: `${direction === 'forward' ? 'slideInRight' : 'slideInLeft'} 280ms ease`,
            padding: '20px 24px',
          }}>
            {step === 1 && (
              <Step1Prospects mode={prospectMode} setMode={setProspectMode}
                selectedListId={selectedListId} setSelectedListId={setSelectedListId}
                refinements={refinements} setRefinements={setRefinements}
                filters={newSelFilters} setFilters={setNewSelFilters}
                selectedProspectIds={selectedProspectIds} setSelectedProspectIds={setSelectedProspectIds}/>
            )}
            {step === 2 && (
              <Step1 type={type} setType={setType} name={name} setName={setName}
                touchedName={touchedName} setTouchedName={setTouchedName} nameError={nameError} nameRef={nameRef}/>
            )}
            {step === 3 && (
              <Step2 type={type} hasNote={hasNote} setHasNote={setHasNote}
                invitationNote={invitationNote} setInvitationNote={setInvitationNote}
                message={message} setMessage={setMessage} delay={delay} setDelay={setDelay}
                saveAsTemplate={saveAsTemplate} setSaveAsTemplate={setSaveAsTemplate}
                inviteRef={inviteRef} messageRef={messageRef} prospect={prospect}/>
            )}
            {step === 4 && (
              <Step3 type={type} name={name} hasNote={hasNote}
                invitationNote={invitationNote} message={message} delay={delay}
                previewProspect={previewProspect} setPreviewProspect={setPreviewProspect}
                prospect={prospect} typeLabel={TYPE_META[type]?.label} typeIcon={TYPE_META[type]?.icon}
                prospectLabel={prospectLabel} prospectCount={prospectCount}/>
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
            Étape <strong style={{ fontWeight: 600, color: 'var(--foreground)' }}>{step}</strong> sur 4
            {step === 1 && prospectCount > 0 && (
              <span style={{ marginLeft: 10, color: 'var(--brand-blue)', fontWeight: 600 }}>· {prospectCount} prospect{prospectCount > 1 ? 's' : ''} ciblé{prospectCount > 1 ? 's' : ''}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 1 && (
              <>
                <Button variant="secondary" onClick={handleClose}>Annuler</Button>
                <Button variant="primary" disabled={!step1Valid} onClick={goNext}
                  rightIcon={Icon.arrowRight({ size: 14 })}>Continuer</Button>
              </>
            )}
            {step === 2 && (
              <>
                <Button variant="secondary" onClick={goPrev} leftIcon={Icon.arrowLeft({ size: 14 })}>Précédent</Button>
                <Button variant="primary" disabled={!step2Valid} onClick={goNext}
                  rightIcon={Icon.arrowRight({ size: 14 })}>Suivant</Button>
              </>
            )}
            {step === 3 && (
              <>
                <Button variant="secondary" onClick={goPrev} leftIcon={Icon.arrowLeft({ size: 14 })}>Précédent</Button>
                <Button variant="primary" disabled={!step3Valid} onClick={goNext}
                  rightIcon={Icon.arrowRight({ size: 14 })}>Aperçu</Button>
              </>
            )}
            {step === 4 && (
              <>
                <button onClick={goPrev} style={{
                  background: 'transparent', border: 'none', color: 'var(--muted-foreground)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 12px', borderRadius: 8,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--foreground)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}>
                  {Icon.arrowLeft({ size: 14 })} Retour
                </button>
                <Button variant="secondary" onClick={handleSaveDraft}>Enregistrer en brouillon</Button>
                <Button variant="primary" onClick={handleCreate} leftIcon={Icon.zap({ size: 14 })}>Créer et lancer</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Exit confirm */}
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

// ---------- STEP 1 ----------
function Step1({ type, setType, name, setName, touchedName, setTouchedName, nameError, nameRef }) {
  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
        Choisissez le type de campagne
      </h2>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 18 }}>
        Sélectionnez la séquence qui correspond à votre objectif.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <TypeCard id="invitation_only" title="Invitation seule" subtitle="alias Connexion"
          icon="userPlus"
          description="Envoyer une demande de connexion, avec ou sans note."
          useCase="Pour entrer en relation avec de nouveaux prospects."
          selected={type === 'invitation_only'} onClick={setType}/>
        <TypeCard id="message_only" title="Message"
          icon="message"
          description="Envoyer un message direct à des prospects connectés (1er niveau)."
          useCase="Pour activer votre réseau existant."
          selected={type === 'message_only'} onClick={setType}/>
        <TypeCard id="invitation_message" title="Invitation + Message" recommended
          icon="workflow"
          description="Envoyer une invitation, puis un message automatique si elle est acceptée."
          useCase="Acquérir et activer en une seule séquence."
          selected={type === 'invitation_message'} onClick={setType}/>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Nom de la campagne <span style={{ color: 'var(--color-destructive)' }}>*</span>
        </label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouchedName(true)}
          placeholder="Ex : Prospection CTO SaaS Q2 2026"
          maxLength={100}
          style={{
            width: '100%', height: 38, padding: '0 12px',
            border: `1px solid ${nameError ? 'var(--color-destructive)' : 'var(--border)'}`,
            borderRadius: 8, background: 'white',
            fontSize: 13.5, fontFamily: 'var(--font-sans)', outline: 'none',
            transition: 'border-color 120ms',
          }}
          onFocus={(e) => { if (!nameError) e.target.style.borderColor = 'var(--brand-blue)'; }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, minHeight: 16 }}>
          <span style={{ fontSize: 11.5, color: nameError ? 'var(--color-destructive)' : 'var(--muted-foreground)' }}>
            {nameError || 'Donnez un nom clair à votre campagne pour la retrouver facilement.'}
          </span>
          <span style={{ fontSize: 11, color: name.length > 80 ? 'var(--color-destructive)' : 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
            {name.length}/80
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- STEP 2 ----------
function Step2({ type, hasNote, setHasNote, invitationNote, setInvitationNote, message, setMessage,
  delay, setDelay, saveAsTemplate, setSaveAsTemplate, inviteRef, messageRef, prospect }) {

  const insertInvite = (snippet) => insertAtCursor(inviteRef, invitationNote, setInvitationNote, snippet);
  const insertMessage = (snippet) => insertAtCursor(messageRef, message, setMessage, snippet);

  const sectionStyle = {
    border: '1px solid var(--border)', borderRadius: 10, padding: 16,
    background: 'white',
  };

  const InvitationSection = ({ label, num }) => (
    <div style={sectionStyle}>
      {label && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--brand-blue)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11.5, fontWeight: 700,
        }}>{num}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
      </div>}
      <div style={{ marginBottom: 12 }}>
        <Switch checked={hasNote} onChange={setHasNote} label="Avec note personnalisée"/>
      </div>
      {hasNote ? (
        <div style={{ animation: 'fadeIn 200ms ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>Variables</span>
            <Switch checked={saveAsTemplate} onChange={setSaveAsTemplate} label="Enregistrer comme template"/>
          </div>
          <div style={{ marginBottom: 8 }}><VariablePills onInsert={insertInvite}/></div>
          <Editor value={invitationNote} onChange={setInvitationNote}
            max={300} placeholder="Bonjour {{firstName}}, je vous suis depuis quelque temps..."
            rows={4} ariaLabel="Note d'invitation"/>
        </div>
      ) : (
        <div style={{
          background: 'var(--neutral-50)', border: '1px dashed var(--border)',
          borderRadius: 8, padding: '10px 12px',
          fontSize: 12.5, color: 'var(--muted-foreground)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {Icon.info({ size: 13 })}
          Une demande de connexion sans note sera envoyée.
        </div>
      )}
    </div>
  );

  const MessageSection = ({ withDelay = false }) => (
    <div style={sectionStyle}>
      {withDelay && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--brand-blue)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11.5, fontWeight: 700,
        }}>2</span>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Étape 2 — Message après acceptation</span>
      </div>}
      {withDelay && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>
            Envoyer le message
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {DELAY_OPTIONS.map(d => (
              <button key={d.id} onClick={() => setDelay(d.id)}
                style={{
                  padding: '6px 10px',
                  border: `1px solid ${delay === d.id ? 'var(--brand-blue)' : 'var(--border)'}`,
                  background: delay === d.id ? 'var(--brand-blue-tint)' : 'white',
                  color: delay === d.id ? 'var(--brand-blue-dark)' : 'var(--foreground)',
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: delay === d.id ? 600 : 500,
                  transition: 'all 100ms',
                }}>
                {d.label}
              </button>
            ))}
          </div>
          {(delay === '0' || delay === '1') && (
            <div style={{
              marginTop: 10, padding: '10px 12px',
              background: '#FFF6E5', border: '1px solid #F0CF8C', borderRadius: 8,
              display: 'flex', alignItems: 'flex-start', gap: 8,
              fontSize: 12.5, color: '#7A4D00', lineHeight: 1.5,
              animation: 'fadeIn 200ms ease',
            }}>
              <span style={{ flexShrink: 0, marginTop: 1, color: '#9A6700' }}>{Icon.alertTriangle({ size: 14 })}</span>
              <span><strong style={{ fontWeight: 600 }}>Risque de paraître automatisé.</strong> LinkedIn peut le détecter et pénaliser votre compte.</span>
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>Variables</span>
        {!withDelay && <Switch checked={saveAsTemplate} onChange={setSaveAsTemplate} label="Enregistrer comme template"/>}
      </div>
      <div style={{ marginBottom: 8 }}><VariablePills onInsert={insertMessage}/></div>
      <textarea
        ref={messageRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Bonjour {{firstName}},\n\nJ'ai vu votre profil chez {{company}}...`}
        rows={7}
        style={{
          width: '100%', padding: '10px 12px',
          border: `1px solid ${message.length > 2000 ? 'var(--color-destructive)' : 'var(--border)'}`,
          borderRadius: 8, background: 'white',
          fontFamily: 'var(--font-sans)', fontSize: 13.5,
          lineHeight: 1.55, resize: 'vertical', outline: 'none',
          minHeight: 140,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Markdown léger non supporté.</span>
        <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: message.length > 2000 ? 'var(--color-destructive)' : message.length > 1800 ? '#9A6700' : 'var(--muted-foreground)', fontWeight: 500 }}>
          {message.length}/2000
        </span>
      </div>

      {withDelay && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: 'var(--brand-blue-tint)', border: '1px solid #C5DAF8', borderRadius: 8,
          display: 'flex', alignItems: 'flex-start', gap: 8,
          fontSize: 12.5, color: 'var(--brand-blue-dark)', lineHeight: 1.5,
        }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>{Icon.info({ size: 14 })}</span>
          <span>Si le prospect répond avant le délai, le message automatique ne sera pas envoyé. Vous prenez le relais manuellement depuis l'inbox Andoxa.</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      {/* Left column — config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>
          {type === 'invitation_only' && 'Configuration de l\'invitation'}
          {type === 'message_only' && 'Configuration du message'}
          {type === 'invitation_message' && 'Configuration de la séquence'}
        </h2>

        {type === 'invitation_only' && (
          <>
            <InvitationSection/>
            <TemplatesSection templates={TEMPLATES_INVITATION} onApply={(body) => { setHasNote(true); setInvitationNote(body); }}/>
          </>
        )}
        {type === 'message_only' && (
          <>
            <MessageSection/>
            <TemplatesSection templates={TEMPLATES_MESSAGE} onApply={setMessage}/>
          </>
        )}
        {type === 'invitation_message' && (
          <>
            <InvitationSection label="Étape 1 — Invitation" num="1"/>
            <MessageSection withDelay/>
          </>
        )}
      </div>

      {/* Right column — live preview */}
      <div>
        <div style={{ position: 'sticky', top: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ color: 'var(--muted-foreground)', display: 'flex' }}>{Icon.eye({ size: 13 })}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aperçu temps réel</span>
          </div>
          <div style={{ background: '#F3F2EF', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
            <LinkedInPreview kind={type} invitationNote={invitationNote}
              message={message} hasNote={hasNote} prospect={prospect} delay={delay}/>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 8, textAlign: 'center' }}>
            Aperçu pour <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{prospect.firstName} {prospect.lastName}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- STEP 3 ----------
function Step3({ type, name, hasNote, invitationNote, message, delay, previewProspect, setPreviewProspect, prospect, typeLabel, typeIcon, prospectLabel, prospectCount }) {
  const delayLabel = DELAY_OPTIONS.find(d => d.id === delay)?.label || '24h après';
  const blockStyle = {
    background: 'white', border: '1px solid var(--border)',
    borderRadius: 10, padding: 16,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820, margin: '0 auto' }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 4 }}>
        Vérifiez et lancez votre campagne
      </h2>

      {/* Recap grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={blockStyle}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Récapitulatif</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-blue-tint)', color: 'var(--brand-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Icon[typeIcon]({ size: 16 })}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{typeLabel}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>Canal LinkedIn</div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--muted-foreground)' }}>Nom</span>
              <span style={{ fontWeight: 600, textAlign: 'right' }}>{name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--muted-foreground)' }}>Cible</span>
              <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prospectLabel}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--muted-foreground)' }}>Prospects</span>
              <span style={{ fontWeight: 600 }}>{prospectCount}</span>
            </div>
          </div>
        </div>

        <div style={blockStyle}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Estimation</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>~2h</span>
            <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>pour {prospectCount} {type === 'invitation_only' || type === 'invitation_message' ? 'invitations' : 'messages'}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.55, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ display: 'flex', flexShrink: 0, marginTop: 1 }}>{Icon.clock({ size: 12 })}</span>
            <span>~30–50 invitations/jour selon votre activité LinkedIn récente.</span>
          </div>
        </div>
      </div>

      {/* Flow visualization for invitation_message */}
      {type === 'invitation_message' && (
        <div style={blockStyle}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>Séquence</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlowStep icon="userPlus" label="Invitation" sub={hasNote ? 'avec note' : 'sans note'} color="var(--brand-blue)"/>
            <FlowArrow label={delayLabel}/>
            <FlowStep icon="message" label="Message" sub="si acceptée" color="var(--brand-blue)"/>
          </div>
        </div>
      )}

      {/* Final preview with prospect cycler */}
      <div style={blockStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aperçu final</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Pour :</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {MOCK_PROSPECTS.map((p, i) => (
                <button key={i} onClick={() => setPreviewProspect(i)}
                  style={{
                    padding: '4px 9px', border: `1px solid ${previewProspect === i ? 'var(--brand-blue)' : 'var(--border)'}`,
                    background: previewProspect === i ? 'var(--brand-blue-tint)' : 'white',
                    color: previewProspect === i ? 'var(--brand-blue-dark)' : 'var(--foreground)',
                    borderRadius: 6, cursor: 'pointer',
                    fontSize: 11.5, fontWeight: previewProspect === i ? 600 : 500,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: p.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{p.initials}</span>
                  {p.firstName}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: '#F3F2EF', padding: 14, borderRadius: 10 }}>
          <LinkedInPreview kind={type} invitationNote={invitationNote}
            message={message} hasNote={hasNote} prospect={prospect} delay={delay}/>
        </div>
      </div>

      {/* Compliance warning */}
      <div style={{
        padding: '12px 14px',
        background: '#FFF6E5', border: '1px solid #F0CF8C', borderRadius: 10,
        display: 'flex', alignItems: 'flex-start', gap: 10,
        fontSize: 12.5, color: '#7A4D00', lineHeight: 1.55,
      }}>
        <span style={{ flexShrink: 0, marginTop: 1, color: '#9A6700' }}>{Icon.alertTriangle({ size: 14 })}</span>
        <span><strong style={{ fontWeight: 600 }}>Limites de quota.</strong> Les quotas réels dépendent de votre compte LinkedIn et de votre activité récente. Andoxa respecte les limites pour protéger votre compte.</span>
      </div>
    </div>
  );
}

function FlowStep({ icon, label, sub, color }) {
  return (
    <div style={{
      flex: 1, padding: 12, border: `1.5px solid ${color}`,
      borderRadius: 10, background: 'var(--brand-blue-tint)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{
        width: 32, height: 32, borderRadius: 8, background: color, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{Icon[icon]({ size: 16 })}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-blue-dark)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>{sub}</div>
      </div>
    </div>
  );
}
function FlowArrow({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Délai</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ color: 'var(--muted-foreground)', display: 'flex' }}>{Icon.chevRight({ size: 16 })}</span>
    </div>
  );
}

window.CreateCampaignModal = CreateCampaignModal;
