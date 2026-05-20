// LinkedIn Campaign Creation Modal — 3-step wizard
const { useState: useStateW, useEffect: useEffectW, useRef: useRefW, useMemo: useMemoW } = React;

const MOCK_PROSPECTS = [
  { firstName: "Andréas", lastName: "BODIN", company: "Andoxa", jobTitle: "Co-fondateur & CTO", phone: "06 61 75 89 40", email: "andreas@andoxa.com", bookingLink: "andoxa.com/meet/sebastian", initials: "AB", color: "#FF6700" },
  { firstName: "Camille", lastName: "ROUSSEL", company: "Pennylane", jobTitle: "Head of Sales", phone: "06 12 34 56 78", email: "camille@pennylane.com", bookingLink: "andoxa.com/meet/sebastian", initials: "CR", color: "#0052D9" },
  { firstName: "Mathieu", lastName: "LEROY", company: "Spendesk", jobTitle: "VP Engineering", phone: "06 98 76 54 32", email: "mathieu@spendesk.com", bookingLink: "andoxa.com/meet/sebastian", initials: "ML", color: "#5B2EBF" },
];

const SELECTED_LIST = { name: "TEST WORKFLOW", count: 3 };

const VARIABLES = ['firstName', 'lastName', 'company', 'jobTitle', 'phone', 'email', 'bookingLink'];

const TEMPLATES_INVITATION = [
  { id: 't1', name: 'Approche directe', body: "Bonjour {{firstName}}, je vous suis depuis quelque temps et j'aimerais échanger sur {{company}}." },
  { id: 't2', name: 'Connexion sectorielle', body: "Bonjour {{firstName}}, nous opérons sur le même secteur — connectons-nous ?" },
  { id: 't3', name: 'Référence mutuelle', body: "Bonjour {{firstName}}, plusieurs contacts en commun chez {{company}}, ravi de me connecter." },
];
const TEMPLATES_MESSAGE = [
  { id: 'tm1', name: 'Demande de RDV courte', body: "Bonjour {{firstName}},\n\nJ'ai vu votre profil chez {{company}} et souhaiterais vous contacter au sujet de votre poste {{jobTitle}}.\n\nAuriez-vous 15 minutes cette semaine ?\n\n{{bookingLink}}\n\nCordialement" },
  { id: 'tm2', name: 'Pitch produit', body: "Bonjour {{firstName}},\n\nChez {{company}}, vos équipes commerciales gèrent-elles encore leur prospection à la main ? Andoxa automatise tout le cycle outbound (LinkedIn + WhatsApp + Tel).\n\nIntéressé par une démo ?" },
  { id: 'tm3', name: 'Suivi salon', body: "Bonjour {{firstName}}, ravi de vous avoir croisé. Comme convenu, voici mon lien de réservation : {{bookingLink}}" },
];

const DELAY_OPTIONS = [
  { id: '0',  label: 'Immédiat', warn: true },
  { id: '1',  label: '1h après' },
  { id: '6',  label: '6h après' },
  { id: '24', label: '24h après' },
  { id: '48', label: '48h après' },
  { id: '72', label: '72h après' },
  { id: '168',label: '7 jours après' },
];

function interpolate(text, p) {
  if (!text) return '';
  let out = text;
  VARIABLES.forEach(v => {
    out = out.replaceAll(`{{${v}}}`, p[v] || '');
  });
  return out;
}

