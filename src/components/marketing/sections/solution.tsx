"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, Database, Phone } from "lucide-react";
import Image from "next/image";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { LinkedinIcon } from "@/components/marketing/icons/brand-icons";

const SOURCES = [
  { icon: LinkedinIcon, label: "LinkedIn" },
  { icon: Phone, label: "Téléphone" },
  { icon: CalendarCheck, label: "Calendrier" },
  { icon: Database, label: "CRM" },
];

export function MarketingSolutionSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="solution"
      className="relative isolate overflow-hidden border-t border-[var(--border)] bg-gradient-to-b from-background via-[var(--brand-blue-tint)]/40 to-background py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[700px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-blue-tint)] opacity-70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[20%] left-[10%] -z-10 h-[280px] w-[460px] rounded-full bg-[var(--brand-orange-tint)] opacity-50 blur-3xl"
      />

      <Container className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center">La solution</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            Du profil LinkedIn au deal signé,{" "}
            <span className="text-[var(--brand-blue)]">sans changer d&apos;outil</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Andoxa réunit les campagnes LinkedIn, l&apos;inbox, les appels, le booking, le
            calendrier et le CRM dans un seul outil.
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
                <s.icon size={14} className="text-[var(--brand-blue)]" />
                {s.label}
              </motion.span>
            ))}
            <span className="mx-1 text-[var(--brand-blue)]/60">→</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_-4px_rgba(0,82,217,0.45)]">
              Andoxa
            </span>
          </motion.div>
        </div>
      </Container>

      {/* Big product capture — same container + sizing as the hero (sections/hero.tsx):
          a max-w-[1280px] browser-chrome card whose frame aspect equals the source image
          ratio (1919×944, same as the hero), so object-cover shows the whole UI centered
          with no crop. PNG
          committed to /public, run through the Sharp pipeline (optimize-image.js, identical
          to shot-hero.js) and served `unoptimized` so a single crisp image is used at every
          resolution / zoom level (no responsive srcset swap). */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto mt-14 w-full max-w-[1280px] px-4"
      >
        <div
          className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-card"
          style={{
            boxShadow:
              "0 40px 120px -30px color-mix(in srgb, var(--brand-blue) 35%, transparent), 0 16px 50px -20px color-mix(in srgb, var(--foreground) 18%, transparent)",
          }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--neutral-50)] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--neutral-300)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--neutral-300)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--neutral-300)]" />
          </div>

          <div className="relative aspect-[1919/944] w-full bg-[var(--neutral-50)]">
            <Image
              src="/crm-section.png"
              alt="CRM et pipeline Andoxa"
              fill
              unoptimized
              className="object-cover object-top"
              priority
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
