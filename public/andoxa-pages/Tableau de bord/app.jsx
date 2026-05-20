// Andoxa — Tableau de bord (cockpit Revenue Engine)
const { useState, useMemo, useRef, useEffect } = React;

/* ============================================================
   ICONS — Lucide-style inline SVG (1.5 stroke)
   ============================================================ */
const Icon = ({ name, size = 16, className = "", style }) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", className, style };
  const paths = {
    grid:        <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
    workflow:    <><circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 7.5v9"/><path d="M8 6.5h5a2.5 2.5 0 0 1 2.5 2.5v.5"/><path d="M8 17.5h5a2.5 2.5 0 0 0 2.5-2.5v-.5"/></>,
    users:       <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    megaphone:   <><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></>,
    whatsapp:    <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
    message:     <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    calendar:    <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    search:      <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    bell:        <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    chevronLeft: <><polyline points="15 18 9 12 15 6"/></>,
    chevronRight:<><polyline points="9 18 15 12 9 6"/></>,
    chevronDown: <><polyline points="6 9 12 15 18 9"/></>,
    arrowUp:     <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrowDown:   <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    arrowRight:  <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    trendUp:     <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
    trendDown:   <><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></>,
    target:      <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    zap:         <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    rocket:      <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></>,
    flame:       <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></>,
    snowflake:   <><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></>,
    dot:         <circle cx="12" cy="12" r="3"/>,
    arrowRightCircle: <><circle cx="12" cy="12" r="9"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
    download:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    plus:        <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    check:       <polyline points="20 6 9 17 4 12"/>,
    refresh:     <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15A9 9 0 0 1 5.64 18.36L1 14"/></>,
    upload:      <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    linkedin:    <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></>,
    activity:    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    alert:       <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    clock:       <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></>,
    filter:      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    moreH:       <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    phone:       <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
    user:        <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  };
  return <svg {...props}>{paths[name]}</svg>;
};

/* ============================================================
   SIDEBAR
   ============================================================ */
const NAV = [
  { id: "dashboard",  label: "Tableau de bord",   icon: "grid",      active: true },
  { id: "crm",        label: "CRM",               icon: "users" },
  { id: "campaigns",  label: "Campagnes & Appels",icon: "megaphone" },
  { id: "wa",         label: "WhatsApp",          icon: "whatsapp" },
  { id: "wa2",        label: "WhatsApp v2",       icon: "whatsapp" },
  { id: "messagerie", label: "Messagerie",        icon: "message" },
  { id: "calendrier", label: "Calendrier",        icon: "calendar" },
];

function Sidebar({ collapsed, onToggle }) {
  // Delegates to the canonical AndoxaSidebar. `collapsed` and `onToggle` are
  // accepted for API back-compat but no longer used — the canonical sidebar
  // manages its own collapsed state.
  return <AndoxaSidebar active="dashboard" logoBase="assets/" />;
}

/* ============================================================
   TOPBAR
   ============================================================ */
