"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { BarChart3, Check, PhoneCall } from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { LinkedinIcon } from "@/components/marketing/icons/brand-icons";
import { EmbeddedPage } from "@/components/marketing/ui/embedded-page";
import { ANDOXA_PAGE } from "@/lib/andoxa-pages";
import { cn } from "@/lib/utils";

type PersonaVisual =
  | { kind: "image"; src: string; alt: string; objectPosition?: string }
  | { kind: "embed"; src: string; alt: string };

type Persona = {
  id: string;
  tabIcon: React.ComponentType<{ size?: number; className?: string }>;
  tabLabel: string;
  badge: string;
  headline: React.ReactNode;
  description: string;
  bullets: { title: string; sub: string }[];
  metric: { value: string; label: string };
  visual: PersonaVisual;
};

const PERSONAS: Persona[] = [
  {
    id: "linkedin",
    tabIcon: LinkedinIcon,
    tabLabel: "Sales LinkedIn",
    badge: "Pour les SDR & BDR",
    headline: (
      <>
        <span className="block">Plus de RDV.</span>
        <span className="block text-[var(--brand-blue)]">Zéro copier-coller.</span>
      </>
    ),
    description:
      "Vos commerciaux LinkedIn captent un profil, lancent une campagne, et concluent dans une seule interface.",
    bullets: [
      { title: "Extension Chrome 1-clic", sub: "Transformez un profil LinkedIn en prospect dans Andoxa, sans quitter l'onglet." },
      { title: "Campagnes invitation + message", sub: "Configurez l'invitation et le premier message, Andoxa lance la séquence dans le respect des limites LinkedIn." },
      { title: "Séquences multi-canaux", sub: "Follow-ups LinkedIn et bascule WhatsApp dans un seul flux, sans rupture pour le prospect." },
      { title: "Inbox unifiée", sub: "LinkedIn et WhatsApp dans la même boîte. Plus aucune réponse oubliée entre deux apps." },
    ],
    metric: { value: "×2", label: "prospects contactés par jour, à effort constant" },
    visual: {
      kind: "image",
      src: "/screenshots/01-extension-linkedin-profil.png",
      alt: "Extension Chrome Andoxa active sur un profil LinkedIn",
      objectPosition: "center top",
    },
  },
  {
    id: "phone",
    tabIcon: PhoneCall,
    tabLabel: "Sales Téléphone",
    badge: "Pour les commerciaux phoning",
    headline: (
      <>
        <span className="block">Des sessions d&apos;appels</span>
        <span className="block text-[var(--brand-blue)]">prêtes à enchaîner.</span>
      </>
    ),
    description:
      "Une queue de prospects préparée, une trame sous les yeux, et la prise de RDV directement pendant l'appel.",
    bullets: [
      { title: "Sessions d'appels organisées", sub: "La queue des prospects à appeler est prête à l'avance." },
      { title: "Trames personnalisables", sub: "Un script d'appel adapté à chaque campagne, avec étapes de qualification visibles." },
      { title: "Booking pendant l'appel", sub: "Prenez le RDV depuis Andoxa pendant que vous parlez. L'invitation Google Meet est créée automatiquement." },
      { title: "Suivi temps réel par session", sub: "Prospects traités, RDV pris, qualifications, taux de décrochage : tout est tracé." },
    ],
    metric: { value: "1 h/jour", label: "récupérée par SDR sur la prospection téléphonique" },
    visual: {
      kind: "embed",
      src: ANDOXA_PAGE.callSession,
      alt: "Sessions d'appels Andoxa, queue de prospects prête",
    },
  },
  {
    id: "head",
    tabIcon: BarChart3,
    tabLabel: "Head of Sales",
    badge: "Pour les managers commerciaux",
    headline: (
      <>
        Pilotez l&apos;équipe <span className="text-[var(--brand-blue)]">en temps réel</span>.
      </>
    ),
    description:
      "Visualisez la performance de chaque commercial, détectez les goulots, et alignez toute l'équipe sur les mêmes workflows.",
    bullets: [
      { title: "Dashboard live par SDR", sub: "Taux de réponse, RDV bookés, no-shows et closings, mis à jour en continu." },
      { title: "Priorités du jour", sub: "Relances en attente, leads chauds, RDV à confirmer : la liste actionnable de la journée." },
      { title: "Détection des goulots", sub: "Andoxa pointe où le funnel décroche, sur quel SDR, sur quelle étape." },
      { title: "Workflows partagés", sub: "Templates, séquences, automations diffusées en un clic à toute l'équipe." },
    ],
    metric: { value: "0 reporting", label: "manuel, toute la performance équipe en un écran" },
    visual: {
      kind: "embed",
      src: ANDOXA_PAGE.dashboard,
      alt: "Tableau de bord Andoxa avec priorités du jour",
    },
  },
];

