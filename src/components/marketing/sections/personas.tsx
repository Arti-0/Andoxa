"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BarChart3, Building2, Handshake, Send } from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";

type Role = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  role: string;
  tagline: string;
  value: string;
};

const ROLES: Role[] = [
  {
    icon: Send,
    role: "SDR / BDR",
    tagline: "Celui qui prospecte",
    value:
      "Il lance ses campagnes LinkedIn (invitation + premier message) et ses sessions d'appels depuis le même endroit. Toutes les réponses arrivent dans une seule inbox, aucun lead ne se perd. Fini de jongler entre Sales Nav, son outil d'envoi, sa messagerie LinkedIn et un tableur.",
  },
  {
    icon: Handshake,
    role: "Closer / Account Executive",
    tagline: "Celui qui ferme",
    value:
      "Il récupère des RDV déjà qualifiés dans son calendrier. Avant le call, il ouvre la fiche prospect et voit tout l'historique (échanges, source, étapes). Il arrive préparé, pas à zéro.",
  },
  {
    icon: BarChart3,
    role: "Head of Sales",
    tagline: "Celui qui pilote",
    value:
      "Il suit le pipeline en temps réel, voit où ça bloque et la performance par commercial, sans relancer toute l'équipe pour avoir un point. Le reporting se fait tout seul.",
  },
  {
    icon: Building2,
    role: "Dirigeant d'agence",
    tagline: "Celui qui décide",
    value:
      "Une seule vue business : CA et activité par équipe, en direct, au lieu d'agréger cinq outils et trois tableurs en fin de mois.",
  },
];

export function MarketingPersonasSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="personas"
      className="relative overflow-hidden border-t border-[var(--border)] bg-background py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-1/4 h-[420px] w-[620px] rounded-full bg-[var(--brand-blue-tint)]/50 blur-3xl"
      />

      <Container className="relative">
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-16">
          <Eyebrow className="justify-center">Pour toute l&apos;équipe</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Du SDR au head of sales,{" "}
            <span className="text-[var(--brand-blue)]">un seul outil pour toute l&apos;équipe</span>.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Chaque rôle de l&apos;agence y gagne, et tout le monde travaille sur le même
            pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {ROLES.map((r, i) => (
            <motion.article
              key={r.role}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col rounded-2xl border border-[var(--border)] bg-card p-6 shadow-[0_4px_18px_-12px_rgba(0,82,217,0.12)]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                <r.icon size={18} />
              </span>
              <h3 className="font-display mt-4 text-lg text-foreground">{r.role}</h3>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[var(--brand-blue)]">
                {r.tagline}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{r.value}</p>
            </motion.article>
          ))}
        </div>

        {/* Multi-seat argument: one shared tool, not one more per person */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-3 rounded-2xl border-2 border-[var(--brand-blue)]/20 bg-[var(--brand-blue-tint)]/40 px-6 py-6 text-center sm:flex-row sm:justify-between sm:gap-6 sm:text-left"
        >
          <p className="text-sm leading-6 text-foreground sm:text-[0.95rem]">
            <span className="font-semibold">Un seul outil partagé par toute l&apos;équipe</span>,
            pas un abonnement de plus par personne. Le pipeline, les listes et les conversations
            sont communs.
          </p>
          <a
            href="/pricing"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--brand-blue)] transition-transform hover:translate-x-0.5"
          >
            Voir les tarifs équipe
            <ArrowRight size={14} />
          </a>
        </motion.div>
      </Container>
    </section>
  );
}
