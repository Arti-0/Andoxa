// Primitives — small reusable bits for the Campagnes page

// ---------- Icons (Lucide-style) ----------
const Icon = {
  search: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  plus: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  bell: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>,
  linkedin: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.3 6.5a1.78 1.78 0 0 1-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z" /></svg>,
  whatsapp: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>,
  phone: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  filter: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
  chevDown: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  chevUp: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>,
  chevRight: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>,
  more: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>,
  play: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
  pause: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>,
  copy: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "0px" }}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  trash: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>,
  eye: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  download: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  arrowUp: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
  arrowDown: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  calendar: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  check: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  x: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  info: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  sliders: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>,
  rotate: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>,
  message: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  userPlus: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
  target: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  inbox: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>,
  zap: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  workflow: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="9" y="15" width="6" height="6" rx="1" /><path d="M6 9v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" /></svg>,
  alertTriangle: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  sparkles: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" /><path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75z" /></svg>,
  external: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  users: (p = {}) => <svg {...p} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  clock: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  arrowLeft: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  arrowRight: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  edit: (p = {}) => <svg {...p} width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
};

// ---------- Status definitions ----------
const STATUS_META = {
  running: { label: 'En cours', bg: '#E8F4EC', fg: '#0E7A3A', dot: '#16A34A' },
  paused: { label: 'En pause', bg: '#FFF6E5', fg: '#9A6700', dot: '#D89B0A' },
  completed: { label: 'Terminée', bg: '#EDEEF0', fg: '#3F4350', dot: '#6B7280' },
  failed: { label: 'Échouée', bg: '#FDECEC', fg: '#A8221C', dot: '#DC2626' },
  draft: { label: 'Brouillon', bg: '#F1F2F4', fg: '#5B6072', dot: '#94A0AE' },
  ready: { label: 'Prête', bg: '#E8F0FD', fg: '#003EA3', dot: '#0052D9' }
};

const CHANNEL_META = {
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: 'linkedin' },
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: 'whatsapp' },
  phone: { label: 'Téléphone', color: '#0052D9', icon: 'phone' }
};

const TYPE_META = {
  invitation: { label: 'Invitation', bg: '#E8F0FD', fg: '#003EA3' },
  message: { label: 'Message', bg: '#EDF6FF', fg: '#0A66C2' },
  invitation_message: { label: 'Invitation + Message', bg: '#F0EAFE', fg: '#5B2EBF' },
  whatsapp_message: { label: 'Message WhatsApp', bg: '#E6F8EE', fg: '#0E7A3A' }
};

// ---------- Status badge ----------
function StatusBadge({ status, size = 'md' }) {
  const m = STATUS_META[status];
  if (!m) return null;
  const pad = size === 'sm' ? '2px 8px' : '3px 10px';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: pad, borderRadius: 9999, background: m.bg, color: m.fg,
      fontSize: 12, fontWeight: 600, letterSpacing: '-0.005em', whiteSpace: 'nowrap'
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: m.dot,
        boxShadow: status === 'running' ? `0 0 0 3px ${m.dot}26` : 'none',
        animation: status === 'running' ? 'pulse 1.6s ease-in-out infinite' : 'none'
      }} />
      {m.label}
    </span>);

}

// ---------- Type badge ----------
function TypeBadge({ type }) {
  const m = TYPE_META[type];
  if (!m) return null;
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 6,
      background: m.bg, color: m.fg, fontSize: 11, fontWeight: 600,
      letterSpacing: '-0.005em', whiteSpace: 'nowrap'
    }}>{m.label}</span>);

}

// ---------- Channel pill ----------
function ChannelPill({ channel }) {
  const m = CHANNEL_META[channel];
  if (!m) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--foreground)' }}>
      <span style={{ color: m.color, display: 'flex' }}>{Icon[m.icon]({ size: 14 })}</span>
      {m.label}
    </span>);

}

// ---------- Avatar ----------
function Avatar({ creator, size = 22 }) {
  if (!creator) return null;
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: creator.color, color: 'white',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, flexShrink: 0
    }}>{creator.initials}</span>);

}

// ---------- Sparkline ----------
function Sparkline({ data, color = '#0052D9', width = 90, height = 28 }) {
  const max = Math.max(...data),min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = i / (data.length - 1) * width;
    const y = height - (v - min) / range * (height - 4) - 2;
    return [x, y];
  });
  const line = 'M' + pts.map((p) => p.join(',')).join(' L');
  const area = `M0,${height} L${pts[0][0]},${height} ` + pts.map((p) => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length - 1][0]},${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.4} fill={color} />
    </svg>);

}

// ---------- Progress bar ----------
function ProgressBar({ value, max, color = '#0052D9', height = 6 }) {
  const pct = max ? Math.min(100, value / max * 100) : 0;
  return (
    <div style={{ position: 'relative', height, background: 'var(--neutral-100)', borderRadius: 9999, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, width: `${pct}%`, background: color,
        borderRadius: 9999, transition: 'width 300ms ease'
      }} />
    </div>);

}

