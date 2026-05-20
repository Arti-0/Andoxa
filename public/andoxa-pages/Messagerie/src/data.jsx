// Pastel/desaturated stage palette — max 4 semantics visible
const STAGES = {
  contacted:  { label: 'Contacté',     bg: '#F1F5F9', fg: '#475569', dot: '#94A3B8' },
  replied:    { label: 'Répondu',      bg: '#EEF4FE', fg: '#1A53B8', dot: '#3B82F6' },
  interested: { label: 'Intéressé',    bg: '#FEF7E6', fg: '#92590E', dot: '#D97706' },
  meeting:    { label: 'RDV confirmé', bg: '#ECFDF5', fg: '#15803D', dot: '#10B981' },
  proposal:   { label: 'Proposition',  bg: '#F5F3FF', fg: '#5B21B6', dot: '#8B5CF6' },
  closing:    { label: 'Closing',      bg: '#EEF4FE', fg: '#1E3A8A', dot: '#0052D9' },
  noshow:     { label: 'No-show',      bg: '#FEF2F2', fg: '#B91C1C', dot: '#EF4444' },
};

const PIPELINE_ORDER = ['contacted', 'replied', 'meeting', 'proposal', 'closing'];

const INITIALS = (name) => name.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
const HUE = (name) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

const CONVERSATIONS = [
  {
    id: 'andreas', name: 'Andréas BODIN', role: 'Co-fondateur & CEO', company: 'Andoxa',
    channel: 'li', stage: 'proposal',
    lastMessage: "Avec plaisir Sebastian, je regarde la proposition aujourd'hui.",
    lastTime: 'ven. 10 avr', unread: 0, silentDays: 0, pinned: true,
    workflow: { name: 'Parcours Classique', step: 4, total: 5, nextLabel: 'Relance proposition' },
    timeline: [
      { kind: 'invite',         label: 'Invitation envoyée',    date: '18 juil.' },
      { kind: 'accept',         label: 'Invitation acceptée',   date: '22 oct.' },
      { kind: 'reply',          label: 'Premier échange',       date: '4 nov.' },
      { kind: 'meeting-booked', label: 'RDV booké (10 min)',    date: '6 nov.' },
      { kind: 'proposal',       label: 'Proposition envoyée',   date: '9 avr.' },
    ],
  },
  {
    id: 'lucile', name: 'Lucile MERCIER', role: 'Présidente', company: 'JE Sciences Po',
    channel: 'wa', stage: 'meeting',
    lastMessage: 'Parfait, on confirme demain 14h. À très vite !',
    lastTime: '11:42', unread: 2, silentDays: 0,
    workflow: { name: 'Pré-RDV intensif', step: 4, total: 5, nextLabel: 'Rappel RDV J-1' },
  },
  {
    id: 'malik', name: 'Malik BENSAÏD', role: 'VP Sales', company: 'Helio Scale-up',
    channel: 'li', stage: 'interested',
    lastMessage: "Ça m'intéresse. Vous avez 20 min cette semaine ?",
    lastTime: '09:18', unread: 1, silentDays: 0,
    workflow: { name: 'Outbound senior', step: 3, total: 6, nextLabel: 'Envoyer lien Calendly' },
  },
  {
    id: 'clara', name: 'Clara DUMONT', role: 'VP Growth', company: 'Junior ESCP',
    channel: 'li', stage: 'replied',
    lastMessage: 'Merci pour le contexte. Pouvez-vous m\'envoyer un cas client SaaS B2B ?',
    lastTime: 'hier', unread: 0, silentDays: 0,
    workflow: { name: 'Parcours Classique', step: 2, total: 5, nextLabel: 'Envoi cas client' },
  },
  {
    id: 'thomas', name: 'Thomas LEROY', role: 'Head of BizDev', company: 'Pyxis Studio',
    channel: 'wa', stage: 'noshow',
    lastMessage: 'Pas vu en visio. Tout va bien ?',
    lastTime: 'lun.', unread: 0, silentDays: 4,
    workflow: { name: 'Récupération no-show', step: 1, total: 3, nextLabel: 'Relance no-show' },
  },
  {
    id: 'aisha', name: 'Aïsha NDIAYE', role: 'Co-présidente', company: 'JE Centrale',
    channel: 'li', stage: 'contacted',
    lastMessage: '« Bonjour Aïsha, je voulais vous présenter Andoxa… »',
    lastTime: '17 mar', unread: 0, silentDays: 18,
    workflow: { name: 'Parcours Classique', step: 1, total: 5, nextLabel: 'Relance courte' },
  },
  {
    id: 'paul', name: 'Paul CHEVALIER', role: 'Trésorier', company: 'JE Insa Lyon',
    channel: 'li', stage: 'replied',
    lastMessage: 'Je transmets en interne, je reviens d\'ici fin de semaine.',
    lastTime: '2 avr', unread: 0, silentDays: 6,
    workflow: { name: 'Parcours Classique', step: 3, total: 5, nextLabel: 'Relance intermédiaire' },
  },
  {
    id: 'noemie', name: 'Noémie FAURE', role: 'Responsable Co.', company: 'JE HEC',
    channel: 'wa', stage: 'closing',
    lastMessage: 'Tout est signé côté juridique, on peut lancer dès lundi 🚀',
    lastTime: '08:04', unread: 0, silentDays: 0,
    workflow: { name: 'Onboarding client', step: 5, total: 5, nextLabel: 'Kickoff lundi' },
  },
];

