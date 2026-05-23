// Mock data for the call session preview page.
// Mock/fixtures retained for outbound script templates (see ../../BACKEND.md).

import { applyMessageVariables } from "@/lib/messaging/template-variables";

export interface SessionProspect {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  location: string;
  headcount: string;
  sector: string;
  phone: string;
  phoneFix: string;
  linkedin: string;
  email: string;
  history: { kind: "linkedin" | "email" | "note" | "phone"; label: string; date: string; body?: string }[];
}

export const SESSION_PROSPECTS: SessionProspect[] = [
  { id: "p1", firstName: "Andréas", lastName: "BODIN", company: "Vinci Construction", jobTitle: "Directeur des Achats", location: "Paris, IDF", headcount: "5 000+", sector: "BTP / Construction", phone: "+33 6 24 18 92 47", phoneFix: "+33 1 47 16 30 00", linkedin: "https://linkedin.com/in/andreas-bodin", email: "", history: [
    { kind: "linkedin", label: "Invitation LinkedIn acceptée", date: "il y a 4j" },
    { kind: "email", label: "Téléchargement — « Réduire les coûts d'approvisionnement »", date: "il y a 7j" },
    { kind: "note", label: "Note du commercial", date: "il y a 4j", body: "A répondu positivement à l'invitation LinkedIn. A téléchargé le livre blanc la semaine dernière." },
  ] },
  { id: "p2", firstName: "Camille", lastName: "DELORME", company: "Eiffage Énergie", jobTitle: "Responsable Achats Indirects", location: "Lyon, Rhône", headcount: "10 000+", sector: "Énergie", phone: "+33 7 81 04 56 12", phoneFix: "", linkedin: "https://linkedin.com/in/camille-delorme", email: "camille.delorme@eiffage.com", history: [{ kind: "linkedin", label: "Message InMail envoyé", date: "il y a 2j" }] },
  { id: "p3", firstName: "Hakim", lastName: "BENALI", company: "Spie Batignolles", jobTitle: "Directeur Supply Chain", location: "Nanterre, IDF", headcount: "8 000+", sector: "BTP / Construction", phone: "+33 6 12 33 78 09", phoneFix: "+33 1 41 91 50 00", linkedin: "https://linkedin.com/in/hakim-benali", email: "", history: [{ kind: "linkedin", label: "Connexion établie", date: "il y a 8j" }] },
  { id: "p4", firstName: "Sophie", lastName: "NGUYEN", company: "Bouygues Bâtiment", jobTitle: "Acheteuse Senior", location: "Saint-Quentin-en-Yvelines", headcount: "12 000+", sector: "BTP / Construction", phone: "+33 6 88 27 41 03", phoneFix: "", linkedin: "https://linkedin.com/in/sophie-nguyen", email: "sophie.nguyen@bouygues.com", history: [{ kind: "linkedin", label: "Invitation envoyée", date: "il y a 5j" }] },
  { id: "p5", firstName: "Julien", lastName: "MARTINEAU", company: "Colas", jobTitle: "Responsable Achats Travaux", location: "Boulogne-Billancourt", headcount: "55 000+", sector: "BTP / Construction", phone: "+33 6 77 19 84 22", phoneFix: "+33 1 47 61 75 00", linkedin: "https://linkedin.com/in/julien-martineau", email: "", history: [{ kind: "email", label: "Email ouvert 4×", date: "hier" }] },
  { id: "p6", firstName: "Marine", lastName: "LEFEBVRE", company: "Vinci Construction", jobTitle: "Directrice Achats Régionale", location: "Bordeaux, Gironde", headcount: "5 000+", sector: "BTP / Construction", phone: "+33 6 33 90 27 81", phoneFix: "", linkedin: "", email: "", history: [] },
  { id: "p7", firstName: "Thomas", lastName: "ROUX", company: "Demathieu Bard", jobTitle: "Directeur des Opérations", location: "Metz, Moselle", headcount: "2 500+", sector: "BTP / Construction", phone: "+33 6 51 47 18 92", phoneFix: "", linkedin: "https://linkedin.com/in/thomas-roux", email: "thomas.roux@demathieu-bard.com", history: [{ kind: "linkedin", label: "A consulté votre profil", date: "il y a 6j" }] },
  { id: "p8", firstName: "Inès", lastName: "CHEVALLIER", company: "Léon Grosse", jobTitle: "Responsable Sourcing", location: "Aix-les-Bains", headcount: "2 000+", sector: "BTP / Construction", phone: "+33 7 64 21 09 55", phoneFix: "+33 4 79 35 00 00", linkedin: "https://linkedin.com/in/ines-chevallier", email: "", history: [{ kind: "phone", label: "Appel — à recontacter", date: "il y a 14j" }] },
  { id: "p9", firstName: "Romain", lastName: "PETIT", company: "Fayat Bâtiment", jobTitle: "Directeur Achats Groupe", location: "Pessac, Gironde", headcount: "21 000+", sector: "BTP / Construction", phone: "+33 6 09 88 14 73", phoneFix: "", linkedin: "https://linkedin.com/in/romain-petit", email: "romain.petit@fayat.com", history: [{ kind: "linkedin", label: "Message lu, sans réponse", date: "il y a 3j" }] },
  { id: "p10", firstName: "Élodie", lastName: "GARCIA", company: "NGE", jobTitle: "Acheteuse Travaux Publics", location: "Saint-Étienne", headcount: "15 000+", sector: "Travaux publics", phone: "+33 6 47 02 91 36", phoneFix: "", linkedin: "https://linkedin.com/in/elodie-garcia", email: "", history: [{ kind: "email", label: "Inscription webinar", date: "il y a 9j" }] },
  { id: "p11", firstName: "Mehdi", lastName: "KAHN", company: "GTM Bâtiment", jobTitle: "Directeur Achats Île-de-France", location: "Nanterre, IDF", headcount: "6 000+", sector: "BTP / Construction", phone: "+33 6 28 57 31 49", phoneFix: "", linkedin: "https://linkedin.com/in/mehdi-kahn", email: "mehdi.kahn@gtm.fr", history: [{ kind: "email", label: "Demande de démo", date: "il y a 3j" }] },
  { id: "p12", firstName: "Lucie", lastName: "BOUCHER", company: "Sogea Construction", jobTitle: "Acheteuse Indirecte", location: "Saint-Herblain", headcount: "4 000+", sector: "BTP / Construction", phone: "+33 7 12 09 84 27", phoneFix: "", linkedin: "", email: "", history: [] },
];

