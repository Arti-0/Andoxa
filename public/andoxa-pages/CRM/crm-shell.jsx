// Shared CRM components — Sidebar, TopBar, Avatar, Pills, Icons
const { useState: useStateShell } = React;
const useState = useStateShell;

const Icon = ({ name, size = 16, stroke = 2, style }) => {
  const svgs = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    megaphone: <><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></>,
    whatsapp: <><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1c0 4 5 6 6 4l-1-1c-1 .5-2-1-2-1l1-1"/></>,
    message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    chevronUp: <polyline points="18 15 12 9 6 15"/>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    moreVertical: <><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></>,
    externalLink: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    columns: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    building: <><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="13" y1="6" x2="13.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="13" y1="10" x2="13.01" y2="10"/></>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    sparkles: <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
    sendCheck: <><polyline points="20 6 9 17 4 12"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    play: <polygon points="5 3 19 12 5 21 5 3"/>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    sort: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></>,
    mousePointer: <><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></>,
    checkCircle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {svgs[name] || null}
    </svg>
  );
};

function Avatar({ name, size = 32, photo }) {
  const bg = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: photo ? '#e5e7eb' : bg, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.36), fontWeight: 600, letterSpacing: '0.02em',
      backgroundImage: photo ? `url(${photo})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center',
      userSelect: 'none',
    }}>
      {!photo && initials(name)}
    </div>
  );
}

function StatusPill({ status, size = 'sm' }) {
  const s = STATUSES[status];
  if (!s) return null;
  const padY = size === 'lg' ? 5 : 3;
  const padX = size === 'lg' ? 12 : 9;
  const fs = size === 'lg' ? 13 : 11.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: s.bg, color: s.fg,
      padding: `${padY}px ${padX}px`, borderRadius: 9999,
      fontSize: fs, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }}/>
      {s.label}
    </span>
  );
}

function SourcePill({ source, size = 'sm', list, onClick, importedAt }) {
  const s = SOURCES[source];
  if (!s) return null;
  const [hover, setHover] = useState(false);
  const tooltip = list ? `Importé${importedAt ? ' le ' + importedAt.split(' ').slice(0,3).join(' ') : ''} dans la liste « ${list} »` : null;
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>
      <span
        onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(source, list); } }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#f8fafc', color: '#334155',
          padding: size === 'lg' ? '4px 9px' : '2px 7px',
          borderRadius: 6,
          fontSize: 11, fontWeight: 500, lineHeight: 1.4, whiteSpace: 'nowrap',
          cursor: onClick ? 'pointer' : 'default',
          border: '1px solid #e2e8f0',
          borderColor: hover && onClick ? '#cbd5e1' : '#e2e8f0',
        }}>
        <Icon name={s.icon || 'message'} size={10} style={{ color: s.color }}/>
        {size === 'lg' ? s.label : s.short}
      </span>
      {hover && tooltip && (
        <span style={{
          position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 30,
          background: '#0f172a', color: 'white', fontSize: 11, fontWeight: 400,
          padding: '6px 9px', borderRadius: 6, whiteSpace: 'nowrap',
          boxShadow: '0 6px 16px rgb(15 23 42 / 0.18)',
          pointerEvents: 'none',
        }}>{tooltip}</span>
      )}
    </span>
  );
}

function ChannelDot({ kind, size = 18 }) {
  const cfg = SOURCES[kind] || { color: '#94a3b8', tint: '#f1f5f9' };
  const letter = kind === 'whatsapp' ? 'W' : (kind === 'linkedin' || kind === 'linkedin_ext' || kind === 'linkedin_manual') ? 'in' : kind === 'booking' ? 'B' : 'M';
  return (
    <span title={cfg.label} style={{
      width: size, height: size, borderRadius: 4, background: cfg.tint, color: cfg.color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, letterSpacing: '-0.01em',
    }}>{letter}</span>
  );
}

const NAV = [
  { id: 'dashboard',  label: 'Tableau de bord', icon: 'grid' },
  { id: 'crm',        label: 'CRM',             icon: 'users' },
  { id: 'campagnes',  label: 'Campagnes & Appels', icon: 'megaphone' },
  { id: 'wa',         label: 'WhatsApp',        icon: 'whatsapp' },
  { id: 'wa2',        label: 'WhatsApp v2',     icon: 'whatsapp' },
  { id: 'msg',        label: 'Messagerie',      icon: 'message' },
  { id: 'cal',        label: 'Calendrier',      icon: 'calendar' },
];

function Sidebar({ active = 'crm', collapsed = false, extensionMissing = false }) {
  // Delegates to the canonical AndoxaSidebar. The CRM page scrolls with the
  // document, so we wrap the canonical sidebar in a sticky/full-height shell
  // to preserve the original sidebar's scroll behaviour. `collapsed` /
  // `extensionMissing` are accepted for API back-compat but no longer used.
  return (
    <div style={{ position: 'sticky', top: 0, height: '100vh', alignSelf: 'flex-start', flexShrink: 0 }}>
      <AndoxaSidebar active={active} logoBase="assets/" />
    </div>
  );
}

function TopBar({ title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 56, borderBottom: '1px solid #e5e7eb', background: 'white',
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#f1f5f9', borderRadius: 8, padding: '7px 12px', width: 280,
          color: '#94a3b8', fontSize: 13,
        }}>
          <Icon name="search" size={14}/>
          <span>Rechercher un prospect…</span>
        </div>
        <button style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
          <Icon name="bell" size={15}/>
        </button>
      </div>
    </div>
  );
}

// Generic UI primitives
function Button({ variant = 'primary', icon, children, onClick, size = 'md', style, ...rest }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: size === 'sm' ? '6px 10px' : '8px 14px',
    borderRadius: 8, fontSize: size === 'sm' ? 12.5 : 13.5, fontWeight: 500,
    cursor: 'pointer', border: '1px solid transparent', fontFamily: 'inherit',
    transition: 'background 120ms, border 120ms, transform 80ms', whiteSpace: 'nowrap',
  };
  const variants = {
    primary:   { background: '#0052D9', color: 'white' },
    outline:   { background: 'white', color: '#0052D9', border: '1px solid #cfdcf4' },
    ghost:     { background: 'transparent', color: '#0052D9' },
    neutral:   { background: 'white', color: '#334155', border: '1px solid #e2e8f0' },
    danger:    { background: 'white', color: '#b91c1c', border: '1px solid #fecaca' },
  };
  return (
    <button onClick={onClick} {...rest} style={{ ...base, ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={14}/>}
      {children}
    </button>
  );
}

function Card({ children, style, padding = 20 }) {
  return (
    <div style={{
      background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
      padding, ...style,
    }}>
      {children}
    </div>
  );
}

Object.assign(window, { Icon, Avatar, StatusPill, SourcePill, ChannelDot, Sidebar, TopBar, Button, Card });
