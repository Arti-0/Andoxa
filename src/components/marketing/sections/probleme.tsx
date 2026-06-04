"use client";

import * as React from "react";
import {
  motion,
  animate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { Check, Copy, PieChart } from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { marketingAsset } from "@/lib/marketing/assets";
import { PLAN_PRESENTATION } from "@/lib/config/plans-config";
import { cn } from "@/lib/utils";

/**
 * Home section 2 — "Le coût de la stack".
 *
 * Condensed sibling of the full /pricing comparator (comparison-section.tsx):
 * same Tool model, same per-user prices, same logo loader. We deliberately
 * restrict the list to the columns Andoxa genuinely replaces (LinkedIn
 * campaigns, booking, calendar, CRM) and drop the automation tools (Zapier,
 * Make, n8n, Phantombuster), since Andoxa no longer ships workflows: putting
 * them in the total would inflate the comparison against features we don't
 * cover. Prices mirror /pricing so the two surfaces never contradict.
 */
type Tool = {
  id: string;
  name: string;
  perUserMonthly: number;
  bg: string;
  letter: string;
};

const TOOLS: Tool[] = [
  // Campagnes LinkedIn (invitation + premier message)
  { id: "lemlist", name: "Lemlist", perUserMonthly: 100, bg: "#6B5BFF", letter: "L" },
  { id: "waalaxy", name: "Waalaxy", perUserMonthly: 148, bg: "#3F2A8C", letter: "W" },
  { id: "lgm", name: "LaGrowthMachine", perUserMonthly: 120, bg: "#FF6B35", letter: "G" },
  // Booking / calendrier
  { id: "calendly", name: "Calendly", perUserMonthly: 18, bg: "#006BFF", letter: "C" },
  { id: "calcom", name: "Cal.com", perUserMonthly: 17, bg: "#111111", letter: "C" },
  // CRM / pipeline
  { id: "hubspot", name: "HubSpot", perUserMonthly: 92, bg: "#FF7A59", letter: "H" },
  { id: "pipedrive", name: "Pipedrive", perUserMonthly: 55, bg: "#0F2B46", letter: "P" },
  { id: "salesforce", name: "Salesforce", perUserMonthly: 92, bg: "#00A1E0", letter: "S" },
];

const TOOL_LOGO_EXT: Record<string, string> = {
  lemlist: "svg",
  waalaxy: "png",
  lgm: "jpeg",
  calendly: "svg",
  calcom: "jpeg",
  hubspot: "svg",
  pipedrive: "svg",
  salesforce: "svg",
};

// Realistic default agency stack (one tool per column they actually pay for).
const DEFAULT_SELECTED = new Set(["lemlist", "waalaxy", "calendly", "hubspot"]);
const DEFAULT_TEAM_SIZE = 8;
const MAX_TEAM_SIZE = 20;

const PAINS: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; description: string }[] = [
  {
    icon: Copy,
    title: "Le copier-coller entre outils.",
    description:
      "Un prospect répond sur LinkedIn, vous le ressaisissez dans le CRM, puis dans Calendly, puis dans la feuille de suivi. La même donnée, tapée quatre fois.",
  },
  {
    icon: PieChart,
    title: "La donnée éclatée.",
    description:
      "Le pipe vit dans le CRM, les conversations dans LinkedIn, les RDV dans Calendly. Sortir une vue propre du pipe par SDR oblige à tout recoller à la main.",
  },
];

function andoxaPerUser(teamSize: number): number {
  return teamSize <= 1 ? PLAN_PRESENTATION.solo.price!.annual : PLAN_PRESENTATION.team.price!.annual;
}
function andoxaMonthlyTotal(teamSize: number): number {
  const p = andoxaPerUser(teamSize);
  return teamSize <= 1 ? p : p * teamSize;
}
function andoxaPlanLabel(teamSize: number): string {
  return teamSize <= 1 ? "Plan Solo" : "Plan Team";
}

