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
  title: "Andoxa vs Phantombuster : prêt à l'emploi ou boîte à outils de scraping",
  description:
    "Phantombuster est une boîte à outils d'automatisation et de scraping multi-plateformes, no-code mais technique. Andoxa est un outil prêt à l'emploi de prospection LinkedIn et téléphone jusqu'au pipeline, sans scraping.",
  openGraph: {
    title: "Andoxa vs Phantombuster",
    description:
      "Boîte à outils de scraping et d'automatisation vs prospection LinkedIn + téléphone prête à l'emploi.",
    locale: "fr_FR",
    type: "website",
  },
};

const INTRO =
  "Phantombuster est une boîte à outils d'automatisation et de scraping multi-plateformes, no-code mais technique. Andoxa est un outil prêt à l'emploi de prospection LinkedIn et téléphone jusqu'au pipeline, sans scraping. Deux usages différents : monter ses propres automatisations, ou un outil de prospection clé en main.";

const ROWS: ComparisonRow[] = [
  { label: "Campagnes LinkedIn (invitation + message)", andoxa: true, competitor: "Via Phantoms à configurer" },
  { label: "Séquences automatisées multi-étapes", andoxa: false, competitor: "Oui (Flows)" },
  { label: "Scraping et extraction multi-plateformes (Instagram, X, Maps)", andoxa: false, competitor: true },
  { label: "Base de données de leads", andoxa: "Via LinkedIn", competitor: "Scraping + email finder (crédits)" },
  { label: "Cold email", andoxa: false, competitor: "Email finder, pas d'envoi" },
  { label: "Prospection téléphonique", andoxa: true, competitor: false },
  { label: "Inbox unifiée", andoxa: true, competitor: false },
  { label: "Lien de réservation / booking", andoxa: true, competitor: false },
  { label: "Calendrier intégré + synchro Google", andoxa: true, competitor: false },
  { label: "CRM / pipeline intégré", andoxa: true, competitor: false },
  { label: "Prêt à l'emploi, sans config technique", andoxa: true, competitor: "Non (courbe raide)" },
  { label: "Sans scraping, dans les CGU LinkedIn", andoxa: true, competitor: "Non (scraping, risque de restriction)" },
  { label: "Conversation pilotée à la main", andoxa: "À la main", competitor: "Automatisé" },
];

const PRICE: PriceComparison = {
  title: "Deux modèles différents.",
  scopeNote: "Modèles de prix différents : on ne force pas un duel par siège.",
  andoxa: {
    price: "45 €",
    unit: "/utilisateur/mois",
    billing: "Facturation mensuelle",
    includes:
      "Abonnement tout compris : campagnes LinkedIn, téléphone, inbox, booking, calendrier et CRM.",
  },
  competitor: {
    price: "69 à 439 $",
    unit: "/mois",
    tag: "boîte à outils, selon exécution",
    breakdown: "Selon le temps d'exécution et les crédits",
    missing: "Automatisation et scraping ; sans booking, calendrier ni CRM.",
  },
  note: "Phantombuster fait des choses qu'Andoxa ne fait pas (scraping, multi-plateformes). Andoxa ne se compare pas sur le scraping : il gère la prospection LinkedIn + téléphone jusqu'au pipeline, prêt à l'emploi.",
  disclaimer:
    "Tarifs indicatifs constatés début 2026, hors options, à vérifier sur le site de Phantombuster. Les prix évoluent. Modèles différents, sans conversion de devises.",
};

const CHOOSE_PHANTOMBUSTER = [
  "Vous voulez une boîte à outils de scraping et d'automatisation multi-plateformes.",
  "Vous avez le temps technique de la monter et de la maintenir.",
];

const CHOOSE_ANDOXA = [
  "Vous voulez un outil prêt à l'emploi, sans scraping ni montage.",
  "Vous voulez LinkedIn + téléphone jusqu'au pipeline, au même endroit.",
];

export default function AndoxaVsPhantombusterPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <ComparisonPage
          competitor="Phantombuster"
          competitorLogo="/logos/phantombuster.svg"
          positioning="Deux outils pour deux usages. Voici lequel est fait pour vous."
          intro={INTRO}
          rows={ROWS}
          priceComparison={PRICE}
          chooseCompetitor={CHOOSE_PHANTOMBUSTER}
          chooseAndoxa={CHOOSE_ANDOXA}
        />
      </main>
      <Footer />
    </>
  );
}
