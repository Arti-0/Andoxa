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
  title: "Andoxa vs La Growth Machine : automatisation multicanale ou tout-en-un",
  description:
    "La Growth Machine automatise le multicanal (LinkedIn, email, X, notes vocales) et se branche sur votre CRM. Andoxa réunit LinkedIn, téléphone, inbox, booking, calendrier et CRM dans un seul outil, conversation à la main.",
  openGraph: {
    title: "Andoxa vs La Growth Machine",
    description:
      "Automatisation multicanale vs tout-en-un LinkedIn + téléphone, conversation à la main.",
    locale: "fr_FR",
    type: "website",
  },
};

const INTRO =
  "La Growth Machine automatise le multicanal (LinkedIn, email, X, notes vocales) et se branche sur votre CRM. Andoxa réunit LinkedIn, le téléphone, l'inbox, le booking, le calendrier et le CRM dans un seul outil, la conversation restant pilotée à la main. Deux philosophies : automatiser au maximum sur plusieurs canaux, ou centraliser tout le cycle commercial.";

const ROWS: ComparisonRow[] = [
  { label: "Campagnes LinkedIn (invitation + message)", andoxa: true, competitor: true },
  { label: "Séquences automatisées multi-étapes", andoxa: false, competitor: true },
  { label: "Cold email", andoxa: false, competitor: true },
  { label: "Base de données de leads", andoxa: "Via LinkedIn", competitor: "Enrichissement (crédits)" },
  { label: "Prospection téléphonique (sessions dédiées)", andoxa: true, competitor: "Notes vocales, étape appel" },
  { label: "Inbox unifiée", andoxa: true, competitor: true },
  { label: "Lien de réservation / booking", andoxa: true, competitor: false },
  { label: "Calendrier intégré + synchro Google", andoxa: true, competitor: false },
  { label: "CRM / pipeline intégré", andoxa: true, competitor: "Via CRM externe" },
  { label: "Conversation pilotée à la main", andoxa: "À la main", competitor: "Automatisée" },
  { label: "Intégrations CRM externes", andoxa: "Export CSV", competitor: true },
];

const PRICE: PriceComparison = {
  scopeNote:
    "On ne compare pas le prix d'entrée, mais le coût réel à périmètre Andoxa, booking, calendrier et CRM compris.",
  andoxa: {
    price: "45 €",
    unit: "/utilisateur/mois",
    billing: "Facturation mensuelle",
    includes:
      "Tout compris : campagnes LinkedIn, téléphone, inbox, booking, calendrier et CRM. Aucun add-on.",
  },
  competitor: {
    price: "dès 60 €",
    unit: "/identité/mois",
    tag: "facturé par identité",
    breakdown: "LinkedIn + email ; ~120 € avec les appels",
    missing: "Sans booking, sans calendrier, sans CRM (à ajouter séparément).",
  },
  note: "La Growth Machine automatise davantage (email, X, notes vocales). Mais à périmètre Andoxa (booking, calendrier et CRM inclus), il faut ajouter ces outils par-dessus, et le prix par identité grimpe vite.",
  disclaimer:
    "Tarifs indicatifs constatés début 2026, hors options, à vérifier sur le site de La Growth Machine. Les prix évoluent. Sans conversion de devises.",
};

const CHOOSE_LGM = [
  "Vous voulez l'automatisation multicanale la plus aboutie et un sequence builder avancé.",
  "Vous avez déjà un CRM où tout remonte.",
];

const CHOOSE_ANDOXA = [
  "Vous voulez LinkedIn + téléphone, à la main.",
  "Vous voulez tout au même endroit, sans repartir vers un CRM externe.",
];

export default function AndoxaVsLaGrowthMachinePage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <ComparisonPage
          competitor="La Growth Machine"
          competitorLogo="/logos/lgm.jpeg"
          intro={INTRO}
          rows={ROWS}
          priceComparison={PRICE}
          chooseCompetitor={CHOOSE_LGM}
          chooseAndoxa={CHOOSE_ANDOXA}
        />
      </main>
      <Footer />
    </>
  );
}