export interface Outcome {
  id: string;
  label: string;
  color: string;
  shortcut: string;
}

export const OUTCOMES: Outcome[] = [
  { id: "rdv", label: "RDV pris", color: "#5B2EBF", shortcut: "R" },
  { id: "callback", label: "À rappeler", color: "#D97706", shortcut: "A" },
  { id: "noanswer", label: "Pas de réponse", color: "#6B7280", shortcut: "P" },
  { id: "wrong", label: "Mauvais numéro", color: "#DC2626", shortcut: "M" },
  { id: "refused", label: "Refus", color: "#991B1B", shortcut: "F" },
];

export const SESSION_META = {
  id: "session-2026-05-06",
  campaign: "Outbound — Achats BTP Q2",
  goal: 12,
  startedAt: "2026-05-06T14:00:00",
  agent: { name: "Sebastian Bodin", initials: "SB" },
};

export const DEFAULT_SCRIPT = `Bonjour {{firstName}}, c'est Sebastian d'Andoxa.

Je me permets de vous appeler car vous êtes {{jobTitle}} chez {{company}}, et nous accompagnons des directions achats du BTP à réduire les coûts d'approvisionnement de 15 à 20% en moyenne.

J'ai 2 questions rapides :
- Comment gérez-vous aujourd'hui vos appels d'offres fournisseurs ?
- Quel est votre principal frein sur les achats actuellement ?

L'idée serait de voir en 20 minutes si on peut vous apporter de la valeur concrètement. Auriez-vous un créneau cette semaine ou la semaine prochaine ?

Voici mon lien si besoin : {{bookingLink}}`;

export function interpolateScript(template: string, p: SessionProspect): string {
  if (!template) return "";
  return applyMessageVariables(
    template,
    {
      full_name: [p.firstName, p.lastName].filter(Boolean).join(" ") || null,
      company: p.company || null,
      job_title: p.jobTitle || null,
      phone: p.phone || null,
      email: p.email || null,
    },
    { bookingLink: "andoxa.com/sebastian-bodin" }
  );
}
