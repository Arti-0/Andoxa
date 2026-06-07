"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { cn } from "@/lib/utils";

/**
 * Home FAQ. Placed just below pricing, before the final CTA. Sober accordion.
 *
 * Copy guardrail: the answers below are the EXACT and ONLY scope. No claim
 * beyond them, no romanticizing, never mention WhatsApp or Workflows.
 */
const QA: { q: string; a: React.ReactNode }[] = [
  {
    q: "En quoi Andoxa est différent d'un Lemlist ou d'un Waalaxy ?",
    a: (
      <p>
        Ces outils automatisent l&apos;envoi sur LinkedIn. Andoxa réunit LinkedIn, le téléphone,
        l&apos;inbox, le booking, le calendrier et le CRM dans un seul outil, la conversation
        restant pilotée à la main. Vous ne rajoutez pas un outil, vous en remplacez plusieurs.
      </p>
    ),
  },
  {
    q: "Qu'est-ce que l'IA fait concrètement ?",
    a: (
      <p>
        Elle priorise vos conversations, suggère la prochaine action et aide à estimer le niveau
        d&apos;intention. Elle ne décide jamais et n&apos;envoie jamais à votre place.
      </p>
    ),
  },
  {
    q: "Andoxa gère aussi la prospection téléphonique ?",
    a: (
      <p>
        Oui. Sessions d&apos;appels avec file de prospects, trame, qualification en direct et
        prise de RDV pendant l&apos;appel.
      </p>
    ),
  },
  {
    q: "Comment Andoxa m'évite d'oublier un prospect ?",
    a: (
      <p>
        Chaque prospect a une prochaine action suggérée, et le tableau de bord remonte les deals
        à risque (silence prolongé) et les conversations à relancer.
      </p>
    ),
  },
  {
    q: "Comment je vois où en est chaque prospect ?",
    a: (
      <p>
        Chaque conversation porte son statut commercial, chaque fiche a sa timeline complète, et
        le pipeline kanban va de Nouveau à Signé.
      </p>
    ),
  },
  {
    q: "Andoxa remplace mon Calendly ?",
    a: (
      <p>
        Oui. Lien de réservation, calendrier unifié et synchro Google sont intégrés, et chaque
        RDV est rattaché au prospect et à son deal.
      </p>
    ),
  },
  {
    q: "Comment ça marche en équipe ?",
    a: (
      <p>
        Pipeline partagé, assignation des RDV et des prospects par commercial, et suivi de la
        performance de chacun.
      </p>
    ),
  },
  {
    q: "Quels indicateurs je suis ?",
    a: (
      <p>
        Invitations, taux d&apos;acceptation et de réponse, RDV bookés, no-show, taux de closing,
        et un funnel complet de l&apos;invitation au deal.
      </p>
    ),
  },
];

export function MarketingFaqSection() {
  return (
    <section
      id="faq"
      className="relative border-t border-[var(--border)] bg-[var(--neutral-50)]/60 py-24 sm:py-32"
    >
      <Container>
        {/* Bandeau d'en-tête pleine largeur */}
        <div className="mb-12 flex flex-col gap-7 sm:mb-14 md:flex-row md:items-start md:justify-between md:gap-10">
          <div className="max-w-2xl">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="font-display mt-4 text-3xl text-foreground sm:text-4xl">
              Les questions qu&apos;on nous pose le plus.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Vous ne trouvez pas votre réponse ici ? Écrivez-nous, on répond vite.
            </p>
          </div>
          <Button href="/contact" className="shrink-0">
            Écrivez-nous
            <ArrowRight size={16} />
          </Button>
        </div>

        {/* Grille deux colonnes (4 et 4) */}
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <div className="space-y-4">
            {QA.slice(0, 4).map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
          <div className="space-y-4">
            {QA.slice(4).map((item, i) => (
              <FaqItem key={i + 4} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-colors",
        open
          ? "border-[var(--brand-blue)]/30 bg-[var(--brand-blue-tint)]/40"
          : "border-transparent bg-[var(--neutral-50)] hover:bg-[var(--neutral-100)]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span
          className={cn(
            "text-[15px] font-semibold transition-colors",
            open ? "text-[var(--brand-blue)]" : "text-foreground",
          )}
        >
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full transition-colors",
            open
              ? "bg-[var(--brand-blue)] text-white"
              : "bg-card text-muted-foreground",
          )}
        >
          <ChevronDown size={15} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-[15px] leading-7 text-muted-foreground">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
