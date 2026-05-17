"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Magnetic } from "@/components/marketing/ui/magnetic";
import { BackgroundGradientAnimation } from "@/components/marketing/aceternity/background-gradient-animation";

export function MarketingFinalCtaSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden bg-[var(--brand-blue-dark)] py-28 sm:py-36">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <BackgroundGradientAnimation containerClassName="!h-full !w-full" size="80%" blendingValue="screen" />
      </div>

      <svg
        aria-hidden="true"
        className="absolute inset-0 -z-[5] h-full w-full opacity-[0.07]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="cta-grid-v2" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cta-grid-v2)" />
      </svg>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--background)]/40 to-transparent"
      />

      <Container className="relative">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 before:h-px before:w-6 before:bg-white/40">
            Le revenue engine
          </span>

          <h2 className="font-display mt-5 text-4xl text-white sm:text-5xl lg:text-6xl">
            <span className="block">Une seule stack.</span>
            <span className="block text-white/85">Vos commerciaux signent enfin.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
            Centralisez LinkedIn, WhatsApp, le booking et votre CRM en quinze minutes.
            Voyez la différence sur le pipeline dans la semaine.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic strength={0.1}>
              <Button
                href="/pricing"
                size="lg"
                className="bg-white !text-[var(--brand-blue-dark)] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] hover:bg-white/95"
              >
                Commencer maintenant
                <ArrowRight size={16} />
              </Button>
            </Magnetic>
            <Magnetic strength={0.08}>
              <Button
                href="/contact?objet=demo"
                variant="ghost"
                size="lg"
                className="text-white hover:bg-white/10"
              >
                <CalendarCheck size={14} />
                Réserver une démo
              </Button>
            </Magnetic>
          </div>

          <p className="mt-6 text-xs text-white/55">
            Onboarding accompagné · Migration assistée · Sans engagement
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
