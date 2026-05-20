// Script editor modal — user writes their own script. No AI generation.

function ScriptEditorModal({ open, onClose, onSave, initialValue, prospects, currentProspectIdx }) {
  const [text, setText] = React.useState(initialValue || '');
  const [previewIdx, setPreviewIdx] = React.useState(currentProspectIdx);
  const taRef = React.useRef(null);

  React.useEffect(() => { if (open) { setText(initialValue || ''); setPreviewIdx(currentProspectIdx); } }, [open]);

  if (!open) return null;

  const insertVar = (v) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const token = `{{${v}}}`;
    const next = text.slice(0, start) + token + text.slice(end);
    setText(next);
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + token.length; }, 0);
  };

  const renderHighlighted = (t) => {
    const parts = t.split(/(\{\{[a-zA-Z]+\}\})/g);
    return parts.map((p, i) => /\{\{[a-zA-Z]+\}\}/.test(p)
      ? <span key={i} style={{ background: '#FFF0E5', color: '#CC5200', padding: '1px 3px', borderRadius: 3, fontWeight: 500 }}>{p}</span>
      : <span key={i}>{p}</span>);
  };

  const previewProspect = prospects[previewIdx] || prospects[0];
  const rendered = interpolateScript(text, previewProspect);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 150ms ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'white', borderRadius: 14,
        width: 'min(960px, 94vw)', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        animation: 'modalIn 200ms ease', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' }}>Script de session</h2>
            <p style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 2 }}>
              Ce script sera affiché pour tous les prospects de cette session. Utilisez des variables pour personnaliser automatiquement.
            </p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
            {Icon.x({ size: 14 })}
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Editor */}
          <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', minHeight: 0 }}>
            <div style={{ padding: '14px 18px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.04em', marginBottom: 8 }}>
                Variables disponibles
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {SCRIPT_VARIABLES.map(v => (
                  <button key={v} onClick={() => insertVar(v)} style={{
                    padding: '4px 9px', borderRadius: 9999,
                    border: '1px solid var(--border)', background: '#FFF0E5',
                    color: '#CC5200', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                  }}>{`{{${v}}}`}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Bonjour {{firstName}}, c'est [votre prénom] d'Andoxa.\n\nJe vous appelle car vous êtes {{jobTitle}} chez {{company}}. On aide des entreprises comme la vôtre à [votre value prop].\n\nAuriez-vous 15 min cette semaine pour échanger ?`}
                style={{
                  flex: 1, minHeight: 320, resize: 'none',
                  padding: '12px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--neutral-50)',
                  fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--font-sans)',
                  color: 'var(--foreground)', outline: 'none',
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textAlign: 'right', marginTop: 6 }}>
                {text.length} caractères
              </div>
            </div>
          </div>
          {/* Preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--neutral-50)' }}>
            <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', background: 'white' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.04em', marginBottom: 6 }}>
                Aperçu pour
              </div>
              <select value={previewIdx} onChange={(e) => setPreviewIdx(Number(e.target.value))} style={{
                width: '100%', padding: '7px 10px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'white',
                fontSize: 12.5, fontFamily: 'var(--font-sans)', color: 'var(--foreground)', cursor: 'pointer',
              }}>
                {prospects.map((p, i) => <option key={p.id} value={i}>{i+1}. {p.firstName} {p.lastName} — {p.company}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, padding: 18, overflow: 'auto' }}>
              <div style={{
                background: 'white', borderRadius: 8, border: '1px solid var(--border)',
                padding: '14px 16px',
                fontSize: 13.5, lineHeight: 1.65, color: 'var(--foreground)',
                whiteSpace: 'pre-wrap', minHeight: 200,
              }}>{rendered || <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>L'aperçu apparaîtra ici…</span>}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Annuler</button>
          <button onClick={() => onSave(text)} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: '#0052D9', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Booking modal ----------
function BookingModal({ open, onClose, onConfirm, prospect }) {
  const [email, setEmail] = React.useState('');
  const [date, setDate] = React.useState('mardi 12 mai');
  const [time, setTime] = React.useState('14:30');
  const [duration, setDuration] = React.useState(20);
  const [title, setTitle] = React.useState('');
  React.useEffect(() => { if (open) { setEmail(prospect.email || ''); setTitle(`Andoxa × ${prospect.company} — Découverte`); setDate('mardi 12 mai'); setTime('14:30'); } }, [open, prospect]);
  if (!open) return null;

  const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
  const days = ['lundi 11 mai', 'mardi 12 mai', 'mercredi 13 mai', 'jeudi 14 mai', 'vendredi 15 mai'];
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 150ms ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, width: 'min(620px, 94vw)', maxHeight: '92vh', overflow: 'auto', animation: 'modalIn 200ms ease' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' }}>Réserver un RDV</h2>
            <p style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 2 }}>
              Avec {prospect.firstName} {prospect.lastName} — {prospect.company}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
            {Icon.x({ size: 14 })}
          </button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email — top, always editable */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>Email du prospect</label>
              {!prospect.email && <span style={{ fontSize: 11, color: '#D97706', fontWeight: 500 }}>À renseigner</span>}
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex : prenom.nom@entreprise.com"
              autoFocus={!prospect.email}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 7,
                border: `1px solid ${email && !emailValid ? '#DC2626' : 'var(--border)'}`,
                background: 'white', fontSize: 13.5, fontFamily: 'var(--font-sans)',
                color: 'var(--foreground)', outline: 'none',
              }}
            />
            {email && !emailValid && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>Format d'email invalide</div>}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6, display: 'block' }}>Titre</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'white', fontSize: 13.5, fontFamily: 'var(--font-sans)', color: 'var(--foreground)', outline: 'none' }}/>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6, display: 'block' }}>Jour</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {days.map(d => {
                const active = d === date;
                return <button key={d} onClick={() => setDate(d)} style={{ padding: '6px 11px', borderRadius: 7, border: `1px solid ${active ? '#0052D9' : 'var(--border)'}`, background: active ? 'var(--brand-blue-tint)' : 'white', color: active ? '#0052D9' : 'var(--foreground)', fontSize: 12.5, fontWeight: active ? 600 : 500, cursor: 'pointer' }}>{d}</button>;
              })}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6, display: 'block' }}>Créneau</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
              {slots.map(s => {
                const active = s === time;
                return <button key={s} onClick={() => setTime(s)} style={{ padding: '7px 0', borderRadius: 6, border: `1px solid ${active ? '#0052D9' : 'var(--border)'}`, background: active ? '#0052D9' : 'white', color: active ? 'white' : 'var(--foreground)', fontSize: 12.5, fontWeight: active ? 600 : 500, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>{s}</button>;
              })}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6, display: 'block' }}>Durée</label>
            <div style={{ display: 'flex', gap: 5 }}>
              {[15, 20, 30, 45, 60].map(d => {
                const active = d === duration;
                return <button key={d} onClick={() => setDuration(d)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${active ? '#0052D9' : 'var(--border)'}`, background: active ? 'var(--brand-blue-tint)' : 'white', color: active ? '#0052D9' : 'var(--foreground)', fontSize: 12.5, fontWeight: active ? 600 : 500, cursor: 'pointer' }}>{d} min</button>;
              })}
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Annuler</button>
          <button onClick={() => emailValid && onConfirm({ date, time, duration, email, title })} disabled={!emailValid} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: emailValid ? '#5B2EBF' : 'var(--neutral-200)', color: 'white', fontSize: 13, fontWeight: 600, cursor: emailValid ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {Icon.check({ size: 14 })} Confirmer le RDV
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Callback popover (À rappeler) ----------
function CallbackPopover({ open, onClose, onPick }) {
  if (!open) return null;
  const opts = [
    { id: 'tomorrow', label: 'Demain', sub: 'à la même heure' },
    { id: 'next_week', label: 'Semaine prochaine', sub: 'lundi matin' },
    { id: 'in_2_weeks', label: 'Dans 2 semaines', sub: '' },
    { id: 'custom', label: 'Date personnalisée…', sub: 'Choisir' },
  ];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 150ms ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, width: 'min(380px, 92vw)', overflow: 'hidden', animation: 'modalIn 200ms ease' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 600 }}>Quand rappeler ?</h3>
        </div>
        <div style={{ padding: 8 }}>
          {opts.map(o => (
            <button key={o.id} onClick={() => onPick(o)} style={{
              width: '100%', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 7, border: 'none',
              background: 'transparent', cursor: 'pointer', fontSize: 13,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-50)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span><span style={{ fontWeight: 500 }}>{o.label}</span>{o.sub && <span style={{ color: 'var(--muted-foreground)', marginLeft: 6, fontSize: 12 }}>{o.sub}</span>}</span>
              {Icon.chevRight({ size: 13 })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Shortcuts modal ----------
function ShortcutsModal({ open, onClose }) {
  if (!open) return null;
  const groups = [
    { title: 'Navigation', items: [
      { keys: ['Espace'], action: 'Passer au suivant' },
      { keys: ['→'], action: 'Prospect suivant' },
      { keys: ['←'], action: 'Prospect précédent' },
    ]},
    { title: 'Qualification', items: [
      { keys: ['R'], action: 'RDV pris (ouvre le modal)' },
      { keys: ['A'], action: 'À rappeler' },
      { keys: ['P'], action: 'Pas de réponse' },
      { keys: ['M'], action: 'Mauvais numéro' },
      { keys: ['F'], action: 'Refus' },
    ]},
    { title: 'Actions', items: [
      { keys: ['C'], action: 'Copier le numéro de téléphone' },
      { keys: ['L'], action: 'Ouvrir le profil LinkedIn' },
      { keys: ['N'], action: 'Focus sur les notes' },
      { keys: ['/'], action: 'Recherche dans la file' },
      { keys: ['?'], action: 'Afficher cette fenêtre' },
      { keys: ['Esc'], action: 'Fermer' },
    ]},
  ];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 150ms ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, width: 'min(520px, 92vw)', maxHeight: '85vh', overflow: 'auto', animation: 'modalIn 200ms ease' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Raccourcis clavier</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>{Icon.x({ size: 13 })}</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map((g, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.04em', marginBottom: 6 }}>{g.title}</div>
              {g.items.map((it, j) => (
                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ fontSize: 13 }}>{it.action}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {it.keys.map((k, ki) => (
                      <kbd key={ki} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'var(--neutral-100)', border: '1px solid var(--border)', minWidth: 20, textAlign: 'center' }}>{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Recap modal ----------
function RecapModal({ open, onClose, onResume, statuses, prospects, durationSec }) {
  if (!open) return null;
  const counts = { rdv: 0, callback: 0, noanswer: 0, wrong: 0, refused: 0 };
  Object.values(statuses).forEach(s => { counts[s.id] = (counts[s.id] || 0) + 1; });
  const total = Object.keys(statuses).length;
  const mm = Math.floor(durationSec / 60);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 150ms ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, width: 'min(560px, 94vw)', overflow: 'auto', animation: 'modalIn 200ms ease' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>Récapitulatif de session</h2>
          <p style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 3 }}>{SESSION_META.campaign} · {mm} min</p>
        </div>
        <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <Stat label="Appels traités" value={`${total} / ${prospects.length}`}/>
          <Stat label="RDV pris" value={counts.rdv} accent="#5B2EBF"/>
          <Stat label="À rappeler" value={counts.callback}/>
          <Stat label="Pas de réponse" value={counts.noanswer}/>
          <Stat label="Mauvais numéro" value={counts.wrong}/>
          <Stat label="Refus" value={counts.refused}/>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onResume} style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Continuer</button>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: 'var(--foreground)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Terminer la session</button>
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value, accent }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: 'var(--neutral-50)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: accent || 'var(--foreground)' }}>{value}</div>
    </div>
  );
}

window.ScriptEditorModal = ScriptEditorModal;
window.BookingModal = BookingModal;
window.CallbackPopover = CallbackPopover;
window.ShortcutsModal = ShortcutsModal;
window.RecapModal = RecapModal;
