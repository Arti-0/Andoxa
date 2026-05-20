// Shared mock data for the CRM
// Prospects coherent with Messagerie/Calendrier/Dashboard

const STATUSES = {
  nouveau:     { id: 'nouveau',     label: 'Nouveau',     dot: '#94a3b8', bg: '#f1f5f9', fg: '#334155' },
  contacte:    { id: 'contacte',    label: 'Contacté',    dot: '#3b82f6', bg: '#eff6ff', fg: '#1d4ed8' },
  qualifie:    { id: 'qualifie',    label: 'Qualifié',    dot: '#f59e0b', bg: '#fffbeb', fg: '#b45309' },
  rdv:         { id: 'rdv',         label: 'RDV',         dot: '#10b981', bg: '#ecfdf5', fg: '#047857' },
  proposition: { id: 'proposition', label: 'Proposition', dot: '#8b5cf6', bg: '#f5f3ff', fg: '#6d28d9' },
  signe:       { id: 'signe',       label: 'Signé',       dot: '#16a34a', bg: '#dcfce7', fg: '#15803d' },
  perdu:       { id: 'perdu',       label: 'Perdu',       dot: '#ef4444', bg: '#fef2f2', fg: '#b91c1c' },
};

const PIPELINE_ORDER = ['nouveau','contacte','qualifie','rdv','proposition','signe','perdu'];

const SOURCES = {
  linkedin_ext:    { label: 'LinkedIn · Extension', short: 'LinkedIn', color: '#0a66c2', tint: '#e8f1fa', icon: 'globe' },
  linkedin_manual: { label: 'LinkedIn · Manuel',    short: 'LI Manuel', color: '#0a66c2', tint: '#e8f1fa', icon: 'globe' },
  linkedin:        { label: 'LinkedIn · Extension', short: 'LinkedIn', color: '#0a66c2', tint: '#e8f1fa', icon: 'globe' }, // alias retro-compat
  whatsapp:        { label: 'WhatsApp',             short: 'WhatsApp', color: '#16a34a', tint: '#e8f6ec', icon: 'whatsapp' },
  booking:         { label: 'Booking',              short: 'Booking',  color: '#7c3aed', tint: '#f1ecfb', icon: 'calendar' },
  inbound:         { label: 'Inbound',              short: 'Inbound',  color: '#475569', tint: '#eef2f6', icon: 'message' },
  csv:             { label: 'Import CSV',           short: 'CSV',      color: '#64748b', tint: '#f1f5f9', icon: 'upload' },
  manuel:          { label: 'Manuel',               short: 'Manuel',   color: '#64748b', tint: '#f1f5f9', icon: 'edit' },
};

