"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, Database } from "lucide-react";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { LinkedinIcon, WhatsappIcon } from "@/components/marketing/icons/brand-icons";
import Image from "next/image";
import { ContainerScroll } from "@/components/marketing/aceternity/container-scroll-animation";

const SOURCES = [
  { icon: LinkedinIcon, label: "LinkedIn", tone: "blue" as const },
  { icon: WhatsappIcon, label: "WhatsApp", tone: "emerald" as const },
  { icon: CalendarCheck, label: "Calendrier", tone: "blue" as const },
  { icon: Database, label: "CRM", tone: "blue" as const },
];

export function MarketingSolutionSection() {
  const reduce = useReducedMotion();

  return (
    <div
      id="solution"
      className="relative isolate overflow-hidden border-t border-[var(--border)] bg-gradient-to-b from-background via-[var(--brand-blue-tint)]/40 to-background"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[700px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-blue-tint)] opacity-70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[20%] left-[10%] -z-10 h-[280px] w-[460px] rounded-full bg-[var(--brand-orange-tint)] opacity-50 blur-3xl"
      />

      <ContainerScroll
        titleComponent={
          <>
            <Eyebrow className="justify-center">La solution</Eyebrow>
            <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
              Et si tout vivait{" "}
              <span className="text-[var(--brand-blue)]">au même endroit</span> ?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Andoxa fait converger vos canaux d&apos;acquisition, votre booking et votre
              CRM dans un seul cockpit. Vos commerciaux pilotent, ne jonglent plus.
            </p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 flex flex-wrap items-center justify-center gap-2"
            >
              {SOURCES.map((s, i) => (
                <motion.span
                  key={s.label}
                  initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                  whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.25 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]"
                >
                  <s.icon
                    size={14}
                    className={s.tone === "emerald" ? "text-emerald-500" : "text-[var(--brand-blue)]"}
                  />
                  {s.label}
                </motion.span>
              ))}
              <span className="mx-1 text-[var(--brand-blue)]/60">→</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_-4px_rgba(0,82,217,0.45)]">
                Andoxa
              </span>
            </motion.div>
          </>
        }
      >
        <div className="relative h-full w-full select-none">
          <Image
            src="/screenshots/02-dashboard.png"
            alt="Tableau de bord Andoxa"
            fill
            priority
            sizes="(min-width: 1024px) 1100px, 100vw"
            className="object-cover"
            style={{ objectPosition: "center top" }}
          />
        </div>
      </ContainerScroll>
    </div>
  );
}
