"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  ListOrdered,
  MailOpen,
  MessageCircle,
  Phone,
  PhoneCall,
  PhoneIncoming,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import {
  AndoxaLogoIcon,
  LinkedinIcon,
  WhatsappIcon,
} from "@/components/marketing/icons/brand-icons";
import { cn } from "@/lib/utils";

type Step = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  sub: string;
  channel: "linkedin" | "whatsapp" | "phone" | "andoxa" | "google";
};

type Flow = {
  id: string;
  tabIcon: React.ComponentType<{ size?: number; className?: string }>;
  tabLabel: string;
  headline: React.ReactNode;
  intro: string;
  steps: Step[];
  metrics: { value: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[];
};

const FLOWS: Flow[] = [
  {
    id: "linkedin",
    tabIcon: LinkedinIcon,
    tabLabel: "Outbound LinkedIn",
    headline: (
      <>
        Du profil LinkedIn <span className="text-[var(--brand-blue)]">au RDV qualifié</span>.
      </>
    ),
    intro:
      "Le SDR repère un profil, lance la séquence Andoxa, et laisse le système orchestrer jusqu'au RDV.",
    steps: [
      { icon: AndoxaLogoIcon, label: "Profil capté", sub: "Extension Chrome Andoxa, 1 clic depuis LinkedIn", channel: "andoxa" },
      { icon: LinkedinIcon, label: "Invitation + accept", sub: "Séquence LinkedIn dans les limites", channel: "linkedin" },
      { icon: MessageCircle, label: "Conversation", sub: "Premier message + relances multi-tour", channel: "linkedin" },
      { icon: CalendarCheck, label: "RDV booké", sub: "Lien de booking partagé en 1 message", channel: "andoxa" },
      { icon: CheckCircle2, label: "RDV tenu", sub: "Rappel WhatsApp + Google Meet auto", channel: "whatsapp" },
    ],
    metrics: [
      { value: "8 j", label: "du profil au RDV", icon: Clock },
      { value: "34 %", label: "taux d'acceptation moyen", icon: TrendingUp },
      { value: "−42 %", label: "no-shows vs sans WhatsApp", icon: CheckCircle2 },
    ],
  },
  {
    id: "phone",
    tabIcon: PhoneCall,
    tabLabel: "Outbound Téléphone",
    headline: (
      <>
        Du numéro composé <span className="text-[var(--brand-blue)]">au calendrier rempli</span>.
      </>
    ),
    intro:
      "Le SDR ouvre une session, déroule sa trame, et prend le RDV pendant qu'il a le prospect au bout du fil.",
    steps: [
      { icon: ListOrdered, label: "Queue prête", sub: "Liste de prospects ciblés et triés", channel: "andoxa" },
      { icon: PhoneCall, label: "Session lancée", sub: "Trame d'appel + script visible", channel: "phone" },
      { icon: Phone, label: "Qualification", sub: "Boutons RDV / À rappeler / Refus", channel: "phone" },
      { icon: CalendarCheck, label: "Booking en direct", sub: "Créneau pris pendant l'appel", channel: "google" },
      { icon: CheckCircle2, label: "RDV tenu", sub: "Confirmation WhatsApp + Google Meet auto", channel: "whatsapp" },
    ],
    metrics: [
      { value: "1 h/jour", label: "récupérée par SDR", icon: Clock },
      { value: "×2", label: "appels qualifiés / session", icon: TrendingUp },
      { value: "100 %", label: "RDV avec invitation Meet", icon: CheckCircle2 },
    ],
  },
  {
    id: "inbound",
    tabIcon: PhoneIncoming,
    tabLabel: "Inbound",
    headline: (
      <>
        Du lead entrant <span className="text-[var(--brand-blue)]">à la conversation chaude</span>.
      </>
    ),
    intro:
      "Un prospect remplit votre formulaire ou clique un lien. Andoxa l'enrichit, lui répond, et propose un RDV avant qu'il décroche.",
    steps: [
      { icon: MailOpen, label: "Lead arrive", sub: "Formulaire, lien, intent signal", channel: "andoxa" },
      { icon: Sparkles, label: "Enrichi auto", sub: "Profil LinkedIn + contexte récupérés", channel: "andoxa" },
      { icon: WhatsappIcon, label: "Réponse instant", sub: "Message WhatsApp dans la minute", channel: "whatsapp" },
      { icon: CalendarCheck, label: "Créneau proposé", sub: "Slots disponibles partagés en chat", channel: "google" },
      { icon: UserPlus, label: "SDR prend la main", sub: "Notification + fiche prospect prête", channel: "andoxa" },
    ],
    metrics: [
      { value: "< 60 s", label: "temps de première réponse", icon: Clock },
      { value: "×3", label: "taux de conversion lead → RDV", icon: TrendingUp },
      { value: "0 lead", label: "perdu entre form et SDR", icon: CheckCircle2 },
    ],
  },
];

const CHANNEL_COLORS: Record<Step["channel"], string> = {
  linkedin: "bg-[#0A66C2]/10 text-[#0A66C2] dark:bg-[#0A66C2]/20",
  whatsapp: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400",
  phone: "bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
  andoxa: "bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]",
  google: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400",
};

export function MarketingParcoursSection() {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState(FLOWS[0].id);
  const flow = FLOWS.find((f) => f.id === active) ?? FLOWS[0];

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
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Eyebrow className="justify-center">Le parcours</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Du premier contact à la signature.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Quel que soit le canal d&apos;entrée, Andoxa orchestre la même
            chorégraphie&nbsp;: multi-canal, sans rupture, jusqu&apos;au RDV qualifié.
          </p>
        </div>

        <div className="mb-12 flex flex-col items-center gap-3">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-card p-1.5 shadow-[0_4px_18px_-10px_rgba(0,0,0,0.08)]">
            {FLOWS.map((f) => {
              const isActive = f.id === active;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(f.id)}
                  className={cn(
                    "relative inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-white"
                      : "border border-[var(--border)] bg-[var(--neutral-50)]/70 text-foreground/75 hover:bg-card hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="parcours-pill"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-[var(--brand-blue)] shadow-[0_4px_14px_-4px_rgba(0,82,217,0.45)]"
                      transition={{ type: "spring", stiffness: 360, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-2">
                    <f.tabIcon size={14} className={isActive ? "" : "text-[var(--brand-blue)]"} />
                    {f.tabLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lock the panel area so switching between flows with different
            step counts doesn't shrink the section and trigger the scroll
            header to reappear. */}
        <div className="md:min-h-[420px] lg:min-h-[360px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`flow-${flow.id}`}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.29, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h3 className="font-display text-2xl text-foreground sm:text-3xl">{flow.headline}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                {flow.intro}
              </p>
            </div>

            <div className="relative mx-auto max-w-5xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 right-0 top-9 hidden lg:block"
              >
                <div className="relative mx-12 h-px overflow-hidden">
                  <div className="absolute inset-0 border-t border-dashed border-[var(--border)]" />
                  <motion.div
                    key={`line-${flow.id}`}
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={reduce ? undefined : { scaleX: 1 }}
                    transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    style={{ originX: 0 }}
                    className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-[var(--brand-blue)]/0 via-[var(--brand-blue)] to-[var(--brand-blue)]/0"
                  />
                </div>
              </div>

              <ol className="relative grid grid-cols-1 gap-x-2 gap-y-6 lg:grid-cols-5">
                {flow.steps.map((step, i) => (
                  <motion.li
                    key={`${flow.id}-${i}`}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={reduce ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.37, delay: 0.04 + i * 0.067, ease: [0.16, 1, 0.3, 1] }}
                    className="relative flex items-start gap-3 lg:flex-col lg:items-center lg:text-center"
                  >
                    {i < flow.steps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-[18px] top-10 h-[calc(100%+0.25rem)] w-px border-l border-dashed border-[var(--border)] lg:hidden"
                      />
                    )}
                    <div className="relative shrink-0">
                      <span
                        className={cn(
                          "relative z-10 grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-card shadow-[0_4px_14px_-8px_rgba(0,0,0,0.15)]",
                          CHANNEL_COLORS[step.channel],
                        )}
                      >
                        <step.icon size={16} />
                      </span>
                      <span className="absolute -right-1.5 -top-1.5 z-20 grid h-4 w-4 place-items-center rounded-full bg-[var(--brand-blue)] text-[9px] font-bold text-white">
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0 lg:mt-3">
                      <p className="text-sm font-semibold text-foreground">{step.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-[0.8rem] lg:mx-auto lg:max-w-[14ch]">
                        {step.sub}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>

            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              {flow.metrics.map((m, i) => (
                <motion.div
                  key={`${flow.id}-m-${i}`}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, delay: 0.42 + i * 0.067, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3 rounded-xl border border-[var(--brand-blue)]/15 bg-[var(--brand-blue-tint)]/50 px-4 py-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-card text-[var(--brand-blue)]">
                    <m.icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-xl font-semibold text-[var(--brand-blue)] sm:text-2xl">
                      {m.value}
                    </p>
                    <p className="text-[11px] leading-4 text-foreground/80 sm:text-xs">{m.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}