function formatEuro(n: number) {
  return Math.round(n).toLocaleString("fr-FR");
}

function AnimatedEuro({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const [d, setD] = React.useState(value);
  React.useEffect(() => {
    if (reduce) {
      setD(value);
      return;
    }
    const ctrl = animate(mv, value, { duration: 0.4, ease: [0.16, 1, 0.3, 1] });
    const unsub = mv.on("change", (v) => setD(v));
    return () => {
      ctrl.stop();
      unsub();
    };
  }, [value, mv, reduce]);
  return <>{formatEuro(d)}</>;
}

export function MarketingProblemeSection() {
  const reduce = useReducedMotion();
  const [selected, setSelected] = React.useState<Set<string>>(new Set(DEFAULT_SELECTED));
  const [teamSize, setTeamSize] = React.useState(DEFAULT_TEAM_SIZE);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stackMonthly = TOOLS.filter((t) => selected.has(t.id)).reduce(
    (s, t) => s + t.perUserMonthly * teamSize,
    0,
  );
  const andoxaMonthly = andoxaMonthlyTotal(teamSize);
  const savings = Math.max(0, stackMonthly - andoxaMonthly);
  const multiple = andoxaMonthly > 0 ? stackMonthly / andoxaMonthly : 0;

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
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
          <Eyebrow className="justify-center">Le coût</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Lemlist, Sales Nav, Calendly, HubSpot.{" "}
            <span className="text-[var(--brand-blue)]">Et la facture qui va avec.</span>
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Cochez les outils que vous payez aujourd&apos;hui. Le total tombe en face du prix
            d&apos;Andoxa, sur le périmètre qu&apos;on remplace vraiment.
          </p>
        </div>

        {/* Calculateur condensé */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8"
        >
          {/* GAUCHE : sélection des outils + curseur équipe */}
          <div className="rounded-2xl border border-[var(--border)] bg-card p-6 shadow-[0_4px_18px_-12px_rgba(0,82,217,0.12)] sm:p-8">
            <p className="text-base font-semibold text-foreground sm:text-lg">Votre stack actuelle</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-[0.8rem]">
              Quels outils utilisez-vous pour prospecter, booker et suivre vos deals&nbsp;?
            </p>

            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {TOOLS.map((tool) => (
                <ToolToggle
                  key={tool.id}
                  tool={tool}
                  selected={selected.has(tool.id)}
                  onClick={() => toggle(tool.id)}
                />
              ))}
            </div>

            <div className="mt-7 rounded-xl border border-[var(--border)] bg-[var(--neutral-50)]/70 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="team-size-pb" className="text-sm font-medium text-foreground">
                  Collaborateurs concernés
                </label>
                <span className="font-mono text-sm font-semibold tabular text-foreground">
                  {teamSize} {teamSize === 1 ? "collaborateur" : "collaborateurs"}
                </span>
              </div>
              <input
                id="team-size-pb"
                type="range"
                min={1}
                max={MAX_TEAM_SIZE}
                step={1}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                aria-label="Collaborateurs concernés"
                className="andoxa-range mt-3 w-full"
                style={{ ["--range-fill" as string]: `${((teamSize - 1) / (MAX_TEAM_SIZE - 1)) * 100}%` }}
              />
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                Au-delà de 20 collaborateurs&nbsp;: tarif sur devis.
              </p>
            </div>
          </div>

          {/* DROITE : total stack vs Andoxa, côte à côte */}
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-card p-5 shadow-[0_4px_18px_-12px_rgba(0,82,217,0.12)]">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Votre stack
                </p>
                <p className="font-display mt-2 whitespace-nowrap text-2xl font-medium tabular text-foreground sm:text-3xl">
                  <AnimatedEuro value={stackMonthly} />
                  &nbsp;€
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">par mois</p>
              </div>
              <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--brand-blue)] bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-dark)] p-5 text-white shadow-[0_18px_50px_-24px_rgba(0,82,217,0.45)]">
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/75">
                  Andoxa
                </p>
                <p className="font-display mt-2 whitespace-nowrap text-2xl font-medium tabular text-white sm:text-3xl">
                  <AnimatedEuro value={andoxaMonthly} />
                  &nbsp;€
                </p>
                <p className="mt-1 text-[11px] text-white/70">par mois</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-card p-6 shadow-[0_4px_18px_-12px_rgba(0,82,217,0.12)] sm:p-7">
              {savings > 0 ? (
                <>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
                    Vous payez aujourd&apos;hui
                  </p>
                  <p className="font-display mt-2 whitespace-nowrap text-4xl font-medium tabular text-foreground sm:text-[2.75rem]">
                    <AnimatedEuro value={multiple} />
                    <span className="text-2xl">&nbsp;×</span>{" "}
                    <span className="text-base font-normal text-muted-foreground">le prix d&apos;Andoxa</span>
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Soit{" "}
                    <span className="font-semibold text-foreground">
                      <AnimatedEuro value={savings} />&nbsp;€
                    </span>{" "}
                    de moins par mois ({andoxaPlanLabel(teamSize)},{" "}
                    {andoxaPerUser(teamSize)}&nbsp;€/utilisateur, facturation annuelle), pour les
                    mêmes colonnes&nbsp;: campagnes LinkedIn, booking, calendrier, CRM.
                  </p>
                </>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Sélectionnez les outils de votre stack pour voir l&apos;écart avec Andoxa.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <p className="mx-auto mt-5 max-w-3xl text-center text-[11px] leading-5 text-muted-foreground">
          Tarifs publics 2026, sur le tier minimum nécessaire pour couvrir le même périmètre
          qu&apos;Andoxa. Comparaison limitée aux outils qu&apos;Andoxa remplace réellement.
        </p>

        {/* Deux pains en soutien */}
        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {PAINS.map((pain, i) => (
            <motion.article
              key={pain.title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-[var(--border)] bg-card p-6 sm:p-7"
            >
              <div className="flex items-start gap-3">
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
      </Container>
    </section>
  );
}

/* ── tool toggle + logo badge (repris de comparison-section) ────────────────── */

function ToolToggle({
  tool,
  selected,
  onClick,
}: {
  tool: Tool;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="group flex cursor-pointer items-center gap-3 rounded-md border-b border-[var(--neutral-100)] px-2 pb-4 pt-2 text-left transition-colors duration-150 hover:bg-[var(--neutral-100)]/50"
    >
      <span
        className={cn(
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full transition-all duration-150",
          selected
            ? "bg-[var(--brand-blue)] shadow-[0_1px_3px_-1px_rgba(0,82,217,0.5)]"
            : "border-[1.5px] border-[var(--neutral-300)] bg-card group-hover:border-[var(--brand-blue)]/50",
        )}
      >
        {selected && <Check size={11} strokeWidth={3.25} className="text-white" />}
      </span>
      <ToolBadge tool={tool} size={20} />
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-normal leading-tight text-foreground/85">
        {tool.name}
      </span>
    </button>
  );
}

function ToolBadge({
  tool,
  size = 22,
}: {
  tool: Pick<Tool, "id" | "name" | "letter" | "bg">;
  size?: number;
}) {
  const tile = size + 8;
  const ext = TOOL_LOGO_EXT[tool.id];
  const [errored, setErrored] = React.useState(false);
  const showLetter = !ext || errored;

  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-md bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)] ring-1 ring-black/5"
      style={{ height: tile, width: tile }}
    >
      {showLetter ? (
        <span
          aria-hidden="true"
          className="grid place-items-center font-display font-semibold leading-none"
          style={{ height: size, width: size, color: tool.bg, fontSize: Math.round(size * 0.78) }}
        >
          {tool.letter}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={marketingAsset(`logos/${tool.id}.${ext}`)}
          alt={tool.name}
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "contain" }}
          onError={() => setErrored(true)}
        />
      )}
    </span>
  );
}
