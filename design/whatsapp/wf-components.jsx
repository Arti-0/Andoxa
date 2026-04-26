// Andoxa — Workflow Canvas Components
const { useState: useWF, useRef: useWFRef, useEffect: useWFEff } = React;

/* ==================== SVG ICON HELPERS ==================== */
const Ic = ({ d, fill, size = 14, color = 'currentColor', extra }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={fill ? color : 'none'} stroke={fill ? 'none' : color}
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }} {...extra}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const WFIco = {
  lightning: (s, c) => <Ic size={s} color={c} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill />,
  condition: (s, c) => <Ic size={s} color={c} d={<><path d="M12 2l10 10-10 10L2 12z" /></>} />,
  whatsapp: (s, c) => <Ic size={s} color={c} fill d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.418A9.954 9.954 0 0012 22c5.522 0 10-4.478 10-10S17.523 2 12 2z" />,
  clock: (s, c) => <Ic size={s} color={c} d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 4v6l4 2" />,
  database: (s, c) => <Ic size={s} color={c} d={<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>} />,
  bell: (s, c) => <Ic size={s} color={c} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />,
  check: (s, c) => <Ic size={s} color={c} d="M9 11l3 3L22 4M21 12a9 9 0 01-9 9 9 9 0 010-18 9 9 0 018.83 7" />,
  linkedin: (s, c) => <Ic size={s} color={c} d={<><rect x="2" y="2" width="20" height="20" rx="2" /><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></>} />,
  sparkles: (s, c) => <Ic size={s} color={c} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />,
  stop: (s, c) => <Ic size={s} color={c} fill d={<><circle cx="12" cy="12" r="10" /><rect x="8" y="8" width="8" height="8" fill="white" /></>} />,
  plus: (s, c) => <Ic size={s} color={c} d="M12 5v14M5 12h14" />,
  zoom_in: (s, c) => <Ic size={s} color={c} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0zM11 8v6M8 11h6" />,
  zoom_out: (s, c) => <Ic size={s} color={c} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0zM8 11h6" />,
  play: (s, c) => <Ic size={s} color={c} d="M5 3l14 9-14 9V3z" />,
  save: (s, c) => <Ic size={s} color={c} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8" />,
  zap: (s, c) => <Ic size={s} color={c} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  x: (s, c) => <Ic size={s} color={c} d="M18 6L6 18M6 6l12 12" />,
  chevron_down: (s, c) => <Ic size={s} color={c} d="M6 9l6 6 6-6" />,
  chevron_right: (s, c) => <Ic size={s} color={c} d="M9 18l6-6-6-6" />,
  drag: (s, c) => <Ic size={s} color={c} d="M9 3h6M9 21h6M9 12h6" />,
  copy: (s, c) => <Ic size={s} color={c} d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4a2 2 0 000 4h8a2 2 0 000-4" />,
  trash: (s, c) => <Ic size={s} color={c} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  settings2: (s, c) => <Ic size={s} color={c} d="M12 15a3 3 0 100-6 3 3 0 000 6zm8.93-3a8.94 8.94 0 01-.07 1.08l2.35 1.84a.5.5 0 01.12.64l-2.22 3.84a.5.5 0 01-.61.22l-2.77-1.11a9 9 0 01-1.87 1.08l-.42 2.95a.5.5 0 01-.5.42h-4.44a.5.5 0 01-.5-.42l-.42-2.95a9 9 0 01-1.87-1.08L4.57 20.6a.5.5 0 01-.61-.22L1.74 16.5a.5.5 0 01.12-.64l2.35-1.84A9.24 9.24 0 014.14 12c0-.35.02-.7.07-1.08L1.86 9.08a.5.5 0 01-.12-.64L3.96 4.6a.5.5 0 01.61-.22l2.77 1.11a9 9 0 011.87-1.08L9.63.46A.5.5 0 0110.13.04h4.44a.5.5 0 01.5.42l.42 2.95a9 9 0 011.87 1.08l2.77-1.11a.5.5 0 01.61.22l2.22 3.84a.5.5 0 01-.12.64L20 9.92c.05.38.07.73.07 1.08z" />,
};