// ---------- Buttons ----------
function Button({ variant = 'default', size = 'md', children, onClick, disabled, style, leftIcon, rightIcon, fullWidth }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-sans)', fontWeight: 500,
    border: '1px solid transparent', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 120ms ease', whiteSpace: 'nowrap', userSelect: 'none',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto'
  };
  const sizes = {
    sm: { fontSize: 12.5, padding: '5px 10px', height: 30 },
    md: { fontSize: 13.5, padding: '7px 14px', height: 36 },
    lg: { fontSize: 14, padding: '9px 18px', height: 40 }
  };
  const variants = {
    primary: { background: '#0052D9', color: 'white' },
    secondary: { background: 'white', color: 'var(--foreground)', borderColor: 'var(--border)' },
    ghost: { background: 'transparent', color: 'var(--foreground)' },
    destructive: { background: 'white', color: 'var(--color-destructive)', borderColor: 'var(--border)' },
    accent: { background: '#FF6700', color: 'white' },
    default: { background: 'var(--foreground)', color: 'var(--background)' }
  };
  const hovers = {
    primary: { background: '#003EA3' },
    secondary: { background: 'var(--neutral-50)' },
    ghost: { background: 'var(--neutral-100)' },
    destructive: { background: '#FDECEC', borderColor: '#DC2626', color: '#DC2626' },
    accent: { background: '#CC5200' },
    default: { background: 'var(--neutral-800)' }
  };
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={disabled ? null : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...sizes[size], ...variants[variant], ...(hover && !disabled ? hovers[variant] : {}), ...style }}>
      
      {leftIcon && <span style={{ display: 'flex' }}>{leftIcon}</span>}
      {children}
      {rightIcon && <span style={{ display: 'flex' }}>{rightIcon}</span>}
    </button>);

}

// ---------- Checkbox ----------
function Checkbox({ checked, indeterminate, onChange, size = 16 }) {
  return (
    <span
      onClick={(e) => {e.stopPropagation();onChange && onChange(!checked);}}
      style={{
        width: size, height: size, borderRadius: 4,
        border: `1.5px solid ${checked || indeterminate ? '#0052D9' : 'var(--border)'}`,
        background: checked || indeterminate ? '#0052D9' : 'white',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0, transition: 'all 100ms',
        color: 'white'
      }}>
      
      {checked && Icon.check({ size: size - 6 })}
      {indeterminate && !checked &&
      <span style={{ width: size - 7, height: 2, background: 'white', borderRadius: 1 }} />
      }
    </span>);

}

// ---------- Date format ----------
function formatRelativeDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date('2026-05-06T12:00:00');
  const diffMs = now - d;
  const diffH = diffMs / (1000 * 60 * 60);
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return 'à l\'instant';
  if (diffH < 24) return `il y a ${Math.floor(diffH)}h`;
  if (diffD === 1) return 'hier';
  if (diffD < 7) return `il y a ${diffD}j`;
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
function formatLongDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const days = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
}

// ---------- Toast manager (simple) ----------
const ToastContext = React.createContext({ push: () => {} });
function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, ...toast }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 200,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none'
      }}>
        {toasts.map((t) =>
        <div key={t.id} style={{
          background: 'var(--neutral-950)', color: 'white',
          padding: '10px 14px', borderRadius: 8, fontSize: 13.5,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,.18)',
          minWidth: 240, maxWidth: 380,
          display: 'flex', alignItems: 'flex-start', gap: 10,
          animation: 'toastIn 200ms ease'
        }}>
            <span style={{ color: t.kind === 'destructive' ? '#FCA5A5' : '#86EFAC', marginTop: 2 }}>
              {t.kind === 'destructive' ? Icon.x({ size: 14 }) : Icon.check({ size: 14 })}
            </span>
            <div style={{ flex: 1 }}>
              <div>{t.message}</div>
              {t.sub && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{t.sub}</div>}
            </div>
          </div>
        )}
      </div>
    </ToastContext.Provider>);

}

window.Icon = Icon;
window.STATUS_META = STATUS_META;
window.CHANNEL_META = CHANNEL_META;
window.TYPE_META = TYPE_META;
window.StatusBadge = StatusBadge;
window.TypeBadge = TypeBadge;
window.ChannelPill = ChannelPill;
window.Avatar = Avatar;
window.Sparkline = Sparkline;
window.ProgressBar = ProgressBar;
window.Button = Button;
window.Checkbox = Checkbox;
window.formatRelativeDate = formatRelativeDate;
window.formatLongDate = formatLongDate;
window.ToastContext = ToastContext;
window.ToastProvider = ToastProvider;