"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Magnetic } from "@/components/marketing/ui/magnetic";
import { BackgroundBeamsWithCollision } from "@/components/marketing/aceternity/background-beams-with-collision";
import { AuroraBackground } from "@/components/marketing/aceternity/aurora-background";
import { HeroSideImages } from "@/components/marketing/hero-side-images";
import { HeroFloatingCards } from "@/components/marketing/hero-floating-cards";

export function MarketingHero() {
  const reduce = useReducedMotion();

  return (
    <BackgroundBeamsWithCollision className="min-h-[90vh] pb-24 pt-32 sm:pt-40">
      <div className="pointer-events-none absolute inset-0 opacity-[0.15]">
        <AuroraBackground />
      </div>

      <HeroSideImages />
      <HeroFloatingCards />

      <Container className="relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="eyebrow inline-flex items-center gap-2"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
            Le revenue engine pour les équipes sales
          </motion.span>

          <h1 className="font-display mt-5 text-5xl text-foreground sm:text-6xl lg:text-[5rem]">
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="block"
            >
              Une seule stack.
            </motion.span>
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="block text-[var(--brand-blue)]"
            >
              Deux fois moins de no-shows.
            </motion.span>
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg"
          >
            Andoxa unifie LinkedIn, WhatsApp, le booking et votre CRM dans une seule
            plateforme. Vos commerciaux arrêtent de copier-coller, vos no-shows divisent
            par deux, votre pipeline explose.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Magnetic strength={0.1}>
              <Button href="/pricing" size="lg">
                Commencer maintenant
              </Button>
            </Magnetic>
            <Magnetic strength={0.08}>
              <Button href="/contact?objet=demo" variant="ghost" size="lg">
                <CalendarCheck size={16} />
                Réserver une démo
              </Button>
            </Magnetic>
          </motion.div>
        </div>
      </Container>
    </BackgroundBeamsWithCollision>
  );
}
