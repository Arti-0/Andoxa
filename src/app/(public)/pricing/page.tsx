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
      <main className="pt-20">
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
