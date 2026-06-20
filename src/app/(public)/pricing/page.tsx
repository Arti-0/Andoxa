import type { Metadata } from "next";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import { MarketingPricingSection } from "@/components/marketing/sections/pricing";
import { ComparisonSection } from "@/components/marketing/pricing/comparison-section";
import { ComparisonTable } from "@/components/marketing/pricing/comparison-table";
import { PricingFaq } from "@/components/marketing/pricing/pricing-faq";
import { ReassuranceBar } from "@/components/marketing/pricing/reassurance-bar";
import { PricingCta } from "@/components/marketing/pricing/pricing-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageSchema, softwareApplicationSchema } from "@/lib/seo/structured-data";

// Plain-text mirror of the Q&A rendered by <PricingFaq>. Kept here (not in the
// component) because that component's answers are JSX; answer engines need flat
// text. Keep in sync with components/marketing/pricing/pricing-faq.tsx.
const PRICING_FAQ = [
  {
    question: "Y a-t-il un engagement ?",
    answer:
      "Non. L'abonnement mensuel est résiliable à tout moment depuis votre espace client. L'abonnement annuel est payé en une fois, mais reste résiliable en fin de période.",
  },
  {
    question: "Que se passe-t-il si je dépasse 20 utilisateurs ?",
    answer:
      "Le plan Team couvre jusqu'à 20 utilisateurs. Au-delà, contactez-nous pour un devis Custom.",
  },
  {
    question: "Andoxa est-il conforme RGPD ?",
    answer:
      "Oui. Les données sont hébergées en Europe, chiffrées au repos et en transit. Nous fournissons un DPA sur demande et respectons les droits d'accès, rectification, effacement et portabilité.",
  },
  {
    question: "Mon compte LinkedIn risque-t-il d'être bloqué ?",
    answer:
      "Andoxa respecte par défaut les limites quotidiennes recommandées (~30 invitations/jour la première semaine, montée progressive). Aucune action automatique ne dépasse ces seuils. Vous gardez le contrôle total via les paramètres de campagne.",
  },
  {
    question: "Comment se passe la migration depuis HubSpot, Pipedrive, Salesforce… ?",
    answer:
      "Import CSV guidé pour les contacts et les opportunités, mapping des champs assisté, et accompagnement par l'équipe pendant la première semaine. Sans frais sur les plans Team et Custom.",
  },
  {
    question: "Puis-je essayer Andoxa avant de souscrire ?",
    answer:
      "Oui. Réservez une démo commerciale gratuite de 30 minutes pour voir la plateforme avec vos cas d'usage réels. Un essai Solo peut aussi être proposé depuis la page tarifs selon l'offre en cours. Une fois souscrit, vous pouvez annuler à tout moment dans le mois.",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    answer:
      "Carte bancaire et prélèvement SEPA via Stripe pour le paiement mensuel ou annuel. Pour les plans Custom, la facturation par virement annuel est possible.",
  },
];

export const metadata: Metadata = {
  title: "Tarifs Andoxa, plans Solo, Team et Custom",
  description:
    "Choisissez le plan adapté à votre équipe. Solo dès 39 €/mois, Team dès 36 €/utilisateur/mois, et plan Custom pour les équipes au-delà de 20 utilisateurs.",
  openGraph: {
    title: "Tarifs Andoxa",
    description:
      "Un tarif par profil. Pas de surprise. Solo, Team, Custom — sans engagement.",
    locale: "fr_FR",
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <JsonLd data={softwareApplicationSchema()} />
      <JsonLd data={faqPageSchema(PRICING_FAQ)} />
      <main>
        <MarketingPricingSection />
        <ComparisonSection />
        <ComparisonTable />
        <PricingFaq />
        <ReassuranceBar />
        <PricingCta />
      </main>
      <Footer />
    </>
  );
}
