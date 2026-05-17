"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Magnetic } from "@/components/marketing/ui/magnetic";

/** Bottom-of-/pricing CTA card. Mirrors the home FinalCta style at smaller scale. */
export function PricingCta() {
  const reduce = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden border-t border-[var(--border)] bg-[var(--brand-blue-dark)] py-24 sm:py-28">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full opacity-[0.07]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="pricing-cta-grid" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pricing-cta-grid)" />
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-0 h-[320px] w-[480px] rounded-full bg-[var(--brand-blue-light)]/40 blur-3xl"
      />

      <Container className="relative">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="font-display text-3xl text-white sm:text-4xl lg:text-5xl">
            Prêt à <span className="text-white/85">centraliser votre stack</span> ?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
            30 minutes avec l&apos;équipe pour qu&apos;on regarde votre stack actuelle, ou
            commencez direct si le plan vous parle.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic strength={0.1}>
              <Button
                href="/contact?objet=demo"
                size="lg"
                className="bg-white !text-[var(--brand-blue-dark)] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] hover:bg-white/95"
              >
                <CalendarCheck size={16} />
                Réserver une démo
              </Button>
            </Magnetic>
            <Magnetic strength={0.08}>
              <Button href="#tarifs" variant="ghost" size="lg" className="text-white hover:bg-white/10">
                Voir les plans
                <ArrowRight size={16} />
              </Button>
            </Magnetic>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