/* ==================== NODE TYPE CONFIG ==================== */
const WF_NODE_TYPES = {
  trigger:      { bg: '#E8F0FD', border: '#0052D9', color: '#003EA3', label: 'Déclencheur',      iconFn: (s) => WFIco.lightning(s, '#0052D9') },
  condition:    { bg: '#FFFBEB', border: '#D97706', color: '#92400E', label: 'Condition',         iconFn: (s) => WFIco.condition(s, '#D97706') },
  whatsapp:     { bg: '#ECFDF5', border: '#10B981', color: '#065F46', label: 'WhatsApp',          iconFn: (s) => WFIco.whatsapp(s, '#10B981') },
  wait:         { bg: '#F5F3FF', border: '#7C3AED', color: '#5B21B6', label: 'Délai',            iconFn: (s) => WFIco.clock(s, '#7C3AED') },
  crm:          { bg: '#EFF6FF', border: '#0052D9', color: '#1E3A8A', label: 'CRM',              iconFn: (s) => WFIco.database(s, '#0052D9') },
  notification: { bg: '#FFF7ED', border: '#FF6700', color: '#C2410C', label: 'Notification',     iconFn: (s) => WFIco.bell(s, '#FF6700') },
  task:         { bg: '#FDF4FF', border: '#A855F7', color: '#7E22CE', label: 'Tâche',            iconFn: (s) => WFIco.check(s, '#A855F7') },
  linkedin:     { bg: '#EFF6FF', border: '#0A66C2', color: '#0A66C2', label: 'LinkedIn',         iconFn: (s) => WFIco.linkedin(s, '#0A66C2') },
  ai:           { bg: '#F0FDF4', border: '#059669', color: '#047857', label: 'IA',               iconFn: (s) => WFIco.sparkles(s, '#059669') },
  end:          { bg: '#F9FAFB', border: '#6B7280', color: '#374151', label: 'Fin',              iconFn: (s) => WFIco.stop(s, '#6B7280') },
};

/* ==================== WORKFLOW DATA ==================== */
const NODE_W = 252, NODE_H = 68, COND_W = 320;

const WORKFLOW_NODES = [
  { id: 'trigger',    type: 'trigger',      x: 394, y: 24,   w: NODE_W, h: NODE_H, label: 'Réunion réservée',              sub: 'Déclencheur automatique' },
  { id: 'cond1',      type: 'condition',    x: 360, y: 152,  w: COND_W, h: NODE_H, label: 'Consentement WhatsApp collecté ?', sub: 'Vérification RGPD' },
  { id: 'wa_confirm', type: 'whatsapp',     x: 68,  y: 296,  w: NODE_W, h: NODE_H, label: 'Envoyer confirmation WhatsApp',  sub: 'Modèle : Confirmation réunion' },
  { id: 'no_consent', type: 'notification', x: 742, y: 296,  w: NODE_W + 20, h: NODE_H, label: 'Notification interne',          sub: 'Aucun consentement WhatsApp' },
  { id: 'wait1',      type: 'wait',         x: 68,  y: 432,  w: NODE_W, h: NODE_H, label: 'Attendre',                      sub: '2h avant le début de la réunion' },
  { id: 'wa_remind',  type: 'whatsapp',     x: 68,  y: 568,  w: NODE_W, h: NODE_H, label: 'Envoyer rappel WhatsApp',       sub: 'Modèle : Rappel J-0' },
  { id: 'cond2',      type: 'condition',    x: 44,  y: 704,  w: COND_W, h: NODE_H, label: 'Réunion effectuée ?',           sub: 'Vérification de présence' },
  { id: 'wa_followup',type: 'whatsapp',     x: 20,  y: 850,  w: NODE_W, h: NODE_H, label: 'Message suivi post-réunion',    sub: 'Modèle : Post-meeting' },
  { id: 'crm_update', type: 'crm',          x: 20,  y: 986,  w: NODE_W, h: NODE_H, label: 'Mettre à jour le CRM',          sub: 'Statut → Réunion effectuée' },
  { id: 'wa_noshow',  type: 'whatsapp',     x: 330, y: 850,  w: NODE_W, h: NODE_H, label: 'Message no-show WhatsApp',      sub: 'Modèle : No-show recovery' },
  { id: 'task',       type: 'task',         x: 330, y: 986,  w: NODE_W, h: NODE_H, label: 'Créer une tâche',               sub: 'Relancer le prospect manuellement' },
];

