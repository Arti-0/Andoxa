"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BellOff, CalendarX2, Copy, Database } from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { marketingAsset } from "@/lib/marketing/assets";
import { cn } from "@/lib/utils";

type Pain = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  visual: React.ReactNode;
};

const PAINS: Pain[] = [
  {
    icon: Copy,
    title: "Le copier-coller permanent.",
    description:
      "LinkedIn, Notion, Calendly, HubSpot, Gmail. Vos commerciaux passent 40 % de leur journée à ressaisir les mêmes données.",
    visual: <CopyPasteVisual />,
  },
  {
    icon: CalendarX2,
    title: "Les no-shows qui plombent le pipe.",
    description:
      "1 RDV pris sur 3 ne se fait pas. Pas de rappel WhatsApp, pas de séquence pré-RDV. Du chiffre qui s'évapore.",
    visual: <NoShowVisual />,
  },
  {
    icon: Database,
    title: "Le CRM qui ment.",
    description:
      "Saisie manuelle, conversations perdues, pipeline jamais à jour. Vous pilotez à l'aveugle, vos prévisions partent en fumée.",
    visual: <CrmVisual />,
  },
  {
    icon: BellOff,
    title: "Les relances oubliées.",
    description:
      "Pas de rappel à J+2 ? Le deal disparaît. La mémoire de vos SDR n'est pas un workflow scalable.",
    visual: <FollowupVisual />,
  },
];

export function MarketingProblemeSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="probleme"
      className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--neutral-50)]/60 py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/3 h-[400px] w-[600px] rounded-full bg-[var(--brand-blue-tint)]/40 blur-3xl"
      />

      <Container className="relative">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow className="justify-center">Le constat</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            La prospection B2B est <span className="text-[var(--brand-blue)]">cassée</span>.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Quatre fuites silencieuses qui rongent votre pipeline, chaque jour, dans
            toutes les équipes sales.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {PAINS.map((pain, i) => (
            <motion.article
              key={pain.title}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-card p-6 transition-shadow duration-300 hover:shadow-[0_18px_40px_-20px_rgba(0,82,217,0.18)] sm:p-7"
            >
              <div className="relative h-32 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--neutral-50)]">
                {pain.visual}
              </div>
              <div className="mt-5 flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                  <pain.icon size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-xl text-foreground sm:text-[1.35rem]">
                    {pain.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                    {pain.description}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-16 max-w-3xl text-center"
        >
          <p className="font-display text-2xl leading-snug text-foreground sm:text-3xl">
            Et si vos commerciaux passaient leur journée à{" "}
            <span className="text-[var(--brand-blue)]">vendre</span>, plutôt qu&apos;à
            jongler entre cinq outils&nbsp;?
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span>La réponse, juste en-dessous</span>
            <ArrowRight size={14} className="animate-pulse" />
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

/* ── pain visuals ─────────────────────────────────────────────────────────── */

function LogoTile({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative grid h-10 w-10 place-items-center rounded-lg bg-card shadow-[0_4px_14px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
      <Image src={src} alt={alt} width={24} height={24} className="h-6 w-6 object-contain" />
    </div>
  );
}

function CopyPasteVisual() {
  const tools = [
    { name: "LinkedIn", src: marketingAsset("logos/LinkedIn_Symbol_0.svg") },
    { name: "Notion", src: marketingAsset("logos/idzPHWF4i2_1779876244153.png") },
    { name: "Calendly", src: marketingAsset("logos/id6Wf82SOT_logos.svg") },
    { name: "HubSpot", src: marketingAsset("logos/Hubspot_logo.svg") },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-around px-4">
      {tools.map((t, i) => (
        <React.Fragment key={t.name}>
          <div className="flex flex-col items-center gap-1.5">
            <LogoTile src={t.src} alt={t.name} />
            <span className="font-mono text-[9px] text-muted-foreground">{t.name}</span>
          </div>
          {i < tools.length - 1 && (
            <span className="text-xs text-[var(--brand-blue)]/60">→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function NoShowVisual() {
  const slots = [
    { time: "10:00", status: "ok" },
    { time: "11:30", status: "noshow" },
    { time: "14:00", status: "ok" },
    { time: "15:30", status: "noshow" },
    { time: "17:00", status: "ok" },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-2 px-4">
      {slots.map((s, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col items-center gap-1 rounded-md border px-2.5 py-2",
            s.status === "noshow"
              ? "border-rose-300/60 bg-rose-50/60 dark:bg-rose-950/20"
              : "border-[var(--border)] bg-card",
          )}
        >
          <span
            className={cn(
              "font-mono text-[10px]",
              s.status === "noshow" ? "text-rose-500 line-through" : "text-muted-foreground",
            )}
          >
            {s.time}
          </span>
          <span
            className={cn(
              "h-1.5 w-6 rounded-full",
              s.status === "noshow" ? "bg-rose-400/70" : "bg-[var(--brand-blue)]/70",
            )}
          />
        </div>
      ))}
    </div>
  );
}

function CrmVisual() {
  const cols = [
    { label: "Discovery", count: "12", filled: 0.9 },
    { label: "Proposal", count: "?", filled: 0.5, stale: true },
    { label: "Closing", count: "?", filled: 0.3, stale: true },
  ];
  return (
    <div className="absolute inset-0 flex items-end gap-3 px-4 py-4">
      {cols.map((c) => (
        <div key={c.label} className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-muted-foreground">{c.label}</span>
            <span
              className={cn(
                "text-[10px] font-semibold",
                c.stale ? "text-rose-500" : "text-foreground",
              )}
            >
              {c.count}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--neutral-200)]">
            <div
              className={cn("h-full rounded-full", c.stale ? "bg-rose-400/70" : "bg-[var(--brand-blue)]")}
              style={{ width: `${c.filled * 100}%` }}
            />
          </div>
          <div className="flex flex-col gap-1">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-2 rounded-sm bg-[var(--neutral-200)]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FollowupVisual() {
  const items = [
    { day: "J+0", done: true },
    { day: "J+1", done: true },
    { day: "J+2", done: false, missed: true },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 px-5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold",
              item.done
                ? "bg-[var(--brand-blue)] text-white"
                : item.missed
                  ? "bg-rose-100 text-rose-500 ring-2 ring-rose-300/60 dark:bg-rose-950/30"
                  : "bg-[var(--neutral-200)] text-muted-foreground",
            )}
          >
            {item.done ? "✓" : item.missed ? "!" : "·"}
          </span>
          <span
            className={cn(
              "font-mono text-[10px]",
              item.missed ? "text-rose-500" : "text-muted-foreground",
            )}
          >
            {item.day} · Relance prospect
          </span>
          <div
            className={cn(
              "ml-auto h-1 w-12 rounded-full",
              item.done
                ? "bg-[var(--brand-blue)]/70"
                : item.missed
                  ? "bg-rose-300/70"
                  : "bg-[var(--neutral-200)]",
            )}
          />
        </div>
      ))}
    </div>
  );
}
