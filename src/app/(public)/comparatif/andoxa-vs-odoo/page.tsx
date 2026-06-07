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
  title: "Andoxa vs Odoo : suite de gestion complète ou prospection ciblée",
  description:
    "Odoo est une suite de gestion complète (CRM, compta, stock, RH) dont le CRM est gratuit en One App Free. Andoxa est ciblé : la prospection LinkedIn et téléphone jusqu'au pipeline, prête à l'emploi.",
  openGraph: {
    title: "Andoxa vs Odoo",
    description: "Suite de gestion complète vs prospection LinkedIn + téléphone ciblée, prête à l'emploi.",
    locale: "fr_FR",
    type: "website",
  },
};

const INTRO =
  "Odoo est une suite de gestion complète (CRM, compta, stock, RH) dont le CRM est gratuit en One App Free. Andoxa est ciblé : la prospection LinkedIn + téléphone jusqu'au pipeline, prête à l'emploi. Ce sont deux catégories différentes.";

const ROWS: ComparisonRow[] = [
  { label: "Campagnes LinkedIn natives", andoxa: true, competitor: false },
  { label: "Sessions d'appels téléphoniques", andoxa: true, competitor: false },
  { label: "Inbox LinkedIn", andoxa: true, competitor: false },
  { label: "Booking / RDV", andoxa: true, competitor: "Via module" },
  { label: "Pipeline / CRM", andoxa: "Prêt, ciblé prospection", competitor: "Oui (module CRM)" },
  { label: "Suite de gestion complète (compta, stock, RH)", andoxa: false, competitor: true },
  { label: "CRM gratuit pour démarrer", andoxa: "Essai 14 jours", competitor: "Oui (One App Free)" },
  { label: "Déploiement", andoxa: "Prêt à l'emploi", competitor: "Lourd (implémentation)" },
  { label: "Prêt pour la prospection LinkedIn", andoxa: true, competitor: false },
];

const PRICE: PriceComparison = {
  title: "Deux catégories, deux tarifs.",
  scopeNote:
    "Odoo est une suite de gestion complète, Andoxa un outil de prospection ciblé : regardez ce que vous payez, pour quoi.",
  andoxa: {
    price: "45 €",
    unit: "/utilisateur/mois",
    billing: "Facturation mensuelle",
    includes:
      "Tout compris : campagnes LinkedIn, téléphone, inbox, booking, calendrier et CRM. Aucun add-on.",
  },
  competitor: {
    price: "Gratuit",
    unit: " (CRM seul, One App Free)",
    tag: "suite payante",
    breakdown: "Suite complète dès ~17 à 25 $/utilisateur",
    missing: "Sans prospection LinkedIn/téléphone ; déploiement lourd.",
  },
  note: "Odoo est une suite de gestion complète avec un CRM gratuit pour démarrer. Andoxa est ciblé : la prospection LinkedIn + téléphone, prête à l'emploi, sans déployer un ERP.",
  disclaimer:
    "Tarifs indicatifs constatés début 2026, hors options, à vérifier sur le site d'Odoo. Les prix évoluent. Sans conversion de devises.",
};

const CHOOSE_ODOO = [
  "Vous voulez une suite de gestion complète et un CRM gratuit pour démarrer.",
  "Vous gérez compta, stock et RH au même endroit.",
];

const CHOOSE_ANDOXA = [
  "Vous voulez la prospection LinkedIn + téléphone exécutée nativement, prête à l'emploi.",
  "Sans déployer un ERP.",
];

export default function AndoxaVsOdooPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <ComparisonPage
          competitor="Odoo"
          competitorLogo="/logos/odoo.svg"
          positioning="Une suite de gestion complète, ou un outil de prospection ciblé."
          intro={INTRO}
          rows={ROWS}
          priceComparison={PRICE}
          chooseCompetitor={CHOOSE_ODOO}
          chooseAndoxa={CHOOSE_ANDOXA}
        />
      </main>
      <Footer />
    </>
  );
}