// Avatar color palette derived from name (deterministic)
function avatarColor(name) {
  const palette = ['#0052D9','#FF6700','#16a34a','#8b5cf6','#0ea5e9','#ec4899','#f59e0b','#14b8a6','#6366f1','#dc2626'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function initials(name) {
  return name.split(/[\s-]+/).filter(Boolean).slice(0,2).map(s => s[0].toUpperCase()).join('');
}

const PROSPECTS = [
  {
    id: 'p1', name: 'Andréas BODIN', title: 'Chef de projet — Développement commercial',
    company: 'IÉSEG CONSEIL Paris', status: 'proposition', source: 'linkedin_ext',
    workflow: { name: 'Parcours Classique', step: 4, total: 5 },
    lastActivity: { type: 'reply', label: 'Réponse il y a 2j', urgency: 'ok' },
    convs: ['linkedin','whatsapp'], list: 'Prospection IÉSEG Conseil Avril', enteredAt: 14,
    msgsCount: 5, rdvCount: 1, noShow: 0,
    importedAt: { date: '12 avril 2026 à 14:32', by: 'Sebastian Bodin' },
  },
  {
    id: 'p2', name: 'Lucile MERCIER', title: 'Head of Sales',
    company: 'Studio Néon', status: 'rdv', source: 'booking',
    workflow: { name: 'Parcours Closing', step: 2, total: 4 },
    lastActivity: { type: 'rdv', label: 'RDV le 28 avril', urgency: 'ok' },
    convs: ['linkedin'], list: 'Speakers Tech&Co', enteredAt: 9,
    msgsCount: 8, rdvCount: 1, noShow: 0,
    importedAt: { date: '17 avril 2026 à 09:11', by: 'Sebastian Bodin' },
  },
  {
    id: 'p3', name: 'Malik BENSAÏD', title: 'CEO',
    company: 'Brassée & Co.', status: 'qualifie', source: 'linkedin_ext',
    workflow: { name: 'Parcours Découverte', step: 3, total: 5 },
    lastActivity: { type: 'silence', label: 'Silence 11j', urgency: 'high' },
    convs: ['linkedin'], list: 'Prospection JE Sciences Po Avril', enteredAt: 22,
    msgsCount: 3, rdvCount: 0, noShow: 0,
    importedAt: { date: '04 avril 2026 à 16:48', by: 'Sebastian Bodin' },
  },
  {
    id: 'p4', name: 'Sarah COHEN', title: 'Directrice Marketing',
    company: 'Atelier Quatorze', status: 'contacte', source: 'whatsapp',
    workflow: { name: 'Parcours Classique', step: 2, total: 5 },
    lastActivity: { type: 'reply', label: 'Réponse il y a 4h', urgency: 'ok' },
    convs: ['whatsapp'], list: 'Inbound Avril 2026', enteredAt: 5,
    msgsCount: 6, rdvCount: 0, noShow: 0,
    importedAt: { date: '21 avril 2026 à 11:02', by: 'Sebastian Bodin' },
  },
  {
    id: 'p5', name: 'Léa MARCHAND', title: 'COO',
    company: 'Maison Vasseur', status: 'proposition', source: 'linkedin_ext',
    workflow: null,
    lastActivity: { type: 'silence', label: 'Silence 8j', urgency: 'medium' },
    convs: ['linkedin'], list: 'Speakers Tech&Co', enteredAt: 18,
    msgsCount: 11, rdvCount: 2, noShow: 0,
    importedAt: { date: '08 avril 2026 à 17:25', by: 'Andréas BODIN' },
  },
  {
    id: 'p6', name: 'Yanis AZOULAY', title: 'Co-fondateur',
    company: 'Klarté Studio', status: 'rdv', source: 'linkedin_ext',
    workflow: { name: 'Parcours Découverte', step: 4, total: 5 },
    lastActivity: { type: 'rdv', label: 'RDV le 30 avril', urgency: 'ok' },
    convs: ['linkedin','whatsapp'], list: 'Prospection JE Sciences Po Avril', enteredAt: 12,
    msgsCount: 9, rdvCount: 1, noShow: 0,
    importedAt: { date: '14 avril 2026 à 10:08', by: 'Andréas BODIN' },
  },
  {
    id: 'p7', name: 'Camille FOURNIER', title: 'VP Sales',
    company: 'NordSud SAS', status: 'qualifie', source: 'booking',
    workflow: { name: 'Parcours Classique', step: 1, total: 5 },
    lastActivity: { type: 'reply', label: 'Réponse il y a 1j', urgency: 'ok' },
    convs: ['linkedin'], list: 'Inbound Avril 2026', enteredAt: 3,
    msgsCount: 2, rdvCount: 0, noShow: 0,
    importedAt: { date: '23 avril 2026 à 09:40', by: 'Sebastian Bodin' },
  },
  {
    id: 'p8', name: 'Théo LEROUX', title: 'Growth Lead',
    company: 'Frères Saumon', status: 'contacte', source: 'linkedin_ext',
    workflow: { name: 'Parcours Classique', step: 2, total: 5 },
    lastActivity: { type: 'silence', label: 'Silence 14j', urgency: 'high' },
    convs: ['linkedin'], list: 'Prospection JE Sciences Po Avril', enteredAt: 16,
    msgsCount: 4, rdvCount: 0, noShow: 0,
    importedAt: { date: '10 avril 2026 à 15:18', by: 'Andréas BODIN' },
  },
  {
    id: 'p9', name: 'Inès GAUTIER', title: 'Head of Partnerships',
    company: 'Atelier Quatorze', status: 'signe', source: 'inbound',
    workflow: null,
    lastActivity: { type: 'reply', label: 'Signé il y a 3j', urgency: 'ok' },
    convs: ['linkedin','whatsapp'], list: 'Inbound Avril 2026', enteredAt: 27,
    msgsCount: 18, rdvCount: 3, noShow: 0,
    importedAt: { date: '01 avril 2026 à 13:55', by: 'Sebastian Bodin' },
  },
  {
    id: 'p10', name: 'Romain VASSEUR', title: 'Founder',
    company: 'Maison Vasseur', status: 'nouveau', source: 'linkedin_ext',
    workflow: null,
    lastActivity: { type: 'reply', label: 'Ajouté hier', urgency: 'ok' },
    convs: [], list: 'Speakers Tech&Co', enteredAt: 1,
    msgsCount: 0, rdvCount: 0, noShow: 0,
    importedAt: { date: '26 avril 2026 à 18:02', by: 'Andréas BODIN' },
  },
  {
    id: 'p11', name: 'Benjamin Brangier-Rueda', title: 'Chef de projet — Développement commercial',
    company: 'IÉSEG CONSEIL Paris', status: 'nouveau', source: 'linkedin_ext',
    workflow: null,
    lastActivity: { type: 'reply', label: 'Enrichi il y a 9j', urgency: 'ok' },
    convs: [], list: 'Prospection IÉSEG Conseil Avril', enteredAt: 9,
    msgsCount: 0, rdvCount: 0, noShow: 0,
    importedAt: { date: '17 avril 2026 à 09:47', by: 'Andréas BODIN' },
  },
  {
    id: 'p12', name: 'Camille Laurent', title: 'Marketing Manager',
    company: 'Édition Lumière', status: 'nouveau', source: 'linkedin_ext',
    workflow: null,
    lastActivity: { type: 'reply', label: 'Ajouté il y a 4j', urgency: 'ok' },
    convs: [], list: 'Prospection JE Sciences Po Avril', enteredAt: 4,
    msgsCount: 0, rdvCount: 0, noShow: 0,
    importedAt: { date: '22 avril 2026 à 12:14', by: 'Sebastian Bodin' },
  },
  {
    id: 'p13', name: 'Boris Ravaud', title: 'Sales Director',
    company: 'Veridia Group', status: 'perdu', source: 'linkedin_ext',
    workflow: null,
    lastActivity: { type: 'lost', label: 'Perdu il y a 6j', urgency: 'low' },
    convs: ['linkedin'], list: 'Speakers Tech&Co', enteredAt: 32,
    msgsCount: 5, rdvCount: 1, noShow: 1,
    importedAt: { date: '25 mars 2026 à 14:32', by: 'Andréas BODIN' },
  },
  {
    id: 'p14', name: 'Kemil Taamma', title: 'Account Executive',
    company: 'Forge Digitale', status: 'perdu', source: 'booking',
    workflow: null,
    lastActivity: { type: 'lost', label: 'Perdu il y a 12j', urgency: 'low' },
    convs: [], list: 'Inbound Avril 2026', enteredAt: 28,
    msgsCount: 2, rdvCount: 0, noShow: 1,
    importedAt: { date: '29 mars 2026 à 17:50', by: 'Sebastian Bodin' },
  },
];

const LISTS = [
  { id: 'l1', name: 'Inbound Avril 2026',                source: 'inbound',      count: 5, contacted: 4, rdv: 2, signed: 1, author: 'Sebastian Bodin', date: '19/04/2026', createdAgo: 'il y a 8 jours',  query: 'Formulaire site andoxa.fr' },
  { id: 'l2', name: 'Prospection JE Sciences Po Avril',  source: 'linkedin_ext', count: 4, contacted: 3, rdv: 1, signed: 0, author: 'Sebastian Bodin', date: '19/04/2026', createdAgo: 'il y a 8 jours',  query: 'JE Sciences Po · Paris · 2-10 emp.' },
  { id: 'l3', name: 'Speakers Tech&Co',                  source: 'linkedin_ext', count: 4, contacted: 3, rdv: 1, signed: 0, author: 'Andréas BODIN',   date: '19/04/2026', createdAgo: 'il y a 8 jours',  query: 'CEO/COO · SaaS · 50-200 emp.' },
  { id: 'l4', name: 'Démo plateforme · WhatsApp',        source: 'whatsapp',     count: 7, contacted: 5, rdv: 2, signed: 1, author: 'Sebastian Bodin', date: '12/04/2026', createdAgo: 'il y a 15 jours', query: 'Démos chaudes WhatsApp' },
  { id: 'l5', name: 'Booking · Avril',                   source: 'booking',      count: 6, contacted: 6, rdv: 3, signed: 1, author: 'Sebastian Bodin', date: '12/04/2026', createdAgo: 'il y a 15 jours', query: 'andoxa.fr/rdv-decouverte' },
  { id: 'l6', name: 'Prospection IÉSEG Conseil Avril',   source: 'linkedin_ext', count: 3, contacted: 2, rdv: 1, signed: 0, author: 'Andréas BODIN',   date: '12/04/2026', createdAgo: 'il y a 15 jours', query: 'IÉSEG Conseil · Paris' },
  { id: 'l7', name: 'Liste manuelle test',               source: 'manuel',       count: 3, contacted: 1, rdv: 0, signed: 0, author: 'Andréas BODIN',   date: '01/04/2026', createdAgo: 'il y a 26 jours', query: 'Ajouts manuels divers' },
  { id: 'l8', name: 'Prospection EM Lyon',               source: 'linkedin_ext', count: 18, contacted: 12, rdv: 4, signed: 1, author: 'Andréas BODIN',   date: '22/04/2026', createdAgo: 'il y a 5 jours',  query: 'Alumni EM Lyon · Sales · 5-50 emp.', delta: 5 },
  { id: 'l9', name: 'Inbound Mars 2026',                 source: 'inbound',      count: 9,  contacted: 9,  rdv: 5, signed: 2, author: 'Sebastian Bodin', date: '28/03/2026', createdAgo: 'il y a 30 jours', query: 'Formulaire site andoxa.fr' },
  { id: 'l10', name: 'Speakers SaaS Conf 2026',          source: 'linkedin_ext', count: 22, contacted: 14, rdv: 3, signed: 0, author: 'Sebastian Bodin', date: '20/04/2026', createdAgo: 'il y a 7 jours',  query: 'Conférenciers SaaS · DACH + FR', delta: 8 },
  { id: 'l11', name: 'Démo Q1 · WhatsApp',               source: 'whatsapp',     count: 11, contacted: 8,  rdv: 4, signed: 2, author: 'Sebastian Bodin', date: '02/04/2026', createdAgo: 'il y a 25 jours', query: 'Leads warm Q1 2026' },
  { id: 'l12', name: 'Booking · Mars',                   source: 'booking',      count: 8,  contacted: 8,  rdv: 5, signed: 2, author: 'Andréas BODIN',   date: '15/03/2026', createdAgo: 'il y a 43 jours', query: 'andoxa.fr/rdv-decouverte' },
  { id: 'l13', name: 'Founders Bordeaux Tech',           source: 'linkedin_ext', count: 14, contacted: 6,  rdv: 1, signed: 0, author: 'Andréas BODIN',   date: '24/04/2026', createdAgo: 'il y a 3 jours',  query: 'Founders · Bordeaux · Tech', delta: 14 },
  { id: 'l14', name: 'Import RGPD ESN',                  source: 'csv',          count: 47, contacted: 32, rdv: 6, signed: 1, author: 'Sebastian Bodin', date: '08/04/2026', createdAgo: 'il y a 19 jours', query: 'Base ESN historique 2024' },
];

Object.assign(window, { STATUSES, PIPELINE_ORDER, SOURCES, PROSPECTS, LISTS, avatarColor, initials });
