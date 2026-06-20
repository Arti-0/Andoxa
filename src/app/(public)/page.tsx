import type { Metadata } from "next";
import { FloatingNav, type NavItem } from "@/components/marketing/aceternity/floating-nav";
import { RESOURCES_MENU } from "@/components/marketing/legal-page-layout";
import { ScrollProgress } from "@/components/marketing/ui/scroll-progress";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { HomeIntro } from "@/components/marketing/home-intro";
import { Footer } from "@/components/marketing/footer";
import { MarketingHero } from "@/components/marketing/sections/hero";
import { MarketingFlowSection } from "@/components/marketing/sections/flow";
import { MarketingLinkedInSafeSection } from "@/components/marketing/sections/safe";
import { MarketingModulesBentoSection } from "@/components/marketing/modules-bento";
import { MarketingPricingSection } from "@/components/marketing/sections/pricing";
import { MarketingFaqSection } from "@/components/marketing/sections/faq";
import { MarketingFinalCtaSection } from "@/components/marketing/sections/final-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { softwareApplicationSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Andoxa, vendez sur LinkedIn sans gérer la prospection",
  description:
    "Andoxa réunit vos campagnes LinkedIn, vos appels, votre inbox, le booking et votre CRM dans une seule plateforme.",
  openGraph: {
    title: "Andoxa, vendez sur LinkedIn sans gérer la prospection",
    description: "Campagnes LinkedIn, appels, booking et CRM dans une seule plateforme.",
    locale: "fr_FR",
    type: "website",
  },
};

// English slugs per the route-reconciliation decision. `/resources/*` routes
// are created in a follow-up; `/demo` resolves to `/contact?objet=demo`.
const NAV_ITEMS: NavItem[] = [
  { name: "Tarifs", href: "/pricing" },
  RESOURCES_MENU,
  { name: "Contact", href: "/contact" },
];

export default function Home() {
  return (
    <>
      <JsonLd data={softwareApplicationSchema()} />
      <HomeIntro />
      <SmoothScroll />
      <ScrollProgress />
      <FloatingNav navItems={NAV_ITEMS} />
      <main>
        <MarketingHero />
        <MarketingFlowSection />
        <section id="modules">
          <MarketingModulesBentoSection />
        </section>
        <MarketingLinkedInSafeSection />
        <MarketingPricingSection />
        <MarketingFaqSection />
        <MarketingFinalCtaSection />
      </main>
      <Footer />
    </>
  );
}
