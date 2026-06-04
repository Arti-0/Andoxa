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
  title: "Andoxa vs HubSpot : CRM complet ou prospection prête à l'emploi",
  description:
    "HubSpot est une plateforme CRM complète (marketing, vente, service). Andoxa exécute nativement la prospection LinkedIn et téléphone jusqu'au pipeline. Catégories différentes : voici quand choisir l'un ou l'autre.",
  openGraph: {
    title: "Andoxa vs HubSpot",
    description: "CRM complet vs prospection LinkedIn + téléphone prête à l'emploi.",
    locale: "fr_FR",
    type: "website",
  },
};

const INTRO =
  "HubSpot est une plateforme CRM complète (marketing, vente, service). Andoxa exécute nativement la prospection LinkedIn + téléphone jusqu'au pipeline. HubSpot ne fait pas de campagnes LinkedIn natives ; Andoxa n'est pas un CRM complet. Ce sont deux catégories différentes.";

const ROWS: ComparisonRow[] = [
  { label: "Campagnes LinkedIn natives (invitation + message)", andoxa: true, competitor: false },
  { label: "Sessions d'appels téléphoniques intégrées", andoxa: true, competitor: "Via module payant" },
  { label: "Inbox LinkedIn", andoxa: true, competitor: false },
  { label: "Booking / prise de RDV", andoxa: true, competitor: true },
  { label: "Pipeline commercial", andoxa: true, competitor: true },
  { label: "CRM complet (contacts, deals, reporting avancé)", andoxa: "Ciblé prospection", competitor: "Oui, très complet" },
  { label: "Marketing automation et séquences email", andoxa: false, competitor: true },
  { label: "Hub service client, CMS", andoxa: false, competitor: true },
  { label: "Version gratuite", andoxa: "Essai 14 jours", competitor: "CRM gratuit (limité)" },
  { label: "Prêt à l'emploi pour prospecter sur LinkedIn", andoxa: true, competitor: false },
];

const PRICE: PriceComparison = {
  title: "Deux catégories, deux tarifs.",
  scopeNote:
    "HubSpot est un CRM complet, Andoxa un outil de prospection prêt à l'emploi : regardez ce que vous payez, pour quoi.",
  andoxa: {
    price: "45 €",
    unit: "/utilisateur/mois",
    billing: "Facturation mensuelle",
    includes:
      "Tout compris : campagnes LinkedIn, téléphone, inbox, booking, calendrier et CRM. Aucun add-on.",
  },
  competitor: {
    price: "Gratuit",
    unit: " (CRM de base)",
    tag: "puis payant par siège",
    breakdown: "~20 $ Starter, ~90 $ Sales Pro /siège + ~1 500 $ d'onboarding",
    missing: "Sans campagnes LinkedIn ni inbox LinkedIn natives.",
  },
  note: "HubSpot est un CRM complet (marketing, vente, service). Andoxa ne le remplace pas : il exécute la prospection LinkedIn + téléphone jusqu'au pipeline, prêt à l'emploi, sans la complexité ni le coût d'une grosse plateforme.",
  disclaimer:
    "Tarifs indicatifs constatés début 2026, hors options, à vérifier sur le site de HubSpot. Les prix évoluent. Sans conversion de devises.",
};

const CHOOSE_HUBSPOT = [
  "Vous voulez un CRM complet et une plateforme marketing, vente et service tout-en-un.",
  "Vous avez besoin de marketing automation, séquences email, service client et CMS.",
];

const CHOOSE_ANDOXA = [
  "Vous voulez la prospection LinkedIn + téléphone exécutée nativement jusqu'au pipeline.",
  "Sans la complexité ni le coût d'une grosse plateforme.",
];

export default function AndoxaVsHubspotPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <ComparisonPage
          competitor="HubSpot"
          competitorLogo="/logos/hubspot.svg"
          positioning="Un CRM complet, ou un outil de prospection prêt à l'emploi. Voici lequel vous correspond."
          intro={INTRO}
          rows={ROWS}
          priceComparison={PRICE}
          chooseCompetitor={CHOOSE_HUBSPOT}
          chooseAndoxa={CHOOSE_ANDOXA}
        />
      </main>
      <Footer />
    </>
  );
}
