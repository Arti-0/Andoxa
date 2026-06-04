"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, Database, Inbox, Link2, Phone } from "lucide-react";
import Image from "next/image";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { LinkedinIcon } from "@/components/marketing/icons/brand-icons";
import { cn } from "@/lib/utils";

type By = "vous" | "andoxa";
type Step = { label: string; sub: string; by: By };

type Flow = {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  headline: string;
  img: string;
  alt: string;
  steps: Step[];
};

/**
 * "Vous qualifiez, Andoxa exécute" — three ways to feed ONE pipeline, shown
 * with the real product (not abstract step cards). Each flow alternates text +
 * a framed app capture (same browser-chrome + Sharp PNG treatment as the hero);
 * everything then converges into the shared calendrier + CRM band. Every step is
 * tagged `vous` (human judgement) or `andoxa` (the mechanics). No WhatsApp, no
 * automatic sequence.
 *
 * Messagerie capture (the unified inbox) drops into the Outbound flow once it
 * lands in /public — see the note in that flow's data.
 */
const FLOWS: Flow[] = [
  {
    id: "linkedin",
    icon: LinkedinIcon,
    label: "Outbound LinkedIn",
    headline: "Vous lancez, vous échangez.",
    img: "/campagnes-section.png",
    alt: "Campagnes LinkedIn dans Andoxa",
    steps: [
      { label: "Campagne LinkedIn", sub: "Invitation + premier message, rien de plus", by: "vous" },
      { label: "Réponses dans l'inbox unifiée", sub: "Tout remonte au même endroit", by: "andoxa" },
      { label: "Vous échangez, puis vous bookez", sub: "Conversation à la main, lien de booking envoyé au bon moment", by: "vous" },
    ],
  },
  {
    id: "phone",
    icon: Phone,
    label: "Téléphone",
    headline: "Vous appelez, vous qualifiez.",
    img: "/session-section.png",
    alt: "Session d'appels dans Andoxa",
    steps: [
      { label: "Session d'appels", sub: "File de prospects + trame prêtes", by: "andoxa" },
      { label: "Qualification en direct", sub: "Vous jugez au bout du fil", by: "vous" },
      { label: "Booking pendant l'appel", sub: "Créneau pris sans raccrocher", by: "vous" },
    ],
  },
  {
    id: "inbound",
    icon: Link2,
    label: "Inbound",
    headline: "Vous diffusez votre lien.",
    img: "/booking-section.png",
    alt: "Page de réservation Andoxa",
    steps: [
      { label: "Lien de réservation", sub: "Site, signature email, profil", by: "vous" },
      { label: "Le prospect réserve seul", sub: "Il choisit un créneau disponible", by: "andoxa" },
      { label: "RDV et fiche créés", sub: "Sans relance ni séquence automatique", by: "andoxa" },
    ],
  },
];

const DESTINATIONS = [
  { img: "/calendrier-section.png", alt: "Calendrier unifié Andoxa", icon: CalendarCheck, label: "Calendrier" },
  { img: "/crm-section.png", alt: "CRM et pipeline Andoxa", icon: Database, label: "CRM" },
];

export function MarketingParcoursSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="parcours"
      className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--neutral-50)]/50 py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 bottom-1/4 h-[440px] w-[640px] rounded-full bg-[var(--brand-blue-tint)]/40 blur-3xl"
      />

      <Container className="relative">
        <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
          <Eyebrow className="justify-center">Comment ça marche</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Vous qualifiez,{" "}
            <span className="text-[var(--brand-blue)]">Andoxa exécute</span>.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Trois façons d&apos;alimenter un seul pipeline. Vous gardez le jugement (à qui
            parler, quoi dire), Andoxa centralise et exécute la mécanique.
          </p>
        </div>

        {/* Three flows, alternating text + real capture */}
        <div className="mx-auto flex max-w-6xl flex-col gap-16 sm:gap-24">
          {FLOWS.map((flow, i) => {
            const imageRight = i % 2 === 0;
            return (
              <motion.div
                key={flow.id}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12"
              >
                {/* Text */}
                <div className={cn(imageRight ? "lg:order-1" : "lg:order-2")}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
                    <flow.icon size={14} className="text-[var(--brand-blue)]" />
                    {flow.label}
                  </div>
                  <h3 className="font-display mt-4 text-2xl text-foreground sm:text-3xl">
                    {flow.headline}
                  </h3>
                  <ol className="mt-6 space-y-0">
                    {flow.steps.map((step, s) => (
                      <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
                        {s < flow.steps.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="absolute left-[13px] top-7 h-[calc(100%-1rem)] w-px bg-[var(--border)]"
                          />
                        )}
                        <span className="relative z-10 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[var(--brand-blue)] text-[11px] font-bold text-white">
                          {s + 1}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{step.label}</p>
                            <ByTag by={step.by} />
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-[0.8rem]">
                            {step.sub}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Capture */}
                <div className={cn(imageRight ? "lg:order-2" : "lg:order-1")}>
                  <Shot src={flow.img} alt={flow.alt} priority={i === 0} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Convergence: everything lands in the same calendrier + CRM */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-20 max-w-6xl rounded-3xl border-2 border-[var(--brand-blue)]/20 bg-[var(--brand-blue-tint)]/40 p-6 sm:p-10"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-2xl text-foreground sm:text-3xl">
              Trois entrées, un seul pipeline.
            </p>
            <p className="mx-auto mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              Quel que soit le canal, le RDV tombe dans le même calendrier et tout est tracé dans
              le même CRM. Aucun prospect ne se perd. La conversation reste humaine : Andoxa
              n&apos;exécute que la mécanique, sans séquence automatique et sans WhatsApp.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Chip icon={Inbox} label="Inbox unifiée" />
              <Chip icon={CalendarCheck} label="Calendrier" />
              <Chip icon={Database} label="CRM" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
            {DESTINATIONS.map((d) => (
              <div key={d.img}>
                <Shot src={d.img} alt={d.alt} />
                <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-foreground">
                  <d.icon size={13} className="text-[var(--brand-blue)]" />
                  {d.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

/** Browser-chrome framed capture — same treatment as the hero (sections/hero.tsx):
 *  frame aspect = source ratio (1919×944), object-cover, unoptimized PNG from /public. */
function Shot({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-card"
      style={{
        boxShadow:
          "0 24px 70px -28px color-mix(in srgb, var(--brand-blue) 32%, transparent), 0 10px 30px -16px color-mix(in srgb, var(--foreground) 16%, transparent)",
      }}
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--neutral-50)] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[var(--neutral-300)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--neutral-300)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--neutral-300)]" />
      </div>
      <div className="relative aspect-[1919/944] w-full bg-[var(--neutral-50)]">
        <Image src={src} alt={alt} fill unoptimized priority={priority} className="object-cover object-top" />
      </div>
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-card px-3 py-1.5 text-xs font-medium text-foreground">
      <Icon size={14} className="text-[var(--brand-blue)]" />
      {label}
    </span>
  );
}

function ByTag({ by }: { by: By }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        by === "vous"
          ? "bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]"
          : "bg-[var(--neutral-100)] text-muted-foreground",
      )}
    >
      {by === "vous" ? "Vous" : "Andoxa"}
    </span>
  );
}