const THREAD_ANDREAS = [
  { kind: 'date', label: '18 juillet' },
  { kind: 'msg', dir: 'out', time: '18:43', via: 'li',
    text: "Salut Andréas 👋  J'espère que tout va bien. Je te recontacte car tu avais répondu cet été à un petit questionnaire au sujet d'Andoxa, la solution qu'on développe pour simplifier et automatiser le développement commercial des Junior-Entreprises." },
  { kind: 'msg', dir: 'out', time: '18:44', via: 'li',
    text: "On a bien avancé depuis, et on démarre la phase de test avec quelques JE partenaires pour co-construire les derniers ajustements. Est-ce que tu serais partant pour qu'on échange 20–30 min cette semaine ou la prochaine ?",
    linkPreview: { title: 'Calendly · Andréas Bodin — 30 min', url: 'calendly.com/andoxa/30min', desc: 'Prends un créneau qui t\'arrange. Aucun engagement.', favicon: '#0052D9' } },
  { kind: 'date', label: '22 octobre' },
  { kind: 'msg', dir: 'in', time: '14:39',
    text: "Salut, oui ça m'intéresse. Tu peux me préciser comment Andoxa peut concrètement nous faire gagner du temps sur la gestion commerciale ?" },
  { kind: 'date', label: '4 novembre' },
  { kind: 'msg', dir: 'out', time: '10:11', via: 'li',
    text: "Salut Andréas. Je suis Co-fondateur et CEO d'Andoxa, une plateforme qu'on développe pour automatiser la prospection et l'enrichissement des leads des Junior-Entreprises. On lance actuellement une phase pilote avec quelques JEs pour co-construire la solution et recueillir leurs retours avant le lancement officiel. Est-ce que ça t'intéresserait d'en faire partie ? Accès gratuit, accompagnement personnalisé, et ton feedback influence directement le produit.",
    signature: '— Sebastian, Co-fondateur & CEO d\'Andoxa' },
  { kind: 'msg', dir: 'out', time: '19:40', via: 'li',
    linkPreview: { title: 'andoxa.fr', url: 'andoxa.fr', desc: 'Le moteur de croissance pour les équipes commerciales modernes.', favicon: '#0052D9' } },
  { kind: 'msg', dir: 'in', time: '19:42',
    text: "Ok intéressé, je regarde et je reviens vers toi rapidement." },
  { kind: 'date', label: '4 novembre — soir' },
  { kind: 'msg', dir: 'out', time: '22:18',
    text: "Salut Andréas. Merci encore pour notre échange, c'était un vrai plaisir de discuter avec toi ! Comme convenu, voici le récap de la phase de test pour Andoxa.",
    bullets: [
      "Accès complet et gratuit à la plateforme pendant 4 semaines.",
      "Onboarding personnalisé (30 min) pour bien prendre en main l'outil.",
      "Retour de suivi chaque semaine pour améliorer Andoxa.",
      "Support prioritaire pendant toute la période.",
    ] },
  { kind: 'auto', time: '22:19', via: 'wa',
    text: "Rappel automatique envoyé : confirmation du rendez-vous J-1 via WhatsApp." },
  { kind: 'date', label: "Aujourd'hui" },
  { kind: 'msg', dir: 'in', time: '08:52',
    text: "Avec plaisir Sebastian, je regarde la proposition aujourd'hui et je reviens vers toi d'ici ce soir 🙏" },
];

window.AndoxaData = { CONVERSATIONS, THREAD_ANDREAS, STAGES, PIPELINE_ORDER, INITIALS, HUE };
