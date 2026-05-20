// Andoxa Calendrier — Mock data
// Week of Mon Apr 27 — Sun May 3, 2026
// "Maintenant" = Mon Apr 27, 14:32

const NOW = { dayIdx: 0, hour: 14, minute: 32 };

const WEEK_DAYS = [
  { short: 'LUN.', long: 'Lundi',    num: 27, month: 'avr', date: '2026-04-27', isToday: true },
  { short: 'MAR.', long: 'Mardi',    num: 28, month: 'avr', date: '2026-04-28' },
  { short: 'MER.', long: 'Mercredi', num: 29, month: 'avr', date: '2026-04-29' },
  { short: 'JEU.', long: 'Jeudi',    num: 30, month: 'avr', date: '2026-04-30' },
  { short: 'VEN.', long: 'Vendredi', num:  1, month: 'mai', date: '2026-05-01' },
  { short: 'SAM.', long: 'Samedi',   num:  2, month: 'mai', date: '2026-05-02', weekend: true },
  { short: 'DIM.', long: 'Dimanche', num:  3, month: 'mai', date: '2026-05-03', weekend: true },
];

// Team members + colors. "me" is the connected user.
const ME_ID = 'me';
const TEAM = [
  { id: 'me',      name: 'Vous',            initials: 'VO', color: '#0052D9', accent: '#E8F0FD', isMe: true },
  { id: 'andreas', name: 'Andréas BODIN',   initials: 'AB', color: '#7C3AED', accent: '#EDE9FE' },
  { id: 'lucile',  name: 'Lucile MERCIER',  initials: 'LM', color: '#DB2777', accent: '#FCE7F3' },
  { id: 'malik',   name: 'Malik BENSAÏD',   initials: 'MB', color: '#0891B2', accent: '#CFFAFE' },
  { id: 'sarah',   name: 'Sarah COHEN',     initials: 'SC', color: '#EA580C', accent: '#FFE4D5' },
];
const TEAM_BY_ID = Object.fromEntries(TEAM.map(m => [m.id, m]));

// External calendars
const EXT_CALS = [
  { id: 'gcal',      name: 'Google Calendar', color: '#475569', kind: 'sync' },
  { id: 'holidays',  name: 'Jours fériés France', color: '#EF4444', kind: 'ext', defaultOn: true },
  { id: 'vacances',  name: 'Vacances scolaires', color: '#F59E0B', kind: 'ext', defaultOn: false },
];

// Event types — pastel
const TYPES = {
  Discovery: { color: '#10B981', tint: '#ECFDF5', text: '#065F46' },
  'Démo':    { color: '#7C3AED', tint: '#F5F3FF', text: '#5B21B6' },
  Closing:   { color: '#0052D9', tint: '#E8F0FD', text: '#1E3A8A' },
  Interne:   { color: '#64748B', tint: '#F1F5F9', text: '#334155' },
};

