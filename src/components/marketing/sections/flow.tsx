"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { cn } from "@/lib/utils";
import { ExtensionRelief } from "@/components/marketing/mockups/relief/extension-relief";
import { CampagneRelief } from "@/components/marketing/mockups/relief/campagne-relief";
import { MessagerieRelief } from "@/components/marketing/mockups/relief/messagerie-relief";
import { BookingRelief } from "@/components/marketing/mockups/relief/booking-relief";

type Step = {
  n: number;
  title: string;
  lead: string;
  bullets: string[];
  relief: React.ReactNode;
};

const STEPS: Step[] = [
  {
    n: 1,
    title: "Capturez le prospect",
    lead: "Sur n'importe quel profil LinkedIn, l'extension Andoxa l'importe en un clic.",
    bullets: [
      "Sans copier-coller",
      "Poste, entreprise et contexte récupérés",
      "Rangé dans la bonne campagne",
    ],
    relief: <ExtensionRelief />,
  },
  {
    n: 2,
    title: "Lancez la campagne",
    lead: "Invitation et premier message, puis vous suivez le funnel en direct.",
    bullets: [
      "Invitation + premier message, rien de plus",
      "Dans les limites de LinkedIn",
      "Acceptations et réponses en temps réel",
    ],
    relief: <CampagneRelief />,
  },
  {
    n: 3,
    title: "Échangez à la main",
    lead: "Les réponses arrivent dans une inbox unifiée, vous gardez le fil.",
    bullets: [
      "Toutes les conversations au même endroit",
      "Le contexte commercial de chaque échange",
      "Vous répondez vous-même, Andoxa ne parle pas à votre place",
    ],
    relief: <MessagerieRelief />,
  },
  {
    n: 4,
    title: "Le RDV se cale tout seul",
    lead: "Vous envoyez le lien, le prospect réserve, le RDV tombe au calendrier.",
    bullets: [
      "Lien de réservation en un clic",
      "Calendrier unifié, synchro Google",
      "Confirmation instantanée",
    ],
    relief: <BookingRelief />,
  },
];

/** Tracés distincts pour chaque connecteur (galbe + sens différents) afin
 *  d'éviter la répétition d'une même courbe miroitée. */
const CONNECTOR_PATHS = [
  "M64 6 C 72 58 188 52 150 132", // 1 → 2 : bascule vers la droite
  "M156 6 C 150 56 28 56 72 132", // 2 → 3 : bascule vers la gauche, autre galbe
  "M66 8 C 150 30 72 104 150 134", // 3 → 4 : double inflexion
];

/** Connecteur incurvé en pointillés entre deux étapes. Le tracé `d` change à
 *  chaque palier pour un serpentin organique. Décoratif → aria-hidden. */
function FlowConnector({
  d,
  reduce,
  id,
}: {
  d: string;
  reduce: boolean | null;
  id: string;
}) {
  return (
    <div aria-hidden="true" className="flex justify-center py-5 sm:py-9">
      <motion.svg
        width={220}
        height={148}
        viewBox="0 0 220 148"
        fill="none"
        className="text-[var(--brand-blue)]"
        initial={reduce ? false : { opacity: 0, y: -16 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.7 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <defs>
          <marker
            id={id}
            viewBox="0 0 12 12"
            refX={6}
            refY={6}
            markerWidth={11}
            markerHeight={11}
            markerUnits="userSpaceOnUse"
            orient="auto"
          >
            <path
              d="M1.5 1.5 L9 6 L1.5 10.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
        <path
          d={d}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="0.5 11"
          markerEnd={`url(#${id})`}
          opacity={0.6}
        />
      </motion.svg>
    </div>
  );
}

export function MarketingFlowSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="flow"
      className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--neutral-50)]/50 py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[10%] -z-10 h-[460px] w-[860px] -translate-x-1/2 rounded-full bg-[var(--brand-blue-tint)]/45 blur-3xl"
      />

      <Container className="relative">
        <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
          <Eyebrow className="justify-center">Le parcours</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Du profil LinkedIn au{" "}
            <span className="text-[var(--brand-blue)]">rendez-vous</span>.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Quatre étapes, un seul outil. Vous gardez la main sur la conversation, Andoxa
            exécute la mécanique.
          </p>
        </div>

        <div className="mx-auto max-w-7xl">
          {STEPS.map((step, i) => {
            const imageRight = i % 2 === 0; // 1: droite, 2: gauche, 3: droite, 4: gauche
            return (
              <React.Fragment key={step.n}>
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 28 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14"
                >
                {/* Texte */}
                <div
                  className={cn(
                    "lg:col-span-5",
                    imageRight ? "lg:order-1" : "lg:order-2",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--brand-blue)] text-xl font-bold text-white">
                      {step.n}
                    </span>
                    <h3 className="font-display text-2xl text-foreground sm:text-3xl">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-5 text-lg leading-7 text-muted-foreground">
                    {step.lead}
                  </p>
                  <ul className="mt-7 space-y-3">
                    {step.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--neutral-50)] px-4 py-3.5 text-[15px] leading-6 text-foreground/90"
                      >
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[var(--brand-blue)] text-white">
                          <Check size={12} strokeWidth={3} />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visuel relief (colonne large, déborde un peu vers le bord, net car vectoriel) */}
                <div
                  className={cn(
                    "lg:col-span-7",
                    imageRight
                      ? "lg:order-2 lg:-mr-8 xl:-mr-20"
                      : "lg:order-1 lg:-ml-8 xl:-ml-20",
                  )}
                >
                  {step.relief}
                </div>
              </motion.div>

                {i < STEPS.length - 1 && (
                  <FlowConnector
                    d={CONNECTOR_PATHS[i]}
                    reduce={reduce}
                    id={`flow-arrow-${step.n}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