// ---------- Stepper ----------
function Stepper({ step, setStep, maxStepReached }) {
  const steps = [
    { n: 1, label: 'Prospects' },
    { n: 2, label: 'Type & Nom' },
    { n: 3, label: 'Configuration' },
    { n: 4, label: 'Confirmation' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '14px 24px 14px', borderBottom: '1px solid var(--border)' }}>
      {steps.map((s, i) => {
        const isCurrent = s.n === step;
        const isDone = s.n < step;
        const canClick = s.n <= maxStepReached;
        return (
          <React.Fragment key={s.n}>
            <button
              onClick={() => canClick && setStep(s.n)}
              disabled={!canClick}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '4px 8px', border: 'none', background: 'transparent',
                cursor: canClick ? 'pointer' : 'default',
                borderRadius: 6,
              }}
              onMouseEnter={(e) => { if (canClick && !isCurrent) e.currentTarget.style.background = 'var(--neutral-50)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11.5, fontWeight: 700,
                background: isDone ? 'var(--brand-blue)' : isCurrent ? 'var(--foreground)' : 'var(--neutral-100)',
                color: isDone || isCurrent ? 'white' : 'var(--muted-foreground)',
                transition: 'all 200ms',
              }}>
                {isDone ? Icon.check({ size: 12 }) : s.n}
              </span>
              <span style={{
                fontSize: 13, fontWeight: isCurrent ? 600 : 500,
                color: isCurrent ? 'var(--foreground)' : isDone ? 'var(--foreground)' : 'var(--muted-foreground)',
                letterSpacing: '-0.005em',
              }}>{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <span style={{ flex: 1, height: 1, background: isDone ? 'var(--brand-blue)' : 'var(--border)', margin: '0 8px', transition: 'background 200ms' }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------- Type card ----------
function TypeCard({ id, title, subtitle, description, useCase, icon, recommended, selected, onClick }) {
  const [hover, setHover] = useStateW(false);
  return (
    <div
      onClick={() => onClick(id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', flex: 1, padding: 18,
        background: selected ? 'var(--brand-blue-tint)' : 'white',
        border: `1.5px solid ${selected ? 'var(--brand-blue)' : hover ? 'var(--neutral-200)' : 'var(--border)'}`,
        borderRadius: 12, cursor: 'pointer',
        transition: 'all 150ms ease',
        boxShadow: hover && !selected ? '0 4px 10px -4px rgba(0,0,0,0.08)' : 'none',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
      }}>
      {recommended && (
        <span style={{
          position: 'absolute', top: -8, right: 12,
          background: 'var(--brand-orange)', color: 'white',
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.02em',
          padding: '3px 8px', borderRadius: 9999, textTransform: 'uppercase',
        }}>Recommandé</span>
      )}
      {selected && (
        <span style={{
          position: 'absolute', top: 12, right: 12,
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--brand-blue)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.check({ size: 12 })}</span>
      )}
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: selected ? 'white' : 'var(--brand-blue-tint)',
        color: 'var(--brand-blue)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
      }}>{Icon[icon]({ size: 18 })}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em' }}>{title}</span>
        {subtitle && <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>{subtitle}</span>}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: 8 }}>{description}</div>
      <div style={{ fontSize: 11.5, color: 'var(--foreground)', opacity: 0.6, fontStyle: 'italic', lineHeight: 1.5 }}>{useCase}</div>
    </div>
  );
}

// ---------- Variable pills ----------
function VariablePills({ onInsert }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {VARIABLES.map(v => (
        <button key={v} onClick={() => onInsert(`{{${v}}}`)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-blue-tint)'; e.currentTarget.style.borderColor = 'var(--brand-blue)'; e.currentTarget.style.color = 'var(--brand-blue-dark)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--neutral-50)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--foreground)'; }}
          style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'var(--neutral-50)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '3px 8px',
            fontSize: 11.5, fontFamily: 'var(--font-mono)', cursor: 'pointer',
            color: 'var(--foreground)',
            transition: 'all 100ms',
          }}>
          {`{{${v}}}`}
        </button>
      ))}
    </div>
  );
}

// ---------- Editor with character counter ----------
function Editor({ value, onChange, max, placeholder, rows = 6, ariaLabel }) {
  const ref = useRefW(null);
  const len = value.length;
  const near = len > max * 0.9;
  const over = len > max;
  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        aria-label={ariaLabel}
        style={{
          width: '100%', padding: '10px 12px',
          border: `1px solid ${over ? 'var(--color-destructive)' : 'var(--border)'}`,
          borderRadius: 8, background: 'white',
          fontFamily: 'var(--font-sans)', fontSize: 13.5,
          lineHeight: 1.55, resize: 'vertical',
          outline: 'none',
          transition: 'border-color 120ms',
          minHeight: rows * 22,
        }}
        onFocus={(e) => { if (!over) e.target.style.borderColor = 'var(--brand-blue)'; }}
        onBlur={(e) => { if (!over) e.target.style.borderColor = 'var(--border)'; }}
      />
      <div style={{
        position: 'absolute', bottom: 8, right: 12,
        fontSize: 11, fontVariantNumeric: 'tabular-nums',
        color: over ? 'var(--color-destructive)' : near ? '#9A6700' : 'var(--muted-foreground)',
        fontWeight: 500, background: 'rgba(255,255,255,0.85)', padding: '0 4px', borderRadius: 4,
        pointerEvents: 'none',
      }}>
        {len}/{max}
      </div>
    </div>
  );
}

function insertAtCursor(textareaRef, value, setValue, snippet) {
  const ta = textareaRef.current;
  if (!ta) { setValue(value + snippet); return; }
  const start = ta.selectionStart, end = ta.selectionEnd;
  const next = value.slice(0, start) + snippet + value.slice(end);
  setValue(next);
  setTimeout(() => {
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + snippet.length;
  }, 0);
}

