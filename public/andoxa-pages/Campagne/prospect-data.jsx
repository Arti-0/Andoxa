// Mock data for prospect selection (Step 1 of campaign creation wizard)

const PROSPECT_LISTS = [
  { id: 'l1', name: 'TEST WORKFLOW (3)', source: 'Sales Navigator', count: 3, withPhone: 1, author: { id: 'sb', name: 'Sebastian Bodin', initials: 'SB', color: '#0052D9' }, createdAt: '19/04/2026', highlight: true, sample: ['Andréas BODIN', 'Camille ROUSSEL', 'Mathieu LEROY'] },
  { id: 'l2', name: 'CTO SaaS Paris Q2', source: 'LinkedIn', count: 142, withPhone: 38, author: { id: 'sb', name: 'Sebastian Bodin', initials: 'SB', color: '#0052D9' }, createdAt: '14/04/2026', sample: ['Pierre Dubois', 'Marie Lambert', 'Julien Martin', 'Sophie Durand', 'Thomas Roux'] },
  { id: 'l3', name: 'Head of Sales — Fintech', source: 'Sales Navigator', count: 87, withPhone: 22, author: { id: 'sb', name: 'Sebastian Bodin', initials: 'SB', color: '#0052D9' }, createdAt: '08/04/2026', sample: ['Lucas Petit', 'Emma Bernard', 'Hugo Moreau'] },
  { id: 'l4', name: 'Leads MQL — février 2026', source: 'CRM', count: 56, withPhone: 56, author: { id: 'an', name: 'Andréas BODIN', initials: 'AB', color: '#FF6700' }, createdAt: '04/04/2026', sample: ['Léa Robert', 'Antoine Richard'] },
  { id: 'l5', name: 'VP Marketing — DACH', source: 'LinkedIn', count: 198, withPhone: 12, author: { id: 'sb', name: 'Sebastian Bodin', initials: 'SB', color: '#0052D9' }, createdAt: '01/04/2026', sample: ['Klaus Müller', 'Anna Schmidt'] },
  { id: 'l6', name: 'Comptes dormants Q1', source: 'Import CSV', count: 73, withPhone: 73, author: { id: 'ml', name: 'Marie Lambert', initials: 'ML', color: '#5B2EBF' }, createdAt: '28/03/2026', sample: ['Olivier Blanc', 'Charlotte Faure'] },
  { id: 'l7', name: 'Early users — v2 produit', source: 'CRM', count: 34, withPhone: 28, author: { id: 'sb', name: 'Sebastian Bodin', initials: 'SB', color: '#0052D9' }, createdAt: '22/03/2026', sample: ['Nicolas Garcia', 'Sarah Lefèvre'] },
  { id: 'l8', name: 'CFO scale-ups B2B', source: 'Sales Navigator', count: 220, withPhone: 45, author: { id: 'tr', name: 'Thomas Roux', initials: 'TR', color: '#0E7A3A' }, createdAt: '15/03/2026', sample: ['Romain Vincent', 'Élise Bonnet'] },
  { id: 'l9', name: 'Décideurs RH France', source: 'LinkedIn', count: 165, withPhone: 18, author: { id: 'an', name: 'Andréas BODIN', initials: 'AB', color: '#FF6700' }, createdAt: '10/03/2026', sample: ['Maxime Henry', 'Inès Roy'] },
  { id: 'l10', name: 'Founders SaaS — pre-Series A', source: 'Sales Navigator', count: 95, withPhone: 31, author: { id: 'sb', name: 'Sebastian Bodin', initials: 'SB', color: '#0052D9' }, createdAt: '05/03/2026', sample: ['Florent Aubert', 'Manon Girard'] },
];

const ALL_AUTHORS = [
  { id: 'sb', name: 'Sebastian Bodin', initials: 'SB', color: '#0052D9' },
  { id: 'an', name: 'Andréas BODIN', initials: 'AB', color: '#FF6700' },
  { id: 'ml', name: 'Marie Lambert', initials: 'ML', color: '#5B2EBF' },
  { id: 'tr', name: 'Thomas Roux', initials: 'TR', color: '#0E7A3A' },
];

