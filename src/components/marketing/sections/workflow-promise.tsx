"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  CalendarCheck,
  ChevronsRight,
  Clock,
  Database,
  Eye,
  GitBranch,
  Inbox,
  ListTodo,
  MessageCircle,
  Plus,
  Save,
  Zap,
} from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { WhatsappIcon } from "@/components/marketing/icons/brand-icons";
import { cn } from "@/lib/utils";

type Tone = "blue" | "emerald" | "amber" | "violet" | "rose";

const TONE: Record<Tone, string> = {
  blue: "bg-[var(--brand-blue-tint)] text-[var(--brand-blue)] ring-[var(--brand-blue)]/15",
  emerald: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:bg-emerald-400/12 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-700 ring-amber-500/15 dark:bg-amber-400/12 dark:text-amber-300",
  violet: "bg-violet-500/10 text-violet-600 ring-violet-500/15 dark:bg-violet-400/12 dark:text-violet-300",
  rose: "bg-rose-500/10 text-rose-600 ring-rose-500/15 dark:bg-rose-400/12 dark:text-rose-300",
};

type Pill = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  tone: Tone;
};

const TRIGGERS: Pill[] = [
  { icon: CalendarCheck, label: "RDV pris", tone: "blue" },
  { icon: Clock, label: "Pas de réponse 48 h", tone: "amber" },
  { icon: Inbox, label: "Lead arrivé", tone: "blue" },
  { icon: Eye, label: "Lien tracké cliqué", tone: "violet" },
  { icon: Database, label: "Statut CRM changé", tone: "blue" },
  { icon: MessageCircle, label: "Réponse reçue", tone: "emerald" },
];

const ACTIONS: Pill[] = [
  { icon: WhatsappIcon, label: "WhatsApp ciblé", tone: "emerald" },
  { icon: Bell, label: "Notifier Slack", tone: "violet" },
  { icon: Database, label: "Mettre à jour CRM", tone: "blue" },
  { icon: ListTodo, label: "Créer une tâche", tone: "blue" },
  { icon: Clock, label: "Attendre X jours", tone: "amber" },
  { icon: GitBranch, label: "Brancher si…", tone: "rose" },
];

type Node = {
  category: string;
  categoryTone: Tone;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  sub: string;
};

const BUILDER: Node[] = [
  { category: "Déclencheur", categoryTone: "violet", icon: CalendarCheck, title: "Quand un RDV est pris", sub: "Source : campagne LinkedIn" },
  { category: "Délai", categoryTone: "amber", icon: Clock, title: "Attendre 2 heures", sub: "Pour ne pas spammer" },
  { category: "Action", categoryTone: "emerald", icon: WhatsappIcon, title: "Envoyer la confirmation WhatsApp", sub: "Template : confirm-rdv-v3" },
  { category: "Condition", categoryTone: "rose", icon: GitBranch, title: "Si pas de réponse à J−1", sub: "→ branche relance" },
  { category: "Action", categoryTone: "blue", icon: Bell, title: "Notifier le SDR sur Slack", sub: "Channel : #pipe-rdv" },
];

export function MarketingWorkflowPromiseSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-t border-[var(--border)] bg-background py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-1/4 h-[420px] w-[620px] rounded-full bg-[var(--brand-blue-tint)]/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 bottom-1/4 h-[360px] w-[520px] rounded-full bg-violet-500/8 blur-3xl"
      />

      <Container className="relative">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow className="justify-center">Workflows</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Décrivez la séquence.{" "}
            <span className="text-[var(--brand-blue)]">Andoxa l&apos;exécute.</span>
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Combinez n&apos;importe quel déclencheur avec n&apos;importe quelle action.
            Vos workflows tournent 24/7, sans intervention de vos commerciaux.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:order-1 lg:col-span-3">
            <ColumnHeader icon={Zap} label="Déclencheurs" tone="violet" />
            <PillsList pills={TRIGGERS} reduce={!!reduce} side="left" />
          </div>
          <div className="lg:order-2 lg:col-span-6">
            <Builder reduce={!!reduce} />
          </div>
          <div className="lg:order-3 lg:col-span-3">
            <ColumnHeader icon={ChevronsRight} label="Actions" tone="blue" align="right" />
            <PillsList pills={ACTIONS} reduce={!!reduce} side="right" />
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
          Plus de 30 déclencheurs et 40 actions, tous combinables. Construisez en quelques
          minutes ce que vos équipes faisaient à la main.
        </p>
      </Container>
    </section>
  );
}