// center(x) of each node
const nc = (id) => { const n = WORKFLOW_NODES.find(n=>n.id===id); return n.x + n.w/2; };
const nb = (id) => { const n = WORKFLOW_NODES.find(n=>n.id===id); return n.y + n.h; };
const nt = (id) => WORKFLOW_NODES.find(n=>n.id===id).y;

const WORKFLOW_EDGES = [
  { from: 'trigger',    to: 'cond1',      fromX: nc('trigger'),    fromY: nb('trigger'),    toX: nc('cond1'),      toY: nt('cond1') },
  { from: 'cond1',      to: 'wa_confirm', fromX: nc('cond1'),      fromY: nb('cond1'),      toX: nc('wa_confirm'), toY: nt('wa_confirm'),  label: 'Oui', labelSide: 'left' },
  { from: 'cond1',      to: 'no_consent', fromX: nc('cond1'),      fromY: nb('cond1'),      toX: nc('no_consent'), toY: nt('no_consent'),  label: 'Non', labelSide: 'right' },
  { from: 'wa_confirm', to: 'wait1',      fromX: nc('wa_confirm'), fromY: nb('wa_confirm'), toX: nc('wait1'),      toY: nt('wait1') },
  { from: 'wait1',      to: 'wa_remind',  fromX: nc('wait1'),      fromY: nb('wait1'),      toX: nc('wa_remind'),  toY: nt('wa_remind') },
  { from: 'wa_remind',  to: 'cond2',      fromX: nc('wa_remind'),  fromY: nb('wa_remind'),  toX: nc('cond2'),      toY: nt('cond2') },
  { from: 'cond2',      to: 'wa_followup',fromX: nc('cond2'),      fromY: nb('cond2'),      toX: nc('wa_followup'),toY: nt('wa_followup'), label: 'Oui', labelSide: 'left' },
  { from: 'cond2',      to: 'wa_noshow',  fromX: nc('cond2'),      fromY: nb('cond2'),      toX: nc('wa_noshow'),  toY: nt('wa_noshow'),   label: 'Non', labelSide: 'right' },
  { from: 'wa_followup',to: 'crm_update', fromX: nc('wa_followup'),fromY: nb('wa_followup'),toX: nc('crm_update'), toY: nt('crm_update') },
  { from: 'wa_noshow',  to: 'task',       fromX: nc('wa_noshow'),  fromY: nb('wa_noshow'),  toX: nc('task'),       toY: nt('task') },
];