const CRM_STATUSES = ['Nouveau', 'Contacté', 'Qualifié', 'RDV', 'Proposition', 'Signé', 'Perdu'];
const ALL_SOURCES = ['LinkedIn', 'Sales Navigator', 'CRM', 'Import CSV', 'Site web', 'Referral'];
const ALL_TAGS = ['Décideur', 'Tech', 'SaaS', 'Fintech', 'Scale-up', 'Series A', 'Series B', 'Enterprise', 'PME', 'France', 'Europe'];
const INDUSTRIES = ['SaaS', 'Fintech', 'E-commerce', 'Industrie', 'Conseil', 'Santé', 'Education', 'Media'];
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'];

// Generate ~50 mock prospects
const FIRST = ['Andréas','Camille','Mathieu','Pierre','Marie','Julien','Sophie','Thomas','Lucas','Emma','Hugo','Léa','Antoine','Anna','Klaus','Olivier','Charlotte','Nicolas','Sarah','Romain','Élise','Maxime','Inès','Florent','Manon','Bastien','Clara','Damien','Eva','Fabien','Gaëlle','Hervé','Iris','Jérôme','Karine','Louis','Mélanie','Noé','Océane','Paul','Quentin','Rose','Simon','Tina','Ulysse','Valentine','William','Yasmine','Zoé','Arnaud'];
const LAST = ['BODIN','ROUSSEL','LEROY','DUBOIS','LAMBERT','MARTIN','DURAND','ROUX','PETIT','BERNARD','MOREAU','ROBERT','RICHARD','MÜLLER','SCHMIDT','BLANC','FAURE','GARCIA','LEFÈVRE','VINCENT','BONNET','HENRY','ROY','AUBERT','GIRARD','MARCHAND','NICOLAS','OLIVIER','PERRIN','QUERE','ROBIN','SIMON','TANGUY','URBAIN','VIDAL','WAGNER','XAVIER','YVON','ZIMMER','AUGER','BAUDIN','CARON','DELORME','EVRARD','FONTAINE','GAUTHIER','HEBERT','IZARD','JACQUET','KLEIN'];
const COMPANIES = ['Pennylane','Spendesk','Qonto','Alan','Doctolib','Ledger','Mirakl','Aircall','PayFit','Welcome to the Jungle','Swile','Lydia','Sorare','BackMarket','Veepee','OVHcloud','Dassault','Atos','Capgemini','BlaBlaCar','Datadog','Algolia','Talend','Criteo','Contentsquare'];
const TITLES = ['CEO','CTO','Head of Sales','VP Marketing','CFO','COO','Founder','Co-fondateur','Director Sales','Sales Manager','Marketing Director','Product Manager','Head of Growth','VP Sales','CMO'];

function genProspects() {
  const out = [];
  for (let i = 0; i < 50; i++) {
    const fn = FIRST[i % FIRST.length];
    const ln = LAST[i % LAST.length];
    const company = COMPANIES[i % COMPANIES.length];
    const title = TITLES[i % TITLES.length];
    const status = CRM_STATUSES[i % CRM_STATUSES.length];
    const source = ALL_SOURCES[i % ALL_SOURCES.length];
    const industry = INDUSTRIES[i % INDUSTRIES.length];
    const size = COMPANY_SIZES[i % COMPANY_SIZES.length];
    const hasPhone = i % 3 !== 0;
    const hasEmail = i % 7 !== 0;
    const hasWA = hasPhone && i % 4 === 0;
    const inActive = i % 9 === 0;
    const tags = [ALL_TAGS[i % ALL_TAGS.length], ALL_TAGS[(i+3) % ALL_TAGS.length]];
    const lastAction = `il y a ${(i % 14) + 1}j`;
    out.push({
      id: 'p' + i, firstName: fn, lastName: ln, company, jobTitle: title,
      status, source, industry, size, hasPhone, hasEmail, hasWA, inActive,
      tags, lastAction, location: i % 2 ? 'Paris' : 'Lyon',
      initials: (fn[0] + ln[0]).toUpperCase(),
      color: ['#0052D9','#FF6700','#5B2EBF','#0E7A3A','#B91C1C'][i % 5],
    });
  }
  return out;
}
const ALL_PROSPECTS = genProspects();

window.PROSPECT_LISTS = PROSPECT_LISTS;
window.ALL_AUTHORS = ALL_AUTHORS;
window.CRM_STATUSES = CRM_STATUSES;
window.ALL_SOURCES = ALL_SOURCES;
window.ALL_TAGS = ALL_TAGS;
window.INDUSTRIES = INDUSTRIES;
window.COMPANY_SIZES = COMPANY_SIZES;
window.ALL_PROSPECTS = ALL_PROSPECTS;
