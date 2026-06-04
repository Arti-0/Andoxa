import type { Metadata } from "next";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import {
  ComparisonPage,
  type ComparisonRow,
  type PriceComparison,
} from "@/components/marketing/comparison/comparison-page";

export const metadata: Metadata = {
  title: "Andoxa vs Calendly : scheduling pur ou booking dans un outil de prospection",
  description:
    "Calendly est le meilleur sur le scheduling pur. Andoxa intègre le booking dans un outil qui gère aussi LinkedIn, le téléphone, l'inbox et le pipeline. Catégories différentes : voici quand choisir l'un ou l'autre.",
  openGraph: {
    title: "Andoxa vs Calendly",
    description: "Scheduling pur vs booking intégré dans un outil de prospection complet.",
    locale: "fr_FR",
    type: "website",
  },
};

const INTRO =
  "Calendly est le meilleur sur le scheduling pur (plus de types de RDV, de routing et d'intégrations). Andoxa intègre le booking dans un outil qui gère aussi LinkedIn, le téléphone, l'inbox et le pipeline. Ce sont deux catégories différentes.";

const ROWS: ComparisonRow[] = [
  { label: "Prise de RDV / booking", andoxa: true, competitor: "Oui (son cœur)" },
  { label: "Profondeur du scheduling (types d'events, routing, intégrations)", andoxa: "Basique", competitor: "Très complet" },
  { label: "Campagnes LinkedIn", andoxa: true, competitor: false },
  { label: "Sessions d'appels téléphoniques", andoxa: true, competitor: false },
  { label: "Inbox LinkedIn", andoxa: true, competitor: false },
  { label: "Pipeline / CRM", andoxa: true, competitor: false },
  { label: "Version gratuite", andoxa: "Essai 14 jours", competitor: "Oui (limitée)" },
];

const PRICE: PriceComparison = {
  title: "Deux catégories, deux tarifs.",
  scopeNote:
    "Calendly est un outil de scheduling, Andoxa un outil de prospection complet : regardez ce que vous payez, pour quoi.",
  andoxa: {
    price: "36 €",
    unit: "/utilisateur/mois",
    billing: "Facturation annuelle",
    includes:
      "Tout compris : campagnes LinkedIn, téléphone, inbox, booking, calendrier et CRM. Aucun add-on.",
  },
  competitor: {
    price: "Gratuit",
    unit: " (limité)",
    tag: "puis par siège",
    breakdown: "10 $ Standard, 16 $ Teams /siège (annuel)",
    missing: "Scheduling seul : ni LinkedIn, ni téléphone, ni pipeline.",
  },
  note: "Calendly reste meilleur sur le scheduling pur (plus de types de RDV, de routing et d'intégrations). Andoxa intègre un booking plus simple dans un outil qui gère aussi LinkedIn, le téléphone et le pipeline.",
  disclaimer:
    "Tarifs indicatifs constatés début 2026, hors options, à vérifier sur le site de Calendly. Les prix évoluent. Sans conversion de devises.",
};

const CHOOSE_CALENDLY = [
  "Vous voulez le meilleur outil de scheduling pur, point.",
  "Vous avez besoin de types de RDV, de routing et d'intégrations avancés.",
];

const CHOOSE_ANDOXA = [
  "Vous voulez le booking intégré dans un outil de prospection complet.",
  "Pas seulement un calendrier, mais LinkedIn, téléphone, inbox et pipeline.",
];

export default function AndoxaVsCalendlyPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <ComparisonPage
          competitor="Calendly"
          competitorLogo="/logos/calendly.svg"
          positioning="Le meilleur du scheduling pur, ou le booking dans un outil de prospection complet."
          intro={INTRO}
          rows={ROWS}
          priceComparison={PRICE}
          chooseCompetitor={CHOOSE_CALENDLY}
          chooseAndoxa={CHOOSE_ANDOXA}
        />
      </main>
      <Footer />
    </>
  );
}