/* ==================== SVG EDGES ==================== */
function SVGEdges({ selectedNode }) {
  const canvasH = 1080, canvasW = 1060;
  return (
    <svg width={canvasW} height={canvasH} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#CBD5E1" />
        </marker>
        <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#0052D9" />
        </marker>
      </defs>
      {WORKFLOW_EDGES.map((e, i) => {
        const isActive = selectedNode && (e.from === selectedNode || e.to === selectedNode);
        const midY = e.fromY + (e.toY - e.fromY) * 0.5;
        const d = `M ${e.fromX} ${e.fromY} C ${e.fromX} ${midY} ${e.toX} ${midY} ${e.toX} ${e.toY}`;
        const lx = (e.fromX + e.toX) / 2;
        const ly = (e.fromY + e.toY) / 2;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={isActive ? '#0052D9' : '#CBD5E1'} strokeWidth={isActive ? 2 : 1.5}
              strokeDasharray={e.label ? '5 3' : 'none'}
              markerEnd={`url(#${isActive ? 'arrowhead-active' : 'arrowhead'})`} />
            {e.label && (
              <g transform={`translate(${lx}, ${ly})`}>
                <rect x="-18" y="-11" width="36" height="20" rx="10"
                  fill={e.label === 'Oui' ? '#ECFDF5' : '#FFF1F2'}
                  stroke={e.label === 'Oui' ? '#10B981' : '#F43F5E'} strokeWidth="1" />
                <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="600"
                  fill={e.label === 'Oui' ? '#065F46' : '#BE123C'} fontFamily="var(--font-sans)">{e.label}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ==================== WORKFLOW NODE ==================== */
function WorkflowNode({ node, selected, onSelect }) {
  const cfg = WF_NODE_TYPES[node.type] || WF_NODE_TYPES.end;
  const [hov, setHov] = useWF(false);
  return (
    <div
      onClick={() => onSelect(node.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'absolute', left: node.x, top: node.y, width: node.w, height: node.h,
        background: 'white',
        border: `1.5px solid ${selected ? '#0052D9' : hov ? cfg.border : '#E2E8F0'}`,
        borderRadius: 12,
        boxShadow: selected ? '0 0 0 3px rgba(0,82,217,0.15), 0 4px 12px rgba(0,0,0,0.08)' : hov ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0,
        transition: 'border-color 120ms, box-shadow 120ms', overflow: 'hidden', userSelect: 'none',
      }}>
      {/* Color stripe + icon */}
      <div style={{ width: 44, height: '100%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRight: `1px solid ${cfg.border}22` }}>
        {cfg.iconFn(16)}
      </div>
      {/* Text */}
      <div style={{ flex: 1, padding: '0 12px', minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{cfg.label}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.label}</div>
        {node.sub && <div style={{ fontSize: 11, color: '#64748B', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.sub}</div>}
      </div>
      {/* Selection dot */}
      {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0052D9', marginRight: 10, flexShrink: 0 }}></div>}
    </div>
  );
}

/* ==================== ADD NODE BUTTON ==================== */
function AddNodeBtn({ x, y }) {
  const [hov, setHov] = useWF(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: 'absolute', left: x - 12, top: y, width: 24, height: 24, borderRadius: '50%', background: hov ? '#0052D9' : 'white', border: '1.5px solid #CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms', zIndex: 5 }}>
      {WFIco.plus(12, hov ? 'white' : '#94A3B8')}
    </div>
  );
}

/* ==================== CANVAS TOOLBAR ==================== */
function CanvasToolbar({ status, onSetStatus, workflowName }) {
  const [zoom, setZoom] = useWF(100);
  const statusCfg = {
    draft:  { label: 'Brouillon', bg: '#F1F5F9', color: '#475569', dot: '#94A3B8' },
    active: { label: 'Actif',     bg: '#ECFDF5', color: '#15803D', dot: '#10B981' },
    paused: { label: 'En pause',  bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
    error:  { label: 'Erreur',    bg: '#FFF1F2', color: '#BE123C', dot: '#F43F5E' },
  };
  const sc = statusCfg[status];
  return (
    <div style={{ height: 52, borderBottom: '1px solid #E2E8F0', background: 'white', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', marginRight: 8 }}>
        <span style={{ cursor: 'pointer', color: '#0052D9', fontWeight: 500 }}>Workflows</span>
        <span>/</span>
        <span style={{ color: '#0F172A', fontWeight: 600 }}>{workflowName}</span>
      </div>
      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: sc.bg, padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, color: sc.color }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }}></div>
        {sc.label}
      </div>

      <div style={{ flex: 1 }}></div>

      {/* Zoom controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '4px 8px' }}>
        <button onClick={() => setZoom(z => Math.max(50, z - 10))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', padding: '0 2px', display: 'flex' }}>{WFIco.zoom_out(14, '#64748B')}</button>
        <span style={{ fontSize: 12, color: '#64748B', minWidth: 36, textAlign: 'center', fontWeight: 500 }}>{zoom}%</span>
        <button onClick={() => setZoom(z => Math.min(150, z + 10))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', padding: '0 2px', display: 'flex' }}>{WFIco.zoom_in(14, '#64748B')}</button>
      </div>

      {/* Test */}
      <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
        {WFIco.play(13, '#374151')} Tester
      </button>
      {/* Save */}
      <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
        {WFIco.save(13, '#374151')} Enregistrer
      </button>
      {/* Activate */}
      {status !== 'active'
        ? <button onClick={() => onSetStatus('active')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 8, border: 'none', background: '#0052D9', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer' }}>
            {WFIco.zap(13, 'white')} Activer
          </button>
        : <button onClick={() => onSetStatus('paused')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 8, border: 'none', background: '#F97316', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer' }}>
            Mettre en pause
          </button>}
    </div>
  );
}

/* ==================== LEFT TEMPLATE PANEL ==================== */
const TEMPLATES = [
  { id: 't1', name: 'Séquence post-réunion WhatsApp', category: 'WhatsApp', nodes: ['trigger','whatsapp','wait','whatsapp','crm'], active: true },
  { id: 't2', name: 'LinkedIn → Message de bienvenue', category: 'LinkedIn', nodes: ['trigger','wait','linkedin','condition','linkedin'], active: false },
  { id: 't3', name: 'Récupération no-show', category: 'WhatsApp', nodes: ['trigger','whatsapp','wait','task'], active: false },
  { id: 't4', name: 'Suivi post-proposition', category: 'CRM', nodes: ['trigger','wait','whatsapp','condition','crm'], active: false },
  { id: 't5', name: 'Réengager les prospects silencieux', category: 'IA', nodes: ['trigger','ai','condition','whatsapp','linkedin'], active: false },
  { id: 't6', name: 'Invitation LinkedIn acceptée', category: 'LinkedIn', nodes: ['trigger','wait','linkedin','condition','task'], active: false },
];

const CATEGORY_COLORS = {
  WhatsApp: { bg: '#ECFDF5', color: '#065F46', border: '#10B981' },
  LinkedIn: { bg: '#EFF6FF', color: '#0A66C2', border: '#0A66C2' },
  CRM:      { bg: '#EFF6FF', color: '#1E3A8A', border: '#2563EB' },
  IA:       { bg: '#F0FDF4', color: '#047857', border: '#059669' },
};

function LeftTemplatePanel({ selectedTemplate, onSelectTemplate }) {
  const [search, setSearch] = useWF('');
  const [cat, setCat] = useWF('Tous');
  const categories = ['Tous', 'WhatsApp', 'LinkedIn', 'CRM', 'IA'];
  const filtered = TEMPLATES.filter(t =>
    (cat === 'Tous' || t.category === cat) &&
    (t.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ width: 256, flexShrink: 0, borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', background: '#FAFAFA', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: 8 }}>Modèles</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12.5, background: 'white', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 10px', flexWrap: 'wrap', borderBottom: '1px solid #E2E8F0' }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: cat === c ? '#0052D9' : '#F1F5F9', color: cat === c ? 'white' : '#64748B', transition: 'all 120ms' }}>{c}</button>
        ))}
      </div>
      {/* Template list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {filtered.map(t => {
          const cc = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.WhatsApp;
          const isSelected = selectedTemplate === t.id;
          return (
            <div key={t.id} onClick={() => onSelectTemplate(t.id)}
              style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 4, cursor: 'pointer', background: isSelected ? '#E8F0FD' : 'white', border: `1px solid ${isSelected ? '#0052D9' : '#E2E8F0'}`, transition: 'all 120ms' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', lineHeight: 1.3, flex: 1 }}>{t.name}</div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: cc.bg, color: cc.color, flexShrink: 0, border: `1px solid ${cc.border}33` }}>{t.category}</span>
              </div>
              {/* Mini node preview */}
              <div style={{ display: 'flex', gap: 3, marginTop: 7, alignItems: 'center' }}>
                {t.nodes.map((type, i) => {
                  const cfg = WF_NODE_TYPES[type];
                  return (
                    <React.Fragment key={i}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}66`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {cfg.iconFn(10)}
                      </div>
                      {i < t.nodes.length - 1 && <div style={{ width: 8, height: 1, background: '#CBD5E1' }}></div>}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
        {/* Custom node palette */}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: 8, padding: '0 2px' }}>Ajouter un bloc</div>
          {Object.entries(WF_NODE_TYPES).map(([type, cfg]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'grab', marginBottom: 2, background: 'white', border: '1px solid #E2E8F0' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {cfg.iconFn(12)}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{cfg.label}</span>
              <div style={{ marginLeft: 'auto', opacity: 0.4 }}>{WFIco.drag(12, '#94A3B8')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==================== RIGHT CONFIG PANEL ==================== */
const NODE_CONFIG_FIELDS = {
  trigger: {
    title: 'Configuration du déclencheur',
    fields: [
      { label: 'Événement déclencheur', type: 'select', value: 'meeting_booked', options: ['Réunion réservée', 'Invitation LinkedIn acceptée', 'Réponse WhatsApp reçue', 'Ajout à une liste', 'Statut CRM modifié'] },
      { label: 'Liste de prospects', type: 'select', value: 'all', options: ['Toutes les listes', 'Prospects chauds Q2', 'Leads entrants site web'] },
      { label: 'Activer le filtrage', type: 'toggle', value: false },
    ]
  },
  condition: {
    title: 'Configuration de la condition',
    fields: [
      { label: 'Type de condition', type: 'select', value: 'wa_consent', options: ['Consentement WhatsApp', 'Réponse reçue', 'Réunion effectuée', 'Connexion LinkedIn', 'Score de lead'] },
      { label: 'Opérateur', type: 'select', value: 'eq', options: ['Est égal à', 'Contient', 'Est vrai', 'Supérieur à'] },
      { label: 'Valeur attendue', type: 'text', value: 'Oui — consentement explicite' },
    ]
  },
  whatsapp: {
    title: 'Message WhatsApp',
    fields: [
      { label: 'Modèle de message', type: 'select', value: 'confirm', options: ['Confirmation réunion', 'Rappel J-0', 'Post-meeting', 'No-show recovery', 'Relance prospect'] },
      { label: 'Délai d\'envoi', type: 'select', value: 'immediate', options: ['Immédiatement', 'Après 30 minutes', 'Après 1 heure', 'Le lendemain matin'] },
      { label: 'Aperçu du message', type: 'preview', value: 'Bonjour {{prénom}}, votre réunion avec {{commercial}} est confirmée pour le {{date}} à {{heure}}. 📅' },
      { label: 'Variable de tracking', type: 'toggle', value: true },
    ]
  },
  wait: {
    title: 'Délai d\'attente',
    fields: [
      { label: 'Durée', type: 'number', value: '2' },
      { label: 'Unité', type: 'select', value: 'hours', options: ['Minutes', 'Heures', 'Jours', 'Semaines'] },
      { label: 'Condition de déclenchement', type: 'select', value: 'relative', options: ['Durée relative', 'Avant l\'événement', 'Après l\'événement'] },
    ]
  },
  crm: {
    title: 'Mise à jour CRM',
    fields: [
      { label: 'Champ à modifier', type: 'select', value: 'status', options: ['Statut du prospect', 'Score de lead', 'Propriétaire', 'Étape du pipeline', 'Note'] },
      { label: 'Nouvelle valeur', type: 'select', value: 'meeting_done', options: ['Réunion effectuée', 'Qualification en cours', 'Proposition envoyée', 'Gagné', 'Perdu'] },
      { label: 'Notifier le propriétaire', type: 'toggle', value: true },
    ]
  },
  notification: {
    title: 'Notification interne',
    fields: [
      { label: 'Destinataire', type: 'select', value: 'owner', options: ['Propriétaire du prospect', 'Toute l\'équipe commerciale', 'Manager commercial', 'Slack #alerts'] },
      { label: 'Message', type: 'text', value: 'Aucun consentement WhatsApp disponible pour ce prospect.' },
      { label: 'Priorité', type: 'select', value: 'normal', options: ['Normale', 'Haute', 'Urgente'] },
    ]
  },
  task: {
    title: 'Création de tâche',
    fields: [
      { label: 'Titre de la tâche', type: 'text', value: 'Relancer le prospect manuellement' },
      { label: 'Assigner à', type: 'select', value: 'owner', options: ['Propriétaire du prospect', 'Moi-même', 'Équipe commerciale'] },
      { label: 'Priorité', type: 'select', value: 'high', options: ['Normale', 'Haute', 'Urgente'] },
      { label: 'Échéance', type: 'select', value: '2d', options: ['Aujourd\'hui', 'Dans 1 jour', 'Dans 2 jours', 'Dans 1 semaine'] },
    ]
  },
};

function RightConfigPanel({ nodeId, onClose }) {
  const node = WORKFLOW_NODES.find(n => n.id === nodeId);
  if (!node) return null;
  const cfg = WF_NODE_TYPES[node.type] || WF_NODE_TYPES.end;
  const configDef = NODE_CONFIG_FIELDS[node.type];

  return (
    <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid #E2E8F0', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${cfg.border}44` }}>
          {cfg.iconFn(16)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.label}</div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 4, borderRadius: 6 }}>
          {WFIco.x(14, '#94A3B8')}
        </button>
      </div>

      {/* Config fields */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {configDef ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{configDef.title}</div>
            {configDef.fields.map((field, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{field.label}</label>
                {field.type === 'select' && (
                  <select defaultValue={field.value} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12.5, color: '#0F172A', background: 'white', outline: 'none' }}>
                    {field.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                )}
                {field.type === 'text' && (
                  <input defaultValue={field.value} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12.5, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
                )}
                {field.type === 'number' && (
                  <input type="number" defaultValue={field.value} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12.5, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
                )}
                {field.type === 'toggle' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: field.value ? '#0052D9' : '#CBD5E1', position: 'relative', cursor: 'pointer', transition: 'background 150ms' }}>
                      <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: 'white', top: 2, left: field.value ? 18 : 2, transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></div>
                    </div>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{field.value ? 'Activé' : 'Désactivé'}</span>
                  </div>
                )}
                {field.type === 'preview' && (
                  <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, color: '#374151', lineHeight: 1.5, fontStyle: 'italic' }}>
                    {field.value}
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 40 }}>Aucune configuration disponible</div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 8, paddingTop: 14, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 6 }}>
          <button style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', fontSize: 12.5, fontWeight: 500, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {WFIco.copy(12, '#374151')} Dupliquer
          </button>
          <button style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #FEE2E2', background: '#FFF1F2', fontSize: 12.5, color: '#BE123C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {WFIco.trash(12, '#BE123C')}
          </button>
        </div>
      </div>

      {/* Save button */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0' }}>
        <button style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', background: '#0052D9', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Enregistrer les modifications
        </button>
      </div>
    </div>
  );
}

/* ==================== MAIN CANVAS ==================== */
function WorkflowCanvas({ workflowName, status, onSetStatus, onBack }) {
  const [selectedNode, setSelectedNode] = useWF(null);
  const [selectedTemplate, setSelectedTemplate] = useWF('t1');
  const canvasRef = useWFRef(null);
  const CANVAS_W = 1060, CANVAS_H = 1100;

  const handleSelectNode = (id) => setSelectedNode(id === selectedNode ? null : id);
  const handleCanvasClick = (e) => { if (e.target === canvasRef.current) setSelectedNode(null); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white' }}>
      <CanvasToolbar status={status} onSetStatus={onSetStatus} workflowName={workflowName} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftTemplatePanel selectedTemplate={selectedTemplate} onSelectTemplate={setSelectedTemplate} />

        {/* Canvas area */}
        <div style={{ flex: 1, overflow: 'auto', background: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundColor: '#F8FAFC', position: 'relative' }}>
          <div ref={canvasRef} onClick={handleCanvasClick}
            style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative', margin: '40px auto' }}>
            <SVGEdges selectedNode={selectedNode} />
            {WORKFLOW_NODES.map(node => (
              <WorkflowNode key={node.id} node={node} selected={selectedNode === node.id} onSelect={handleSelectNode} />
            ))}
          </div>
        </div>

        {/* Right panel */}
        {selectedNode && (
          <RightConfigPanel nodeId={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  );
}

Object.assign(window, { WorkflowCanvas, WFIco, WF_NODE_TYPES, WORKFLOW_NODES });
