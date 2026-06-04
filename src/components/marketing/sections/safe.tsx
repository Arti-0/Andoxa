"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { SafeRelief } from "@/components/marketing/mockups/relief/safe-relief";

/**
 * "LinkedIn Safe" — justifies the hero badge and answers an agency's #1 fear:
 * getting its LinkedIn account restricted.
 *
 * Layout: large visual on a blue background (left, ~half), text + CTA (right).
 * STRICT copy guardrail: never claim Andoxa is approved / partnered / official
 * with LinkedIn, never promise zero risk. We are designed to reduce risk, not
 * remove it — the footnote says so explicitly.
 */

const POINTS = [
  "L'invitation et le premier message, rien de plus",
  "Volumes plafonnés, rythme proche d'un usage humain",
  "Vous décidez qui contacter et quoi écrire",
];

export function MarketingLinkedInSafeSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="linkedin-safe"
      className="relative overflow-hidden border-t border-[var(--border)] bg-background py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-1/4 -z-10 h-[420px] w-[620px] rounded-full bg-[var(--brand-blue-tint)]/45 blur-3xl"
      />

      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          {/* Visuel (droite) : mockup relief "sécurité du compte", libre (non encadré). */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:order-2 lg:col-span-7 lg:-mr-12 xl:-mr-28 2xl:-mr-44"
          >
            <SafeRelief />
          </motion.div>

          {/* Texte (gauche) */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:order-1 lg:col-span-5"
          >
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                <ShieldCheck size={16} />
              </span>
              <Eyebrow>LinkedIn Safe</Eyebrow>
            </div>

            <h2 className="font-display mt-5 text-[1.75rem] text-foreground sm:text-4xl lg:text-5xl">
              <span className="block whitespace-nowrap">Moins d&apos;automatisation,</span>
              <span className="block whitespace-nowrap text-[var(--brand-blue)]">
                moins de risque.
              </span>
            </h2>

            <p className="mt-5 text-lg leading-7 text-muted-foreground">
              La peur n°1 quand on prospecte sur LinkedIn, c&apos;est de faire restreindre
              son compte. Andoxa est pensé pour réduire ce risque en automatisant le
              strict minimum.
            </p>

            <ul className="mt-7 flex flex-col items-start gap-2.5">
              {POINTS.map((p) => (
                <li
                  key={p}
                  className="inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--neutral-50)] py-2 pl-2.5 pr-4 text-sm text-foreground/90"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--brand-blue)] text-white">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>

            <div className="mt-9">
              <Button href="/pricing" size="lg">
                Essai gratuit de 14 jours
                <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
