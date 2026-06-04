"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  EyeOff,
  Hourglass,
  Layers,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { Magnetic } from "@/components/marketing/ui/magnetic";
import { AuroraBackground } from "@/components/marketing/aceternity/aurora-background";
import { BackgroundGradientAnimation } from "@/components/marketing/aceternity/background-gradient-animation";
import { cn } from "@/lib/utils";

/* ── Hero ─────────────────────────────────────────────────────────────────── */

export function AProposHero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden pb-20 pt-32 sm:pb-24 sm:pt-40">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]">
        <AuroraBackground />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-0 -z-[5] h-[420px] w-[600px] rounded-full bg-[var(--brand-blue-tint)] opacity-60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-1/3 -z-[5] h-[360px] w-[520px] rounded-full bg-[var(--brand-orange-tint)] opacity-50 blur-3xl"
      />
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="justify-center">À propos</Eyebrow>
          <h1 className="font-display mt-6 text-5xl text-foreground sm:text-6xl lg:text-7xl">
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="block"
            >
              Construit par et pour
            </motion.span>
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="block text-[var(--brand-blue)]"
            >
              des équipes commerciales.
            </motion.span>
          </h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl"
          >
            On a vu trop d&apos;équipes sales perdre leurs prospects entre cinq outils. Andoxa
            existe pour que le revenue engine ne fuie plus.
          </motion.p>
        </div>
      </Container>
    </section>
  );
}

/* ── Problème vu du terrain ───────────────────────────────────────────────── */

const PAINS = [
  {
    icon: Layers,
    title: "Cinq outils ouverts en permanence.",
    body:
      "LinkedIn pour prospecter, Calendly pour booker, HubSpot pour suivre, WhatsApp pour relancer, un Notion pour ne pas tout perdre. Vos commerciaux jonglent toute la journée et perdent des prospects entre chaque clic.",
  },
  {
    icon: TrendingDown,
    title: "Un tiers de no-shows non relancés.",
    body:
      "Le RDV est booké, le prospect oublie, personne n'a le temps de relancer. Résultat : un tiers du pipeline disparaît silencieusement chaque mois.",
  },
  {
    icon: Hourglass,
    title: "Des heures perdues en copier-coller.",
    body:
      "Capturer un profil LinkedIn, le coller dans le CRM, envoyer un lien Calendly, relancer manuellement. Vos commerciaux devraient vendre, pas faire du copier-coller.",
  },
  {
    icon: EyeOff,
    title: "Aucune visibilité sur le pipeline réel.",
    body:
      "Combien de RDV sont vraiment chauds ? Quels deals stagnent ? Quel commercial sous-performe ? Sans données unifiées, on pilote à l'aveugle.",
  },
];

export function AProposProbleme() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--neutral-50)]/60 py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-1/4 h-[400px] w-[600px] rounded-full bg-[var(--brand-blue-tint)]/40 blur-3xl"
      />
      <Container className="relative">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow className="justify-center">Le quotidien d&apos;un sales en 2026</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Vos commerciaux passent 50 % de leur temps à{" "}
            <span className="text-[var(--brand-blue)]">copier-coller</span>.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Et un tiers à relancer manuellement des prospects qui ne répondront jamais. C&apos;est
            normal&nbsp;?
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
          {PAINS.map((p, i) => (
            <motion.article
              key={p.title}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-card p-7 sm:p-8",
                "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-22px_rgba(0,82,217,0.22)]",
              )}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[var(--brand-blue-tint)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-80"
              />
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                <p.icon size={20} />
              </span>
              <h3 className="font-display mt-5 text-xl text-foreground sm:text-2xl">{p.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">{p.body}</p>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ── Mission ──────────────────────────────────────────────────────────────── */

export function AProposMission() {
  const reduce = useReducedMotion();
  return (
    <section className="border-t border-[var(--border)] bg-background py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="justify-center">Notre mission</Eyebrow>
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl"
          >
            Rendre aux commerciaux le temps de{" "}
            <span className="text-[var(--brand-blue)]">vendre</span>.
          </motion.h2>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground"
          >
            Un commercial passe en moyenne 4 heures par jour sur des tâches qui ne sont pas la vente
            elle-même. Notre objectif est simple&nbsp;: ramener ces 4 heures vers le seul travail
            qui compte — parler à des prospects et signer.
          </motion.p>
        </div>
      </Container>
    </section>
  );
}

/* ── CTA ──────────────────────────────────────────────────────────────────── */

export function AProposCta() {
  const reduce = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden bg-[var(--brand-blue-dark)] py-28 sm:py-36">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <BackgroundGradientAnimation
          containerClassName="!h-full !w-full"
          size="80%"
        />
      </div>
      <svg
        aria-hidden="true"
        className="absolute inset-0 -z-[5] h-full w-full opacity-[0.07]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="cta-apropos-grid" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cta-apropos-grid)" />
      </svg>
      <Container className="relative">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 before:h-px before:w-6 before:bg-white/40">
            Le revenue engine
          </span>
          <h2 className="font-display mt-5 text-4xl text-white sm:text-5xl lg:text-6xl">
            Envie de voir Andoxa en vrai&nbsp;?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
            30 minutes avec l&apos;équipe pour qu&apos;on vous montre comment Andoxa s&apos;intègre
            à votre stack actuelle. Pas de slides commerciales. On ouvre le produit, on parle de
            votre équipe, on voit si c&apos;est pertinent.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
              <Button
                href="/contact"
                variant="outline"
                size="lg"
                className="border-white/40 bg-transparent text-white hover:border-white hover:bg-white/10"
              >
                Nous écrire
                <ArrowRight size={14} />
              </Button>
            </Magnetic>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
