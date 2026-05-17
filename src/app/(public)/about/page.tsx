import type { Metadata } from "next";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import {
  AProposCta,
  AProposHero,
  AProposMission,
  AProposProbleme,
} from "@/components/marketing/sections/about";

export const metadata: Metadata = {
  title: "À propos d'Andoxa — Le revenue engine pour les équipes commerciales",
  description:
    "Andoxa unifie LinkedIn, WhatsApp, le booking et votre CRM dans une seule plateforme. Notre mission : rendre aux commerciaux le temps de vendre.",
};

export default function AboutPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <AProposHero />
        <AProposProbleme />
        <AProposMission />
        <AProposCta />
      </main>
      <Footer />
    </>
  );
}
