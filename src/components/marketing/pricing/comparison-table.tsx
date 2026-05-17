"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";

/**
 * Feature matrix — Andoxa vs the canonical competitor archetypes.
 * Three columns: a CRM (HubSpot/Pipedrive/etc.), an LinkedIn outreach tool
 * (Lemlist/Waalaxy/LGM), and Andoxa. Last column is highlighted.
 */
const ROWS: { group: string; features: { label: string; crm: boolean; outreach: boolean; andoxa: true }[] }[] = [
  {
    group: "Prospection",
    features: [
      { label: "Extension Chrome LinkedIn 1-clic", crm: false, outreach: true, andoxa: true },
      { label: "Séquences LinkedIn dans les limites", crm: false, outreach: true, andoxa: true },
      { label: "Séquences WhatsApp", crm: false, outreach: false, andoxa: true },
      { label: "Sessions d'appels téléphoniques", crm: false, outreach: false, andoxa: true },
    ],
  },
  {
    group: "Inbox & conversation",
    features: [
      { label: "Inbox LinkedIn + WhatsApp unifiée", crm: false, outreach: false, andoxa: true },
      { label: "Templates de messages + variables", crm: true, outreach: true, andoxa: true },
      { label: "Contexte CRM dans la conversation", crm: true, outreach: false, andoxa: true },
    ],
  },
  {
    group: "Calendrier & booking",
    features: [
      { label: "Lien de booking partageable", crm: false, outreach: false, andoxa: true },
      { label: "Séquences WhatsApp pré-RDV (J-1, H-1)", crm: false, outreach: false, andoxa: true },
      { label: "Récupération no-show automatique", crm: false, outreach: false, andoxa: true },
      { label: "Sync bidirectionnelle Google Calendar", crm: true, outreach: false, andoxa: true },
    ],
  },
  {
    group: "CRM & pilotage",
    features: [
      { label: "Pipeline kanban partagé", crm: true, outreach: false, andoxa: true },
      { label: "Listes & segments prospects", crm: true, outreach: true, andoxa: true },
      { label: "Dashboard live par SDR", crm: true, outreach: false, andoxa: true },
      { label: "Funnel de conversion temps réel", crm: true, outreach: false, andoxa: true },
    ],
  },
  {
    group: "Automatisation",
    features: [
      { label: "Workflows visuels (triggers + actions)", crm: false, outreach: false, andoxa: true },
      { label: "Conditions if/else et délais", crm: false, outreach: false, andoxa: true },
      { label: "Multi-canal LinkedIn + WhatsApp", crm: false, outreach: false, andoxa: true },
    ],
  },
];

function YN({ on, highlight }: { on: boolean; highlight?: boolean }) {
  return on ? (
    <span
      className={
        highlight
          ? "grid size-6 place-items-center rounded-full bg-[var(--brand-blue)] text-white"
          : "grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      }
    >
      <Check size={13} strokeWidth={3} />
    </span>
  ) : (
    <span className="grid size-6 place-items-center rounded-full bg-[var(--neutral-100)] text-muted-foreground/60">
      <Minus size={13} strokeWidth={3} />
    </span>
  );
}

export function ComparisonTable() {
  const reduce = useReducedMotion();
  return (
    <section className="relative border-t border-[var(--border)] bg-background py-24 sm:py-32">
      <Container>
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Eyebrow className="justify-center">Comparaison feature par feature</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Ce qu&apos;Andoxa fait,{" "}
            <span className="text-[var(--brand-blue)]">et que les autres ne font pas</span>.
          </h2>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[var(--border)] bg-card"
        >
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]/60">
                <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
                  Fonctionnalité
                </th>
                <th className="px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:px-4">
                  CRM classique
                </th>
                <th className="px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:px-4">
                  LinkedIn outreach
                </th>
                <th className="bg-[var(--brand-blue-tint)]/60 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--brand-blue-dark)] sm:px-4">
                  Andoxa
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((g) => (
                <Fragment key={g.group}>
                  <tr className="bg-[var(--neutral-50)]/30">
                    <td
                      colSpan={4}
                      className="px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-blue)] sm:px-6"
                    >
                      {g.group}
                    </td>
                  </tr>
                  {g.features.map((f) => (
                    <tr
                      key={`${g.group}:${f.label}`}
                      className="border-t border-[var(--border)]/70 transition-colors hover:bg-[var(--neutral-50)]/40"
                    >
                      <td className="px-4 py-3 text-sm text-foreground sm:px-6">{f.label}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex justify-center">
                          <YN on={f.crm} />
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex justify-center">
                          <YN on={f.outreach} />
                        </div>
                      </td>
                      <td className="bg-[var(--brand-blue-tint)]/40 px-3 py-3 sm:px-4">
                        <div className="flex justify-center">
                          <YN on={f.andoxa} highlight />
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </motion.div>
      </Container>
    </section>
  );
}
