"use client";

/**
 * Page d'accueil principale - Design v3
 *
 * Structure :
 * - Header avec navigation et authentification
 * - Hero section avec CTA
 * - Section fonctionnalités
 * - Section tarifs
 * - Section à propos
 * - Footer
 *
 * Background : 18 formes floutées animées pour créer un effet visuel dynamique
 */

import { HeroSectionV3 } from "@/components/v3/homepage/HeroSectionV3";
import { UnifiedHeader } from "@/components/v3/homepage/UnifiedHeader";
import { FeaturesSectionV2 } from "@/components/v3/homepage/FeaturesSectionV2";
import { TarifsSection } from "@/components/v3/homepage/TarifsSection";
import { AboutSection } from "@/components/v3/homepage/AboutSection";
import { ContactSection } from "@/components/v3/homepage/ContactSection";
import AndoxaFooter from "@/components/content/AndoxaFooter";
import NewComponent from "@/components/newcomponent";


export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header avec navigation - V2 avec effets de scroll et menu mobile */}
      <UnifiedHeader showMobileMenu={true} enableScrollEffect={true} />

      {/* Conteneur principal avec formes floutées en arrière-plan */}
      <div className="relative w-full overflow-hidden">
        {/* 18 formes floutées animées - définies dans globals.css */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="color" />
          ))}
        </div>

        {/* Contenu des sections - au-dessus des formes floutées */}
        <div className="relative z-10">
          {/* Hero section - Section principale avec titre et CTA */}
          <HeroSectionV3 />

          {/* Section fonctionnalités - Scroll anchor pour navigation */}
          <div id="features" className="scroll-mt-24">
            <FeaturesSectionV2 />
          </div>

          {/* Section tarifs - Plans et pricing */}
          <TarifsSection />

          {/* Section à propos - Mission, vision, valeurs */}
          <AboutSection />

          {/* Section contact - Formulaire de contact */}
          <ContactSection />
        </div>
      </div>

      {/* Footer */}
      <AndoxaFooter />
    </main>
  );
}
