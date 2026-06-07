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
  title: "Andoxa vs Waalaxy : deux approches de la prospection",
  description:
    "Waalaxy automatise la prospection LinkedIn et email et se connecte à votre CRM. Andoxa réunit LinkedIn, téléphone, inbox, booking, calendrier et CRM dans un seul outil, conversation à la main.",
  openGraph: {
    title: "Andoxa vs Waalaxy",
    description:
      "Automatisation de la prospection LinkedIn vs tout-en-un LinkedIn + téléphone, conversation à la main.",
    locale: "fr_FR",
    type: "website",
  },
};

const INTRO =
  "Waalaxy automatise la prospection LinkedIn (et l'email) à grande échelle, avec une grosse communauté et une connexion à votre CRM. Andoxa réunit LinkedIn, le téléphone, l'inbox, le booking, le calendrier et le CRM dans un seul outil, la conversation restant pilotée à la main. Deux philosophies : automatiser l'envoi au volume, ou centraliser tout le cycle commercial.";

const ROWS: ComparisonRow[] = [
  { label: "Campagnes LinkedIn (invitation + message)", andoxa: true, competitor: true },
  { label: "Séquences automatisées multi-étapes", andoxa: false, competitor: true },
  { label: "Cold email", andoxa: false, competitor: true },
  { label: "Base de données de leads", andoxa: "Via LinkedIn", competitor: "Partiel (recherche d'emails)" },
  { label: "Prospection téléphonique (sessions d'appels dédiées)", andoxa: true, competitor: false },
  { label: "Inbox unifiée", andoxa: true, competitor: true },
  { label: "Lien de réservation / booking", andoxa: true, competitor: false },
  { label: "Calendrier intégré + synchro Google", andoxa: true, competitor: false },
  { label: "CRM / pipeline intégré", andoxa: true, competitor: "Via CRM externe" },
  { label: "Conversation pilotée à la main", andoxa: "À la main", competitor: "Automatisée" },
  { label: "Intégrations CRM externes (HubSpot, Pipedrive)", andoxa: "Export CSV", competitor: true },
];

const CHOOSE_WAALAXY = [
  "Vous voulez un maximum d'automatisation LinkedIn et email, au volume.",
  "Vous avez déjà un CRM et voulez y connecter votre prospection.",
  "La taille de la communauté et l'écosystème comptent pour vous.",
];

const CHOOSE_ANDOXA = [
  "Vous voulez tout le cycle (prospect, conversation, RDV, pipeline) au même endroit.",
  "Le téléphone fait partie de votre prospection.",
  "Vous préférez le minimum d'automatisation pour protéger votre compte LinkedIn.",
];

const PRICE: PriceComparison = {
  scopeNote:
    "On ne compare pas le prix d'entrée, mais le coût réel à limites LinkedIn comparables, inbox comprise.",
  andoxa: {
    price: "45 €",
    unit: "/utilisateur/mois",
    billing: "Facturation mensuelle",
    includes:
      "Tout compris : campagnes LinkedIn, téléphone, inbox, booking, calendrier et CRM. Aucun add-on.",
  },
  competitor: {
    price: "~119 €",
    unit: "/utilisateur/mois",
    tag: "volume comparable + inbox",
    breakdown: "≈ 99 € (volume LinkedIn comparable) + 20 € pour l'add-on inbox",
    missing: "Sans booking, sans calendrier, sans CRM (à ajouter séparément).",
  },
  note: "Waalaxy démarre à 19 €/mois pour un usage LinkedIn léger ; à volume et périmètre équivalents, inbox comprise, le coût réel monte autour de 119 €/mois.",
  disclaimer:
    "Tarifs indicatifs constatés début 2026, hors options, à vérifier sur le site de Waalaxy. Les prix évoluent. Comparaison à volume LinkedIn comparable, sans conversion de devises.",
};

export default function AndoxaVsWaalaxyPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <ComparisonPage
          competitor="Waalaxy"
          competitorLogo="/logos/waalaxy.png"
          intro={INTRO}
          rows={ROWS}
          priceComparison={PRICE}
          chooseCompetitor={CHOOSE_WAALAXY}
          chooseAndoxa={CHOOSE_ANDOXA}
        />
      </main>
      <Footer />
    </>
  );
}
