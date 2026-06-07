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
  title: "Andoxa vs Lemlist : cold email ou tout-en-un LinkedIn + téléphone",
  description:
    "Lemlist est une plateforme d'outreach centrée cold email, avec séquences et base de leads. Andoxa ne fait pas de cold email : LinkedIn + téléphone, conversation à la main, booking, calendrier et CRM intégrés.",
  openGraph: {
    title: "Andoxa vs Lemlist",
    description:
      "Cold email et séquences automatisées vs LinkedIn + téléphone, conversation à la main, tout-en-un.",
    locale: "fr_FR",
    type: "website",
  },
};

const INTRO =
  "Lemlist est une plateforme d'outreach multicanale centrée sur le cold email (email, étapes LinkedIn, appels), avec une base de leads et un vrai soin sur la délivrabilité. Andoxa ne fait pas de cold email : il couvre LinkedIn et le téléphone, la conversation à la main, et inclut le booking, le calendrier et le CRM. Deux moteurs : le cold email au volume, ou LinkedIn + téléphone tout-en-un.";

const ROWS: ComparisonRow[] = [
  { label: "Campagnes LinkedIn (invitation + message)", andoxa: true, competitor: true },
  { label: "Séquences automatisées multi-étapes", andoxa: false, competitor: true },
  { label: "Cold email", andoxa: false, competitor: true },
  { label: "Base de données de leads", andoxa: "Via LinkedIn", competitor: true },
  { label: "Prospection téléphonique (sessions d'appels dédiées)", andoxa: true, competitor: "Partiel (étapes d'appel)" },
  { label: "Inbox unifiée", andoxa: true, competitor: true },
  { label: "Lien de réservation / booking", andoxa: true, competitor: "Via Calendly" },
  { label: "Calendrier intégré + synchro Google", andoxa: true, competitor: false },
  { label: "CRM / pipeline intégré", andoxa: true, competitor: "Intégrations CRM" },
  { label: "Conversation pilotée à la main", andoxa: "À la main", competitor: "Automatisée" },
  { label: "Intégrations CRM externes (HubSpot, Pipedrive)", andoxa: "Export CSV", competitor: true },
];

const CHOOSE_LEMLIST = [
  "Votre moteur, c'est le cold email au volume, avec des séquences multi-étapes.",
  "Vous avez besoin d'une base de leads et d'un soin particulier sur la délivrabilité.",
  "Vous orchestrez plusieurs canaux dans une même séquence automatisée.",
];

const CHOOSE_ANDOXA = [
  "Votre moteur, c'est LinkedIn + téléphone, sans cold email.",
  "Vous voulez une conversation humaine, pas des séquences automatiques.",
  "Vous voulez prospects, RDV et pipeline dans un seul outil.",
];

const PRICE: PriceComparison = {
  scopeNote:
    "Lemlist et Andoxa ne couvrent pas le même périmètre : comparez le coût par siège, en gardant en tête que Lemlist apporte le cold email, et Andoxa le booking, le calendrier et le CRM.",
  andoxa: {
    price: "45 €",
    unit: "/utilisateur/mois",
    billing: "Facturation mensuelle",
    includes:
      "Tout compris : campagnes LinkedIn, téléphone, inbox, booking, calendrier et CRM. Aucun add-on.",
  },
  competitor: {
    price: "~109 €",
    unit: "/utilisateur/mois",
    tag: "plan multicanal mensuel",
    breakdown: "Cold email + étapes LinkedIn + base de leads",
    missing: "Sans booking, sans calendrier, sans CRM / pipeline intégré.",
  },
  note: "Lemlist se paie au siège ; son plan multicanal tourne autour de 109 €/utilisateur/mois. Andoxa ne fait pas de cold email, mais inclut booking, calendrier et CRM dans son tarif.",
  disclaimer:
    "Tarifs indicatifs constatés début 2026, hors options, à vérifier sur le site de Lemlist. Les prix évoluent. Périmètres différents, sans conversion de devises.",
};

export default function AndoxaVsLemlistPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <ComparisonPage
          competitor="Lemlist"
          competitorLogo="/logos/Lemlist.svg"
          intro={INTRO}
          rows={ROWS}
          priceComparison={PRICE}
          chooseCompetitor={CHOOSE_LEMLIST}
          chooseAndoxa={CHOOSE_ANDOXA}
        />
      </main>
      <Footer />
    </>
  );
}