// status: confirmed | done | pending | noshow | internal
// EVENTS — each has owner (team member id)
const EVENTS = [
  // Monday — today
  { id: 'e1',  day: 0, owner: 'me',      start: 9.0,  end: 9.5,   title: 'Andréas BODIN', prospect: 'Andréas BODIN', prospectRole: 'Président',  type: 'Discovery', company: 'Junior ESSEC Conseil', channel: 'LinkedIn', status: 'done',     meeting: 'meet',     wa: true,  pipelineStage: 'Discovery',     lastAction: 'Séquence J-1 envoyée hier 18:02' },
  { id: 'e2',  day: 0, owner: 'me',      start: 11.0, end: 12.0,  title: 'Lucile MERCIER', prospect: 'Lucile MERCIER', prospectRole: 'Resp. partenariats', type: 'Démo',      company: 'Edhec Junior Études',  channel: 'LinkedIn', status: 'done',     meeting: 'meet',     wa: true,  pipelineStage: 'Démo',          lastAction: 'Démo 60 min réalisée' },
  { id: 'e3',  day: 0, owner: 'me',      start: 14.0, end: 14.75, title: 'Malik BENSAÏD', prospect: 'Malik BENSAÏD', prospectRole: 'VP Commercial', type: null,         company: 'Bureau des Élèves Centrale', channel: 'WhatsApp', status: 'confirmed', meeting: 'zoom',     wa: true,  pipelineStage: 'Qualification', lastAction: 'Confirmé hier via WhatsApp' },
  { id: 'e4',  day: 0, owner: 'me',      start: 16.0, end: 16.75, title: 'Andoxa Review',   prospect: null,             type: 'Interne',     company: 'Équipe Andoxa', channel: 'Andoxa', status: 'internal',  meeting: 'meet',     wa: false, pipelineStage: null,             lastAction: 'Récap hebdo équipe' },
  { id: 'e5',  day: 0, owner: 'me',      start: 17.5, end: 18.0,  title: 'Camille DELAUNAY', prospect: 'Camille DELAUNAY', prospectRole: 'Trésorière', type: 'Closing',    company: 'JE Sciences Po', channel: 'Inbound', status: 'confirmed', meeting: 'inperson', wa: true,  pipelineStage: 'Closing',        lastAction: 'Contrat envoyé 24/04' },

  // Tuesday
  { id: 'e6',  day: 1, owner: 'andreas', start: 9.5,  end: 10.0,  title: 'Théo NGUYEN',     prospect: 'Théo NGUYEN', prospectRole: 'Président', type: 'Discovery', company: 'EM Lyon Junior Conseil', channel: 'LinkedIn', status: 'confirmed', meeting: 'meet', wa: true, pipelineStage: 'Discovery', lastAction: 'Booking via lien public' },
  { id: 'e7',  day: 1, owner: 'lucile',  start: 11.5, end: 12.5,  title: 'Inès FAURE',      prospect: 'Inès FAURE', prospectRole: 'Resp. dev.', type: null,         company: 'Junior HEC',             channel: 'LinkedIn', status: 'pending',   meeting: 'zoom', wa: false, pipelineStage: 'Qualification', lastAction: 'En attente de confirmation' },
  { id: 'e8',  day: 1, owner: 'me',      start: 15.0, end: 15.75, title: 'Pierre LAMBERT',  prospect: 'Pierre LAMBERT', prospectRole: 'VP', type: 'Discovery',  company: 'JE Audencia',           channel: 'Email',    status: 'noshow',    meeting: 'meet', wa: true,  pipelineStage: 'Discovery',     lastAction: 'Aucune connexion · relance auto déclenchée' },

  // Wednesday
  { id: 'e9',  day: 2, owner: 'sarah',   start: 10.0, end: 10.5,  title: 'Sarah COHEN',     prospect: 'Sarah COHEN', prospectRole: 'Trésorière', type: null,        company: 'JE Dauphine Conseil',    channel: 'LinkedIn', status: 'confirmed', meeting: 'meet', wa: true,  pipelineStage: 'Discovery',     lastAction: 'Confirmé · J-1 programmé' },
  { id: 'e10', day: 2, owner: 'malik',   start: 14.5, end: 15.5,  title: 'Hugo LEROY',      prospect: 'Hugo LEROY', prospectRole: 'Président', type: 'Démo',       company: 'JE ESCP',                channel: 'WhatsApp', status: 'confirmed', meeting: 'zoom', wa: true,  pipelineStage: 'Démo',          lastAction: 'Démo programmée' },
  { id: 'e11', day: 2, owner: 'me',      start: 17.0, end: 17.5,  title: 'Standup interne', prospect: null,             type: 'Interne',     company: 'Équipe Andoxa',          channel: 'Andoxa',   status: 'internal',  meeting: 'meet', wa: false, pipelineStage: null,             lastAction: 'Daily' },

  // Thursday
  { id: 'e12', day: 3, owner: 'me',      start: 9.0,  end: 9.5,   title: 'Léa MARCHAND',    prospect: 'Léa MARCHAND', prospectRole: 'Resp. partenariats', type: null, company: 'JE Sup de Co',           channel: 'LinkedIn', status: 'confirmed', meeting: 'meet', wa: true,  pipelineStage: 'Discovery',     lastAction: 'Booking confirmé' },
  { id: 'e13', day: 3, owner: 'andreas', start: 11.0, end: 11.75, title: 'Yanis AZOULAY',   prospect: 'Yanis AZOULAY', prospectRole: 'Président', type: 'Closing',  company: 'JE INSA Lyon',           channel: 'Inbound',  status: 'confirmed', meeting: 'inperson', wa: true, pipelineStage: 'Closing',     lastAction: 'Signature prévue' },
  { id: 'e14', day: 3, owner: 'lucile',  start: 14.0, end: 15.0,  title: 'Chloé BERTRAND',  prospect: 'Chloé BERTRAND', prospectRole: 'VP Conseil', type: 'Démo',     company: 'Junior IÉSEG',           channel: 'LinkedIn', status: 'pending',   meeting: 'zoom', wa: false, pipelineStage: 'Démo',          lastAction: 'En attente de confirmation' },
  { id: 'e15', day: 3, owner: 'me',      start: 16.5, end: 17.25, title: 'Jules ROUSSEAU',  prospect: 'Jules ROUSSEAU', prospectRole: 'Trésorier', type: null,       company: 'JE Polytechnique',       channel: 'WhatsApp', status: 'confirmed', meeting: 'meet', wa: true, pipelineStage: 'Qualification', lastAction: 'Confirmé via WhatsApp' },

  // Friday
  { id: 'e16', day: 4, owner: 'me',      start: 10.0, end: 11.0,  title: 'Andoxa Review hebdo', prospect: null,         type: 'Interne',     company: 'Équipe Andoxa',          channel: 'Andoxa',   status: 'internal',  meeting: 'meet', wa: false, pipelineStage: null,             lastAction: 'Revue de pipeline' },
  { id: 'e17', day: 4, owner: 'sarah',   start: 14.0, end: 14.75, title: 'Manon GIRARD',    prospect: 'Manon GIRARD', prospectRole: 'Présidente', type: null,        company: 'JE Skema',               channel: 'LinkedIn', status: 'confirmed', meeting: 'zoom', wa: true,  pipelineStage: 'Discovery',     lastAction: 'Booking via lien public' },
];

