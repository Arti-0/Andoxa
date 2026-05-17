import type { Metadata } from "next";
import { FloatingNav, type NavItem } from "@/components/marketing/aceternity/floating-nav";
import { ScrollProgress } from "@/components/marketing/ui/scroll-progress";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { HomeIntro } from "@/components/marketing/home-intro";
import { Footer } from "@/components/marketing/footer";
import { MarketingHero } from "@/components/marketing/sections/hero";
import { MarketingProblemeSection } from "@/components/marketing/sections/probleme";
import { MarketingSolutionSection } from "@/components/marketing/sections/solution";
import { MarketingPersonasSection } from "@/components/marketing/sections/personas";
import { MarketingParcoursSection } from "@/components/marketing/sections/parcours";
import { MarketingModulesBentoSection } from "@/components/marketing/modules-bento";
import { MarketingWorkflowPromiseSection } from "@/components/marketing/sections/workflow-promise";
import { MarketingPricingSection } from "@/components/marketing/sections/pricing";
import { MarketingFinalCtaSection } from "@/components/marketing/sections/final-cta";

export const metadata: Metadata = {
  title: "Andoxa, une seule stack, deux fois moins de no-shows",
  description:
    "Andoxa unifie LinkedIn, WhatsApp, le booking et votre CRM dans une seule plateforme. Vos commerciaux arrêtent de copier-coller, vos no-shows divisent par deux.",
  openGraph: {
    title: "Andoxa, le revenue engine pour les équipes sales",
    description: "Une seule stack. Deux fois moins de no-shows.",
    locale: "fr_FR",
    type: "website",
  },
};

// English slugs per the route-reconciliation decision. `/resources/*` routes
// are created in a follow-up; `/demo` resolves to `/contact?objet=demo`.
const NAV_ITEMS: NavItem[] = [
  { name: "Tarifs", href: "/pricing" },
  {
    name: "Ressources",
    href: "/resources",
    children: [
      {
        name: "Guide détaillé d'Andoxa",
        href: "/resources/guide",
        description: "Tour complet du produit, module par module.",
      },
      {
        name: "Calculateur de ROI",
        href: "/resources/roi-calculator",
        description: "Estimez le gain mensuel pour votre équipe.",
      },
      {
        name: "Blog",
        href: "/resources/blog",
        description: "Outbound, no-shows, conformité, par les sales.",
      },
    ],
  },
  { name: "À propos", href: "/about" },
  { name: "Contact", href: "/contact" },
];

export default function Home() {
  return (
    <>
      <HomeIntro />
      <SmoothScroll />
      <ScrollProgress />
      <FloatingNav navItems={NAV_ITEMS} />
      <main>
        <MarketingHero />
        <MarketingProblemeSection />
        <MarketingSolutionSection />
        <MarketingPersonasSection />
        <MarketingParcoursSection />
        <section id="modules">
          <MarketingModulesBentoSection />
        </section>
        <MarketingWorkflowPromiseSection />
        <MarketingPricingSection />
        <MarketingFinalCtaSection />
      </main>
      <Footer />
    </>
  );
}
