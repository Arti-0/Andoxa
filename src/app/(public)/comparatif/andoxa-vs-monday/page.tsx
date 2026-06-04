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
  title: "Andoxa vs Monday : work OS à configurer ou prospection prête à l'emploi",
  description:
    "Monday est un work OS flexible où vous construisez votre CRM et vos process. Andoxa est un outil de prospection LinkedIn et téléphone prêt à l'emploi. Catégories différentes : voici quand choisir l'un ou l'autre.",
  openGraph: {
    title: "Andoxa vs Monday",
    description: "Work OS flexible à configurer vs prospection LinkedIn + téléphone prête à l'emploi.",
    locale: "fr_FR",
    type: "website",
  },
};

const INTRO =
  "Monday est un work OS flexible où vous construisez votre CRM et vos process. Andoxa est un outil de prospection LinkedIn + téléphone prêt à l'emploi, pas un CRM à construire. Ce sont deux catégories différentes.";

const ROWS: ComparisonRow[] = [
  { label: "Campagnes LinkedIn natives", andoxa: true, competitor: false },
  { label: "Sessions d'appels téléphoniques", andoxa: true, competitor: false },
  { label: "Inbox LinkedIn", andoxa: true, competitor: false },
  { label: "Booking / RDV", andoxa: true, competitor: false },
  { label: "Pipeline / deals", andoxa: "Prêt à l'emploi", competitor: "À configurer" },
  { label: "Personnalisation des boards, work management", andoxa: false, competitor: "Oui (très flexible)" },
  { label: "Gestion de projet multi-équipes", andoxa: false, competitor: true },
  { label: "Prêt à l'emploi pour la prospection", andoxa: true, competitor: false },
];

const PRICE: PriceComparison = {
  title: "Deux catégories, deux tarifs.",
  scopeNote:
    "Monday est un work OS à configurer, Andoxa un outil de prospection prêt à l'emploi : regardez ce que vous payez, pour quoi.",
  andoxa: {
    price: "45 €",
    unit: "/utilisateur/mois",
    billing: "Facturation mensuelle",
    includes:
      "Tout compris : campagnes LinkedIn, téléphone, inbox, booking, calendrier et CRM. Aucun add-on.",
  },
  competitor: {
    price: "dès ~12 $",
    unit: "/siège/mois",
    tag: "minimum 3 sièges",
    breakdown: "Monday CRM, Standard ~17 $/siège",
    missing: "CRM à configurer ; pas de prospection LinkedIn/téléphone native.",
  },
  note: "Monday est plus flexible en work management. Andoxa ne se configure pas : c'est un outil de prospection LinkedIn + téléphone prêt à l'emploi.",
  disclaimer:
    "Tarifs indicatifs constatés début 2026, hors options, à vérifier sur le site de Monday. Les prix évoluent. Sans conversion de devises.",
};

const CHOOSE_MONDAY = [
  "Vous voulez un work OS flexible pour gérer projets et CRM généraliste à votre façon.",
  "Vous aimez construire et personnaliser vos process.",
];

const CHOOSE_ANDOXA = [
  "Vous voulez un outil de prospection prêt à l'emploi.",
  "Pas un CRM à construire.",
];

export default function AndoxaVsMondayPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <ComparisonPage
          competitor="Monday"
          competitorLogo="/logos/monday.svg"
          positioning="Un work OS à configurer, ou un outil de prospection prêt à l'emploi."
          intro={INTRO}
          rows={ROWS}
          priceComparison={PRICE}
          chooseCompetitor={CHOOSE_MONDAY}
          chooseAndoxa={CHOOSE_ANDOXA}
        />
      </main>
      <Footer />
    </>
  );
}