export function MarketingPersonasSection() {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState<string>(PERSONAS[0].id);
  const persona = PERSONAS.find((p) => p.id === active) ?? PERSONAS[0];

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
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
          <Eyebrow className="justify-center">Pour qui</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Un outil. Trois manières d&apos;accélérer.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Andoxa s&apos;adapte à chaque rôle commercial sans rien sacrifier de la
            cohérence d&apos;équipe.
          </p>
        </div>

        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-card p-1.5 shadow-[0_4px_18px_-10px_rgba(0,0,0,0.08)]">
            {PERSONAS.map((p) => {
              const isActive = p.id === active;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(p.id)}
                  className={cn(
                    "relative inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-white"
                      : "border border-[var(--border)] bg-[var(--neutral-50)]/70 text-foreground/75 hover:bg-card hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="persona-pill"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-[var(--brand-blue)] shadow-[0_4px_14px_-4px_rgba(0,82,217,0.45)]"
                      transition={{ type: "spring", stiffness: 360, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-2">
                    <p.tabIcon size={14} className={isActive ? "" : "text-[var(--brand-blue)]"} />
                    {p.tabLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lock the row to the tallest persona so switching to "Head of Sales"
            or "Inbound" (shorter copy) doesn't shrink the layout and trigger
            the scroll-driven header to reappear. 540px wasn't enough; the
            tallest variants need ~640px on desktop. */}
        <div className="grid items-stretch gap-8 md:min-h-[640px] lg:min-h-[640px] lg:grid-cols-2 lg:gap-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={`copy-${persona.id}`}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col justify-center"
            >
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--brand-blue-tint)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-blue)]">
                <persona.tabIcon size={12} />
                {persona.badge}
              </span>
              <h3 className="font-display mt-4 text-3xl leading-tight text-foreground sm:text-4xl">
                {persona.headline}
              </h3>
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                {persona.description}
              </p>
              <ul className="mt-7 space-y-4">
                {persona.bullets.map((b) => (
                  <li key={b.title} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--brand-blue)] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground sm:text-[0.95rem]">
                        {b.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{b.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 inline-flex w-fit items-center gap-3 rounded-xl border border-[var(--brand-blue)]/20 bg-[var(--brand-blue-tint)]/60 px-4 py-3">
                <span className="font-display text-2xl font-semibold text-[var(--brand-blue)] sm:text-3xl">
                  {persona.metric.value}
                </span>
                <span className="text-xs leading-5 text-foreground/80 sm:text-sm">
                  {persona.metric.label}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={`visual-${persona.id}`}
                initial={reduce ? false : { opacity: 0, scale: 0.98 }}
                animate={reduce ? undefined : { opacity: 1, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-card shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]"
              >
                <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--border)] bg-[var(--neutral-50)]/80 px-3 py-2 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-[#FF5F57]/70" />
                  <span className="h-2 w-2 rounded-full bg-[#FEBC2E]/70" />
                  <span className="h-2 w-2 rounded-full bg-[#28C840]/70" />
                  <div className="ml-2 inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    <span className="h-1 w-1 rounded-full bg-[var(--brand-blue)]" />
                    andoxa.fr
                  </div>
                </div>
                <div className="relative aspect-[16/10] w-full">
                  {persona.visual.kind === "embed" ? (
                    <EmbeddedPage
                      src={persona.visual.src}
                      title={persona.visual.alt}
                      className="h-full w-full"
                    />
                  ) : (
                    <Image
                      src={persona.visual.src}
                      alt={persona.visual.alt}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                      style={{ objectPosition: persona.visual.objectPosition ?? "center" }}
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
}