// Prospect activity (used in EventPanel)
const PROSPECT_ACTIVITY = {
  default: [
    { label: 'Premier échange',   date: '4 nov. 2025' },
    { label: 'Booking lien public', date: '20 avr. 2026' },
    { label: 'Rappel J-1 WhatsApp', date: 'Hier 18:02' },
  ],
};

// Helpers
function initials(name) {
  if (!name) return '··';
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

const PASTEL_AVATARS = ['#E0E7FF','#FCE7F3','#FEF3C7','#D1FAE5','#E0F2FE','#FFE4E6','#EDE9FE','#FFEDD5'];
function avatarColor(name) {
  if (!name) return '#E2E8F0';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PASTEL_AVATARS[h % PASTEL_AVATARS.length];
}

const STATUS_TOKENS = {
  confirmed: { label: 'Confirmé',   pillBg: '#E8F0FD', pillText: '#0052D9' },
  done:      { label: 'Réalisé',    pillBg: '#D1FAE5', pillText: '#047857' },
  pending:   { label: 'En attente', pillBg: '#FEF3C7', pillText: '#92400E' },
  noshow:    { label: 'No-show',    pillBg: '#FEE2E2', pillText: '#B91C1C' },
  internal:  { label: 'Interne',    pillBg: '#F1F5F9', pillText: '#334155' },
};

function fmtTime(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

Object.assign(window, {
  NOW, WEEK_DAYS, EVENTS, TEAM, TEAM_BY_ID, EXT_CALS, TYPES,
  STATUS_TOKENS, PROSPECT_ACTIVITY,
  initials, avatarColor, fmtTime,
});