// ---------- Toggle / Switch ----------
function Switch({ checked, onChange, label }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <span style={{
        position: 'relative', width: 32, height: 18, borderRadius: 9999,
        background: checked ? 'var(--brand-blue)' : 'var(--neutral-200)',
        transition: 'background 150ms',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 16 : 2,
          width: 14, height: 14, borderRadius: '50%', background: 'white',
          transition: 'left 150ms',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}/>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: 'none' }}/>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
    </label>
  );
}

// ---------- Templates section ----------
function TemplatesSection({ templates, onApply }) {
  const [open, setOpen] = useStateW(false);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', background: 'var(--neutral-50)', border: 'none', cursor: 'pointer',
        fontSize: 12.5, fontWeight: 600, color: 'var(--foreground)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {Icon.copy({ size: 12 })} Templates ({templates.length})
        </span>
        <span style={{ display: 'flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>{Icon.chevDown({ size: 12 })}</span>
      </button>
      {open && (
        <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {templates.map(t => (
            <button key={t.id} onClick={() => onApply(t.body)} style={{
              textAlign: 'left', padding: '8px 10px', borderRadius: 6,
              border: 'none', background: 'transparent', cursor: 'pointer',
              transition: 'background 100ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-50)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.body.slice(0, 90)}...</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- LinkedIn-like preview ----------
function LinkedInPreview({ kind, invitationNote, message, hasNote, prospect, delay }) {
  const noteText = interpolate(invitationNote, prospect);
  const msgText = interpolate(message, prospect);

  const ProfileHead = () => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderBottom: '1px solid #E0E0E0' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: prospect.color, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 700, flexShrink: 0,
      }}>{prospect.initials}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#000' }}>{prospect.firstName} {prospect.lastName}</div>
        <div style={{ fontSize: 11.5, color: '#666', marginTop: 1, lineHeight: 1.4 }}>{prospect.jobTitle}</div>
        <div style={{ fontSize: 11.5, color: '#666' }}>{prospect.company}</div>
      </div>
      <span style={{ color: '#0A66C2', display: 'flex', flexShrink: 0 }}>{Icon.linkedin({ size: 18 })}</span>
    </div>
  );

  const InvitationCard = () => (
    <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: 8, overflow: 'hidden' }}>
      <ProfileHead/>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 8 }}>
          Demande de connexion
        </div>
        {hasNote ? (
          <div style={{ fontSize: 13, color: '#000', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {noteText || <span style={{ color: '#999', fontStyle: 'italic' }}>Votre note apparaîtra ici...</span>}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: '#666', fontStyle: 'italic' }}>
            (Demande de connexion sans note)
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#666', padding: '5px 12px', border: '1px solid #ccc', borderRadius: 9999 }}>Ignorer</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'white', background: '#0A66C2', padding: '5px 12px', borderRadius: 9999 }}>Accepter</span>
        </div>
      </div>
    </div>
  );

  const MessageCard = () => (
    <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: 8, overflow: 'hidden' }}>
      <ProfileHead/>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 8 }}>
          Message
        </div>
        <div style={{
          background: '#F3F2EF', borderRadius: 8, padding: '8px 12px',
          fontSize: 13, color: '#000', lineHeight: 1.55, whiteSpace: 'pre-wrap',
        }}>
          {msgText || <span style={{ color: '#999', fontStyle: 'italic' }}>Votre message apparaîtra ici...</span>}
        </div>
      </div>
    </div>
  );

  const Delay = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 600, color: 'var(--brand-blue-dark)',
        background: 'var(--brand-blue-tint)', padding: '3px 9px', borderRadius: 9999,
      }}>
        <span style={{ display: 'flex' }}>{Icon.calendar({ size: 11 })}</span>
        {delay === '0' ? 'Immédiat' : `Délai ${DELAY_OPTIONS.find(d => d.id === delay)?.label || ''}`}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {kind === 'invitation_only' && <InvitationCard/>}
      {kind === 'message_only' && <MessageCard/>}
      {kind === 'invitation_message' && (
        <>
          <InvitationCard/>
          <Delay/>
          <MessageCard/>
        </>
      )}
    </div>
  );
}

window.LinkedInPreview = LinkedInPreview;
window.MOCK_PROSPECTS = MOCK_PROSPECTS;
window.SELECTED_LIST = SELECTED_LIST;
window.TEMPLATES_INVITATION = TEMPLATES_INVITATION;
window.TEMPLATES_MESSAGE = TEMPLATES_MESSAGE;
window.DELAY_OPTIONS = DELAY_OPTIONS;
window.interpolate = interpolate;
window.Stepper = Stepper;
window.TypeCard = TypeCard;
window.VariablePills = VariablePills;
window.Editor = Editor;
window.insertAtCursor = insertAtCursor;
window.Switch = Switch;
window.TemplatesSection = TemplatesSection;