function TopBar() {
  return (
    <div className="flex items-center justify-between h-14 px-6 border-b border-slate-200 bg-white flex-shrink-0">
      <div className="text-[15px] font-semibold text-slate-900">Tableau de bord</div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Rechercher un prospect…" className="w-72 h-9 pl-9 pr-3 rounded-md border border-slate-200 bg-slate-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:bg-white transition-all" />
        </div>
        <button className="relative w-9 h-9 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors">
          <Icon name="bell" size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PRIMITIVES
   ============================================================ */
const Pill = ({ children, tone = "slate" }) => {
  const tones = {
    slate:  "bg-slate-100 text-slate-700",
    blue:   "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber:  "bg-amber-50 text-amber-700",
    green:  "bg-emerald-50 text-emerald-700",
    rose:   "bg-rose-50 text-rose-700",
    cyan:   "bg-cyan-50 text-cyan-700",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
};

const Trend = ({ delta, suffix = "pts", invert = false }) => {
  const up = delta > 0;
  const positive = invert ? !up : up;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11.5px] font-medium ${positive ? "text-emerald-600" : "text-rose-500"}`}>
      <Icon name={up ? "trendUp" : "trendDown"} size={11} />
      {up ? "+" : ""}{delta} {suffix}
    </span>
  );
};

const Avatar = ({ initials, size = 32, color = "#0052D9" }) => (
  <div className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
       style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
    {initials}
  </div>
);

/* ============================================================
   HEADER
   ============================================================ */
const PERIODS = ["Aujourd'hui", "Cette semaine", "Ce mois", "30 jours", "Personnalisé"];

function PageHeader({ period, setPeriod }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="flex items-start justify-between gap-6 mb-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 leading-tight">Tableau de bord</h1>
        <div className="mt-1.5 text-[13.5px] text-slate-500 flex items-center gap-1.5 flex-wrap">
          <span>Bonjour <span className="text-slate-700 font-medium">Sebastian</span></span>
          <span className="text-slate-300">·</span>
          <span>Lundi 27 avril 2026</span>
          <span className="text-slate-300">·</span>
          <span>Semaine 18</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(o => !o)}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors">
            <Icon name="calendar" size={13} className="text-slate-400" />
            {period}
            <Icon name="chevronDown" size={13} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-md shadow-lg p-1 z-30">
              {PERIODS.map(p => (
                <button key={p} onClick={() => { setPeriod(p); setOpen(false); }}
                  className={`w-full text-left px-2.5 py-1.5 text-[12.5px] rounded transition-colors flex items-center justify-between ${period === p ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"}`}>
                  {p}
                  {period === p && <Icon name="check" size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="h-9 px-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors">
          <Icon name="download" size={14} />
          Exporter
        </button>
        <button className="h-9 px-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-white rounded-md transition-colors hover:opacity-90"
          style={{ background: "#0052D9" }}>
          <Icon name="rocket" size={14} />
          Lancer une campagne
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PRIORITIES — bandeau "Mes priorités du jour"
   ============================================================ */
const PRIORITIES = [
  { icon: "calendar",  tone: "blue",   count: "3",  label: "RDV aujourd'hui",         sub: "Prochain : 14h00, Malik BENSAÏD",         cta: "Voir le calendrier" },
  { icon: "message",   tone: "amber",  count: "5",  label: "Conversations à relancer", sub: "Silence > 7 jours",                       cta: "Ouvrir la messagerie" },
  { icon: "zap",       tone: "violet", count: "8",  label: "Réponses non lues",       sub: "LinkedIn + WhatsApp",                     cta: "Voir les non lus" },
  { icon: "target",    tone: "green",  count: "2",  label: "Propositions à suivre",   sub: "Andréas BODIN · Lucile MERCIER",          cta: "Ouvrir le CRM" },
  { icon: "workflow",  tone: "cyan",   count: "1",  label: "Workflow en attente",     sub: "Parcours « Classique » · étape 4/5",      cta: "Reprendre" },
];

const TONE_BG = {
  blue:   { bg: "bg-blue-50",    text: "text-blue-600",    ring: "ring-blue-100" },
  amber:  { bg: "bg-amber-50",   text: "text-amber-600",   ring: "ring-amber-100" },
  violet: { bg: "bg-violet-50",  text: "text-violet-600",  ring: "ring-violet-100" },
  green:  { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
  cyan:   { bg: "bg-cyan-50",    text: "text-cyan-600",    ring: "ring-cyan-100" },
  rose:   { bg: "bg-rose-50",    text: "text-rose-600",    ring: "ring-rose-100" },
};

function PrioritiesBand() {
  return (
    <section className="rounded-xl border border-blue-100 p-5 mb-6" style={{ background: "linear-gradient(180deg, rgba(232,240,253,0.55) 0%, rgba(232,240,253,0.15) 100%)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "#0052D9" }}></span>
            <span className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-blue-700">Cockpit du matin</span>
          </div>
          <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-slate-900">Mes priorités du jour</h2>
        </div>
        <div className="text-[12px] text-slate-500">Mis à jour il y a 4 min</div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {PRIORITIES.map((p, i) => {
          const t = TONE_BG[p.tone];
          return (
            <button key={i} className="text-left bg-white border border-slate-200 rounded-lg p-3.5 hover:border-blue-200 hover:shadow-[0_2px_8px_rgba(0,82,217,0.08)] transition-all group">
              <div className="flex items-start justify-between mb-2.5">
                <div className={`w-8 h-8 rounded-lg ${t.bg} ${t.text} flex items-center justify-center`}>
                  <Icon name={p.icon} size={16} />
                </div>
                <Icon name="arrowRight" size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors mt-1" />
              </div>
              <div className="text-[26px] font-semibold tracking-tight text-slate-900 leading-none mb-1.5">{p.count}</div>
              <div className="text-[12.5px] font-medium text-slate-800 leading-tight">{p.label}</div>
              <div className="mt-1 text-[11.5px] text-slate-500 truncate">{p.sub}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
   KPI CARDS
   ============================================================ */
function Sparkline({ data, color = "#0052D9" }) {
  const max = Math.max(...data), min = Math.min(...data);
  const W = 120, H = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * (H - 4) - 2;
    return [x, y];
  });
  const line = "M" + pts.map(p => p.join(",")).join(" L");
  const area = line + ` L${W},${H} L0,${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
      <defs>
        <linearGradient id={`sparkGrad-${color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sparkGrad-${color.slice(1)})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

const KPIS = [
  { label: "Pipeline actif", value: "47", sub: "prospects en cours", side: "8 en proposition · 3 en closing · 12 en RDV", trend: 8, sparkData: [22,28,30,29,33,36,34,38,42,44,45,47] },
  { label: "RDV bookés ce mois", value: "24", sub: "78% de réalisation", side: "vs objectif 31", trend: 6, sparkData: [12,14,13,16,15,17,18,19,20,21,22,24] },
  { label: "Taux de réponse LinkedIn", value: "32%", sub: "sur 142 messages envoyés", side: "Acceptation 40%", trend: 4, sparkData: [22,24,23,26,28,27,29,30,30,31,31,32] },
  { label: "Closings ce mois", value: "5", sub: "vs objectif 8", side: "62% de l'objectif atteint", trend: -2, progress: 62, sparkData: [7,8,7,9,8,9,8,7,7,6,6,5], sparkColor: "#ef4444", isProgress: true },
];

function KpiCard({ k }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-all">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-slate-500">{k.label}</div>
        <Trend delta={k.trend} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-[32px] font-semibold tracking-tight text-slate-900 leading-none">{k.value}</div>
          <div className="mt-1.5 text-[12.5px] text-slate-600">{k.sub}</div>
        </div>
        {k.sparkData && <Sparkline data={k.sparkData} color={k.sparkColor || "#0052D9"} />}
      </div>
      {k.isProgress && (
        <div className="mt-4">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${k.progress}%`, background: "#0052D9" }}></div>
          </div>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-slate-100 text-[11.5px] text-slate-500">{k.side}</div>
    </div>
  );
}

function KpiGrid() {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {KPIS.map((k, i) => <KpiCard key={i} k={k} />)}
    </div>
  );
}

/* ============================================================
   FUNNEL (left) + ACTIVITY VOLUME (right)
   ============================================================ */
const FUNNEL = [
  { label: "Invitations envoyées", n: 450, conv: null,  trend: 12, exact: true },
  { label: "Acceptées",            n: 180, conv: "40%", trend: 3   },
  { label: "Conversations",        n: 120, conv: "67%", trend: 5   },
  { label: "RDV bookés",           n: 38,  conv: "32%", trend: -1  },
  { label: "Closings",             n: 8,   conv: "21%", trend: 2   },
];

function Funnel() {
  const first = FUNNEL[0].n;
  const MIN_W = 14; // % minimum so the last step stays visible
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Funnel de conversion</h3>
          <div className="text-[12px] text-slate-500 mt-0.5">Du premier contact au closing — 30 derniers jours</div>
        </div>
        <button className="text-[12px] text-blue-600 font-medium hover:text-blue-700">Détails →</button>
      </div>
      <div className="mt-5 space-y-2.5">
        {FUNNEL.map((s, i) => {
          const raw = (s.n / first) * 100;
          const w = MIN_W + (raw / 100) * (100 - MIN_W);
          return (
            <div key={s.label} className="group cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 w-3 tabular-nums">{i+1}</span>
                  <span className="text-[13px] text-slate-700 font-medium">{s.label}</span>
                  {s.conv && <Pill tone="blue">{s.conv} de passage</Pill>}
                </div>
                <div className="flex items-center gap-3">
                  <Trend delta={s.trend} suffix=""/>
                  <span className="text-[14px] font-semibold tabular-nums text-slate-900 w-12 text-right">{s.n}</span>
                </div>
              </div>
              <div className="h-7 rounded-md relative overflow-hidden" style={{ background: "rgba(232,240,253,0.5)" }}>
                <div className="h-full rounded-md transition-all group-hover:brightness-110"
                  style={{ width: `${w}%`, background: "linear-gradient(90deg, #0052D9 0%, #1A6AFF 100%)" }}>
                </div>
                <div className="absolute inset-0 flex items-center px-3">
                  {/* leave empty, label is above */}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
        <div>
          <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-slate-500">Taux global</div>
          <div className="mt-1 text-[18px] font-semibold tracking-tight text-slate-900">1,8 %</div>
          <div className="text-[11px] text-slate-500">invitation → closing</div>
        </div>
        <div>
          <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-slate-500">Cycle moyen</div>
          <div className="mt-1 text-[18px] font-semibold tracking-tight text-slate-900">14 jours</div>
          <div className="text-[11px] text-slate-500">premier message → RDV</div>
        </div>
        <div>
          <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-slate-500">Pipeline cible</div>
          <div className="mt-1 text-[18px] font-semibold tracking-tight text-slate-900">10 closings</div>
          <div className="text-[11px] text-slate-500">à période iso</div>
        </div>
      </div>
    </div>
  );
}

/* Activity Volume — stacked bar chart */
const ACT_PERIODS = ["4 sem", "12 sem", "6 mois"];
const ACTIVITY = [
  { week: "S.13", calls: 8,  msgs: 28, rdvs: 4 },
  { week: "S.14", calls: 12, msgs: 34, rdvs: 6 },
  { week: "S.15", calls: 9,  msgs: 30, rdvs: 5 },
  { week: "S.16", calls: 14, msgs: 42, rdvs: 8 },
  { week: "S.17", calls: 11, msgs: 38, rdvs: 7 },
  { week: "S.18", calls: 6,  msgs: 22, rdvs: 3 },
];

function ActivityVolume() {
  const [p, setP] = useState("12 sem");
  const max = Math.max(...ACTIVITY.map(a => a.calls + a.msgs + a.rdvs));
  const totalMsgs = ACTIVITY.reduce((s, a) => s + a.msgs, 0);
  const totalCalls = ACTIVITY.reduce((s, a) => s + a.calls, 0);
  const totalRdvs = ACTIVITY.reduce((s, a) => s + a.rdvs, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Volume d'activité</h3>
          <div className="text-[12px] text-slate-500 mt-0.5">Messages, appels et RDV par semaine</div>
        </div>
        <div className="flex items-center bg-slate-100 rounded-md p-0.5">
          {ACT_PERIODS.map(opt => (
            <button key={opt} onClick={() => setP(opt)}
              className={`px-2 py-1 text-[11.5px] rounded transition-all ${p === opt ? "bg-white text-slate-900 shadow-sm font-medium" : "text-slate-600"}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-end gap-3 h-44 px-1">
        {ACTIVITY.map((a, i) => {
          const total = a.calls + a.msgs + a.rdvs;
          const h = (total / max) * 100;
          const calH = (a.calls / total) * h;
          const msgH = (a.msgs / total) * h;
          const rdvH = (a.rdvs / total) * h;
          return (
            <div key={i} className="flex-1 flex flex-col items-center group">
              <div className="text-[10.5px] font-medium text-slate-500 mb-1.5 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">{total}</div>
              <div className="w-full flex flex-col justify-end" style={{ height: 140 }}>
                <div className="w-full rounded-t-sm transition-all group-hover:brightness-110" style={{ height: `${rdvH}%`, background: "#86efac" }}></div>
                <div className="w-full transition-all group-hover:brightness-110" style={{ height: `${msgH}%`, background: "#0052D9" }}></div>
                <div className="w-full rounded-b-sm transition-all group-hover:brightness-110" style={{ height: `${calH}%`, background: "#93c5fd" }}></div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium">{a.week}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
        <LegendStat color="#0052D9"  label="Messages" value={totalMsgs} />
        <LegendStat color="#93c5fd"  label="Appels"   value={totalCalls} />
        <LegendStat color="#86efac"  label="RDV"      value={totalRdvs} />
      </div>
    </div>
  );
}

const LegendStat = ({ color, label, value }) => (
  <div className="flex items-center gap-2.5">
    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }}></div>
    <div className="flex-1 min-w-0">
      <div className="text-[11px] text-slate-500 leading-tight">{label}</div>
      <div className="text-[15px] font-semibold tabular-nums text-slate-900 leading-tight">{value}</div>
    </div>
  </div>
);

/* ============================================================
   TOP DEALS + AT-RISK DEALS
   ============================================================ */
const TOP_DEALS = [
  { name: "Andréas BODIN",  company: "Lyra Studio",      stage: "Proposition",  tone: "violet", last: "Réponse il y a 2j",     color: "#0052D9", initials: "AB" },
  { name: "Lucile MERCIER", company: "Northwave SAS",    stage: "RDV planifié", tone: "blue",   last: "RDV le 28 avril",       color: "#FF6700", initials: "LM" },
  { name: "Malik BENSAÏD",  company: "Atlas Conseil",    stage: "Closing",      tone: "green",  last: "Devis envoyé il y a 1j", color: "#0052D9", initials: "MB" },
  { name: "Sarah COHEN",    company: "Helio & Co.",      stage: "Proposition",  tone: "violet", last: "Réponse il y a 3j",     color: "#10b981", initials: "SC" },
  { name: "Léa MARCHAND",   company: "Pivot Labs",       stage: "RDV planifié", tone: "blue",   last: "RDV le 30 avril",       color: "#8b5cf6", initials: "LM" },
];

const AT_RISK = [
  { name: "Yanis AZOULAY",   company: "Quartz Media",      stage: "Proposition", tone: "violet", silence: 11, severity: "high",  initials: "YA", color: "#0052D9" },
  { name: "Camille FOURNIER",company: "Brindille Studio",  stage: "RDV no-show", tone: "rose",  silence: 8,  severity: "high",  initials: "CF", color: "#FF6700" },  { name: "Romain VASSEUR",  company: "Klyon Tech",        stage: "Conversation", tone: "cyan",   silence: 9,  severity: "med",   initials: "RV", color: "#10b981" },
  { name: "Inès GAUTIER",    company: "Mosaïk SAS",        stage: "RDV planifié", tone: "blue",   silence: 7,  severity: "med",   initials: "IG", color: "#8b5cf6" },
  { name: "Théo LEROUX",     company: "Arpège Conseil",    stage: "Proposition", tone: "violet", silence: 6,  severity: "low",   initials: "TL", color: "#0052D9" },
];

function TopDeals() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon name="flame" size={15} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Top deals en cours</h3>
            <div className="text-[12px] text-slate-500">5 prospects les plus chauds</div>
          </div>
        </div>
        <button className="text-[12px] text-blue-600 font-medium hover:text-blue-700">Tout le pipeline →</button>
      </div>
      <div className="divide-y divide-slate-100">
        {TOP_DEALS.map((d, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 hover:bg-slate-50/60 -mx-2 px-2 rounded transition-colors cursor-pointer group">
            <Avatar initials={d.initials} color={d.color} size={32}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-slate-900 truncate">{d.name}</span>
                <Pill tone={d.tone}>{d.stage}</Pill>
              </div>
              <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 mt-0.5">
                <span className="truncate">{d.company}</span>
                <span className="text-slate-300">·</span>
                <span className="truncate">{d.last}</span>
              </div>
            </div>
            <button className="text-[11.5px] font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors flex-shrink-0 inline-flex items-center gap-1">
              Voir
              <Icon name="arrowRight" size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AtRisk() {
  const sevColor = { high: "text-rose-600 bg-rose-50", med: "text-amber-600 bg-amber-50", low: "text-slate-500 bg-slate-100" };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <Icon name="snowflake" size={15} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Deals à risque</h3>
            <div className="text-[12px] text-slate-500">À relancer pour ne pas perdre le fil</div>
          </div>
        </div>
        <button className="text-[12px] text-blue-600 font-medium hover:text-blue-700">Tout voir →</button>
      </div>
      <div className="divide-y divide-slate-100">
        {AT_RISK.map((d, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 hover:bg-slate-50/60 -mx-2 px-2 rounded transition-colors cursor-pointer group">
            <Avatar initials={d.initials} color={d.color} size={32}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-slate-900 truncate">{d.name}</span>
                <Pill tone={d.tone}>{d.stage}</Pill>
              </div>
              <div className="text-[11.5px] text-slate-500 truncate mt-0.5">{d.company}</div>
            </div>
            <div className={`text-right flex-shrink-0 px-2 py-1 rounded-md ${sevColor[d.severity]}`}>
              <div className="text-[12px] font-semibold tabular-nums leading-tight">{d.silence}j</div>
              <div className="text-[9.5px] uppercase tracking-wide leading-tight">silence</div>
            </div>
            <button className="text-[11.5px] font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors flex-shrink-0">Relancer</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   LINKEDIN QUOTAS — compact card
   ============================================================ */
const QUOTAS = [
  { label: "Invitations", used: 42, max: 80,  color: "#0052D9" },
  { label: "Messages",    used: 67, max: 100, color: "#1A6AFF" },
  { label: "Vues profil", used: 28, max: 80,  color: "#93c5fd" },
];

function LinkedInQuotas() {
  const overall = QUOTAS.reduce((s, q) => s + q.used / q.max, 0) / QUOTAS.length;
  const status = overall < 0.7 ? "ok" : overall < 0.9 ? "warn" : "high";
  const statusUI = {
    ok:   { color: "bg-emerald-500", label: "Quotas sains",      tone: "text-emerald-600" },
    warn: { color: "bg-amber-500",   label: "Approche limite",   tone: "text-amber-600" },
    high: { color: "bg-rose-500",    label: "Quasi-saturés",     tone: "text-rose-600" },
  }[status];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Icon name="linkedin" size={15} />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-slate-900">Quotas LinkedIn</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${statusUI.color}`}></span>
              <span className={`text-[11px] font-medium ${statusUI.tone}`}>{statusUI.label}</span>
            </div>
          </div>
        </div>
        <button className="text-[11.5px] text-blue-600 font-medium hover:text-blue-700">Détails →</button>
      </div>
      <div className="space-y-3">
        {QUOTAS.map(q => {
          const pct = (q.used / q.max) * 100;
          return (
            <div key={q.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-slate-700">{q.label}</span>
                <span className="text-[11.5px] tabular-nums text-slate-500">{q.used} <span className="text-slate-300">/</span> {q.max}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: q.color }}></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
        Réinitialisation à minuit (UTC). Andoxa lisse l'envoi pour rester sous les seuils de sécurité LinkedIn.
      </div>
    </div>
  );
}

/* ============================================================
   ACTIVE CAMPAIGNS — second sidebar card
   ============================================================ */
const ACTIVE_CAMPAIGNS = [
  { name: "Parcours Classique — Tech B2B",  channel: "LinkedIn + WhatsApp", state: "En cours", tone: "green",  done: 38, total: 50 },
  { name: "Relance proposition Q2",          channel: "WhatsApp",            state: "En cours", tone: "green",  done: 12, total: 24 },
  { name: "Outbound — Studios créatifs",     channel: "LinkedIn",            state: "En pause", tone: "amber",  done: 18, total: 60 },
];

function ActiveCampaigns() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <Icon name="megaphone" size={15} />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-slate-900">Mes campagnes actives</h3>
            <div className="text-[11px] text-slate-500">3 séquences en orchestration</div>
          </div>
        </div>
        <button className="text-[11.5px] text-blue-600 font-medium hover:text-blue-700">Toutes →</button>
      </div>
      <div className="space-y-3.5">
        {ACTIVE_CAMPAIGNS.map((c, i) => {
          const pct = (c.done / c.total) * 100;
          return (
            <div key={i} className="group cursor-pointer">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-slate-900 truncate">{c.name}</div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">{c.channel}</div>
                </div>
                <Pill tone={c.tone}>{c.state}</Pill>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.state === "En pause" ? "#cbd5e1" : "#0052D9" }}></div>
                </div>
                <span className="text-[11px] tabular-nums text-slate-500 flex-shrink-0">{c.done} / {c.total}</span>
              </div>
            </div>
          );
        })}
      </div>
      <button className="mt-4 w-full text-[12px] text-blue-600 font-medium hover:text-blue-700 hover:bg-blue-50/50 py-1.5 rounded-md transition-colors">
        + Nouvelle campagne
      </button>
    </div>
  );
}

/* ============================================================
   RECENT ACTIVITY (slim, filtered, grouped)
   ============================================================ */
const ACT_FILTERS = ["Tous", "Mon activité", "Mon équipe", "Système"];

const RECENT_ACTIVITY = [
  { type: "alert",     icon: "alert",      tone: "amber",   title: "Session d'appels terminée",  who: null,                desc: "Session 26/04/26 · 19:29",  time: "26 avr · 21:29" },
  { type: "status",    icon: "arrowRight", tone: "blue",    title: "5 statuts modifiés sur Andréas BODIN", who: "Sebastian Bodin", desc: "RDV → Proposition · +4 autres", time: "26 avr · 21:18", grouped: true, count: 5 },
  { type: "campaign",  icon: "megaphone",  tone: "violet",  title: "Campagne lancée",            who: "Sebastian Bodin",  desc: "WhatsApp · 1 prospect ciblé", time: "21 avr · 13:34" },
  { type: "enriched",  icon: "check",      tone: "green",   title: "Profil enrichi",             who: null,               desc: "Sebastian BODIN — données LinkedIn",  time: "20 avr · 22:04" },
  { type: "whatsapp",  icon: "whatsapp",   tone: "green",   title: "Suivi WhatsApp",             who: "Sebastian Bodin",  desc: "Andréas BODIN inscrit au parcours « Classique »",  time: "19 avr · 18:05" },
  { type: "import",    icon: "upload",     tone: "slate",   title: "Prospects importés",         who: null,               desc: "Liste « TEST WORKFLOW (3) » · LinkedIn", time: "19 avr · 16:02" },
  { type: "campaign",  icon: "megaphone",  tone: "violet",  title: "Campagne lancée",            who: "Sebastian Bodin",  desc: "WhatsApp · 1 prospect", time: "19 avr · 16:25" },
  { type: "enriched",  icon: "check",      tone: "green",   title: "Profil enrichi",             who: null,               desc: "Lucile MERCIER — données LinkedIn",  time: "18 avr · 18:00" },
];

function RecentActivity() {
  const [filter, setFilter] = useState("Tous");
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Icon name="activity" size={15} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Activité récente</h3>
            <div className="text-[12px] text-slate-500">Événements regroupés et filtrés</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-md p-0.5">
            {ACT_FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-[11.5px] rounded transition-all ${filter === f ? "bg-white text-slate-900 shadow-sm font-medium" : "text-slate-600"}`}>
                {f}
              </button>
            ))}
          </div>
          <button className="w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center"><Icon name="filter" size={13}/></button>
        </div>
      </div>

      <div>
        {RECENT_ACTIVITY.map((e, i) => {
          const t = TONE_BG[e.tone] || TONE_BG.blue;
          return (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/60 -mx-2 px-2 rounded transition-colors cursor-pointer group">
              <div className={`w-8 h-8 rounded-lg ${t.bg} ${t.text} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon name={e.icon} size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-slate-900">{e.title}</span>
                  {e.grouped && <span className="text-[10.5px] text-slate-400 font-medium">groupé</span>}
                </div>
                <div className="text-[11.5px] text-slate-500 mt-0.5">
                  {e.desc}
                  {e.who && <> <span className="text-slate-300 mx-1">·</span> par <span className="text-slate-700">{e.who}</span></>}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 flex-shrink-0 mt-1 tabular-nums">{e.time}</div>
            </div>
          );
        })}
      </div>

      <button className="mt-4 w-full text-center text-[12.5px] text-blue-600 font-medium hover:text-blue-700 py-2 rounded-md hover:bg-blue-50/50 transition-colors">
        Voir tout l'historique →
      </button>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */
function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [period, setPeriod] = useState("Ce mois");

  return (
    <div className="flex h-full" style={{ background: "#FAFAFA" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto scroll-thin">
          <div className="max-w-[1480px] mx-auto px-8 py-7">
            <PageHeader period={period} setPeriod={setPeriod} />
            <PrioritiesBand />
            <KpiGrid />

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Funnel />
              <ActivityVolume />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <TopDeals />
              <AtRisk />
            </div>

            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "1fr 360px" }}>
              <RecentActivity />
              <div className="flex flex-col gap-4">
                <LinkedInQuotas />
                <ActiveCampaigns />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
