import type { Metadata } from "next";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import { GuideArticle } from "@/components/marketing/guide/guide-article";

export const metadata: Metadata = {
  title: "Le guide complet d'Andoxa",
  description:
    "Du profil LinkedIn au rendez-vous calé dans votre pipeline. Comment fonctionne Andoxa, comment vous en servir au quotidien, et comment prospecter sur LinkedIn sans y passer vos journées.",
  openGraph: {
    title: "Le guide complet d'Andoxa",
    description:
      "Tout ce que fait Andoxa, et comment vous en servir au quotidien : campagnes LinkedIn, appels, messagerie, booking, calendrier, CRM et statistiques.",
    locale: "fr_FR",
    type: "website",
  },
};

export default function GuidePage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <GuideArticle />
      </main>
      <Footer />
    </>
  );
}