function ColumnHeader({
  icon: Icon,
  label,
  tone,
  align = "left",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  tone: Tone;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("mb-4 flex items-center gap-2 lg:mb-5", align === "right" && "lg:justify-end")}>
      <span className={cn("grid h-7 w-7 place-items-center rounded-md ring-1", TONE[tone])}>
        <Icon size={14} />
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
        {label}
      </span>
    </div>
  );
}

function PillsList({
  pills,
  reduce,
  side,
}: {
  pills: Pill[];
  reduce: boolean;
  side: "left" | "right";
}) {
  return (
    <ul className="space-y-2.5">
      {pills.map((p, i) => (
        <motion.li
          key={p.label}
          initial={reduce ? false : { opacity: 0, x: side === "left" ? -8 : 8 }}
          whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "group inline-flex w-full items-center gap-2 rounded-full border border-[var(--border)] bg-card px-3 py-2 text-xs font-medium text-foreground shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_16px_-8px_rgba(0,82,217,0.25)] sm:text-[0.8rem]",
            side === "right" && "lg:flex-row-reverse",
          )}
        >
          <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1", TONE[p.tone])}>
            <p.icon size={11} />
          </span>
          <span className="truncate">{p.label}</span>
        </motion.li>
      ))}
    </ul>
  );
}

function Builder({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-card shadow-[0_30px_80px_-30px_rgba(0,82,217,0.18)]"
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--neutral-50)]/80 px-3 py-2 backdrop-blur-sm">
        <span className="h-2 w-2 rounded-full bg-[#FF5F57]/70" />
        <span className="h-2 w-2 rounded-full bg-[#FEBC2E]/70" />
        <span className="h-2 w-2 rounded-full bg-[#28C840]/70" />
        <div className="ml-2 inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          <span className="h-1 w-1 rounded-full bg-[var(--brand-blue)]" />
          andoxa.fr
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-[var(--border)] bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workflow
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            Confirmation RDV — Outbound LinkedIn
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--brand-blue)] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(0,82,217,0.45)]">
          <Save size={12} />
          Sauvegarder
        </span>
      </div>

      <ol className="relative flex flex-col gap-3 p-5">
        {BUILDER.map((node, i) => (
          <React.Fragment key={`${node.category}-${i}`}>
            <BuilderNode node={node} index={i} reduce={reduce} />
            {i < BUILDER.length - 1 && <Connector index={i} reduce={reduce} />}
          </React.Fragment>
        ))}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, delay: 0.15 + BUILDER.length * 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--border)] bg-[var(--neutral-50)]/70 px-3 py-1.5 text-[11px] text-muted-foreground"
        >
          <Plus size={12} />
          Ajouter une étape
        </motion.div>
      </ol>
    </motion.div>
  );
}

function BuilderNode({ node, index, reduce }: { node: Node; index: number; reduce: boolean }) {
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: 0.15 + index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-[var(--border)] bg-card px-3 py-2.5 shadow-[0_4px_14px_-10px_rgba(0,0,0,0.12)]"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1",
            TONE[node.categoryTone],
          )}
        >
          {node.category}
        </span>
        <span className="text-[10px] text-muted-foreground">étape {index + 1}</span>
      </div>
      <div className="mt-2 flex items-start gap-2.5">
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md ring-1", TONE[node.categoryTone])}>
          <node.icon size={13} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{node.title}</p>
          <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">{node.sub}</p>
        </div>
      </div>
    </motion.li>
  );
}

function Connector({ index, reduce }: { index: number; reduce: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      initial={reduce ? false : { scaleY: 0 }}
      whileInView={reduce ? undefined : { scaleY: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.35, delay: 0.15 + index * 0.12 + 0.15, ease: [0.16, 1, 0.3, 1] }}
      style={{ originY: 0 }}
      className="mx-auto h-3 w-px border-l border-dashed border-[var(--brand-blue)]/40"
    />
  );
}
