"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { cn } from "@/lib/utils";
import { PLAN_PRESENTATION } from "@/lib/config/plans-config";
import { marketingAsset } from "@/lib/marketing/assets";

/**
 * Interactive "your current stack vs Andoxa" savings comparator on /pricing.
 * The user picks the tools they currently pay for + their team size; we add
 * up the per-user equivalent monthly cost, compare it to the Andoxa plan
 * auto-selected for that team size, and surface the annual savings.
 *
 * Logos live in /public/logos/<id>.{svg,png,jpg,jpeg,webp} — the loader probes
 * extensions in order and falls back to a coloured letter tile if none exist.
 */
type Tool = {
  id: string;
  name: string;
  category: string;
  perUserMonthly: number;
  bg: string;
  letter: string;
};

const TOOLS: Tool[] = [
  { id: "hubspot", name: "HubSpot", category: "CRM · Sales Hub Pro", perUserMonthly: 92, bg: "#FF7A59", letter: "H" },
  { id: "pipedrive", name: "Pipedrive", category: "CRM · Premium", perUserMonthly: 55, bg: "#0F2B46", letter: "P" },
  { id: "salesforce", name: "Salesforce", category: "CRM · Pro Suite", perUserMonthly: 92, bg: "#00A1E0", letter: "S" },
  { id: "monday", name: "Monday.com", category: "CRM · Sales CRM Pro", perUserMonthly: 31, bg: "#FF3D57", letter: "M" },
  { id: "odoo", name: "Odoo", category: "CRM · Custom", perUserMonthly: 43, bg: "#714B67", letter: "O" },
  { id: "lemlist", name: "Lemlist", category: "Multichannel Expert", perUserMonthly: 100, bg: "#6B5BFF", letter: "L" },
  { id: "waalaxy", name: "Waalaxy", category: "Business + Inbox", perUserMonthly: 148, bg: "#3F2A8C", letter: "W" },
  { id: "lgm", name: "LaGrowthMachine", category: "Pro / identity", perUserMonthly: 120, bg: "#FF6B35", letter: "G" },
  { id: "phantombuster", name: "Phantombuster", category: "Pro · workspace", perUserMonthly: 29.2, bg: "#1F1F1F", letter: "P" },
  { id: "apollo", name: "Apollo", category: "Professional", perUserMonthly: 91, bg: "#0080FF", letter: "A" },
  { id: "calendly", name: "Calendly", category: "Teams", perUserMonthly: 18, bg: "#006BFF", letter: "C" },
  { id: "calcom", name: "Cal.com", category: "Teams", perUserMonthly: 17, bg: "#111111", letter: "C" },
  { id: "zapier", name: "Zapier", category: "Team · workspace", perUserMonthly: 19.2, bg: "#FF4A00", letter: "Z" },
  { id: "make", name: "Make", category: "Pro · workspace", perUserMonthly: 3.4, bg: "#5C2BE2", letter: "M" },
  { id: "n8n", name: "n8n", category: "Cloud Pro · workspace", perUserMonthly: 11, bg: "#EA4B71", letter: "n" },
];

const DEFAULT_SELECTED = new Set(TOOLS.map((t) => t.id));
const DEFAULT_TEAM_SIZE = 5;
const ANDOXA_BG = "#0052D9";

// 20+ users → Custom (contact-sales). We pin the comparator's "indicative"
// per-user rate here rather than promising a public Custom price — kept
// deliberately lower than Team to communicate "volume discount on devis".
const CUSTOM_INDICATIVE_PER_USER = 29;

function andoxaPerUser(teamSize: number): number {
  if (teamSize <= 1) return PLAN_PRESENTATION.solo.price!.annual;
  if (teamSize <= 20) return PLAN_PRESENTATION.team.price!.annual;
  return CUSTOM_INDICATIVE_PER_USER;
}
function andoxaMonthlyTotal(teamSize: number): number {
  const p = andoxaPerUser(teamSize);
  return teamSize <= 1 ? p : p * teamSize;
}
function andoxaPlanLabel(teamSize: number): string {
  if (teamSize <= 1) return "Plan Solo";
  if (teamSize <= 20) return "Plan Team";
  return "Plan Custom";
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

export function ComparisonSection() {
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

  const byCategory = TOOLS.filter((t) => selected.has(t.id)).map((t) => ({
    ...t,
    monthly: t.perUserMonthly * teamSize,
  }));
  const sorted = [...byCategory].sort((a, b) => b.monthly - a.monthly);
  const stackMonthly = sorted.reduce((s, t) => s + t.monthly, 0);
  const andoxaMonthly = andoxaMonthlyTotal(teamSize);
  const monthlySavings = Math.max(0, stackMonthly - andoxaMonthly);
  const annualSavings = monthlySavings * 12;
  const annualStack = stackMonthly * 12;

  return (
    <section className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--neutral-50)]/60 py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/4 h-[400px] w-[600px] rounded-full bg-[var(--brand-blue-tint)]/40 blur-3xl"
      />
      <Container className="relative">
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-16">
          <Eyebrow className="justify-center">Comparatif</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Un seul outil.{" "}
            <span className="text-[var(--brand-blue)]">Tous ces abonnements en moins</span>.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Sélectionnez les outils que vous utilisez aujourd&apos;hui, ajustez la taille de votre
            équipe, et voyez l&apos;économie annuelle de passer à Andoxa.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8">
          {/* LEFT — tool grid + slider */}
          <div className="rounded-2xl border border-[var(--border)] bg-card p-6 shadow-[0_4px_18px_-12px_rgba(0,82,217,0.12)] sm:p-8">
            <p className="text-base font-semibold text-foreground sm:text-lg">Votre stack actuelle</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-[0.8rem]">
              Quelles applications utilisez-vous ?
            </p>

            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
              {TOOLS.map((tool) => (
                <ToolToggle
                  key={tool.id}
                  tool={tool}
                  selected={selected.has(tool.id)}
                  onClick={() => toggle(tool.id)}
                />
              ))}
            </div>

            <BarChart tools={byCategory} teamSize={teamSize} andoxaMonthly={andoxaMonthly} reduce={!!reduce} />

            <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--neutral-50)]/70 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="team-size-cmp" className="text-sm font-medium text-foreground">
                  Collaborateurs dans l&apos;équipe
                </label>
                <span className="font-mono text-sm font-semibold tabular text-foreground">
                  {teamSize} {teamSize === 1 ? "collaborateur" : "collaborateurs"}
                </span>
              </div>
              <input
                id="team-size-cmp"
                type="range"
                min={1}
                max={50}
                step={1}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                aria-label="Collaborateurs dans l'équipe"
                className="andoxa-range mt-3 w-full"
                style={{ ["--range-fill" as string]: `${((teamSize - 1) / 49) * 100}%` }}
              />
            </div>
          </div>

          {/* RIGHT — apps list + savings + CTA */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-[var(--border)] bg-card p-6 shadow-[0_4px_18px_-12px_rgba(0,82,217,0.12)] sm:p-7">
              <p className="text-base font-semibold text-foreground sm:text-lg">Apps à remplacer</p>
              {sorted.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--neutral-50)]/70 p-5 text-center text-sm text-muted-foreground">
                  Sélectionnez au moins un outil pour voir l&apos;économie.
                </div>
              ) : (
                <>
                  <ul className="mt-4 divide-y divide-[var(--border)]">
                    {sorted.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <ToolBadge tool={t} size={20} />
                          <span className="truncate text-sm font-medium text-foreground">{t.name}</span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap font-mono text-sm font-semibold tabular text-foreground">
                          {formatEuro(t.monthly)}&nbsp;€
                          <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">/mois</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-baseline justify-between border-t-2 border-[var(--border)] pt-3">
                    <span className="text-sm font-semibold text-foreground">Total</span>
                    <span className="font-display whitespace-nowrap text-xl font-medium tabular text-foreground">
                      <AnimatedEuro value={stackMonthly} />
                      &nbsp;€
                      <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">/mois</span>
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {sorted.length} {sorted.length === 1 ? "app" : "apps"} pour {teamSize}{" "}
                    {teamSize === 1 ? "utilisateur" : "utilisateurs"} ={" "}
                    <span className="font-semibold text-foreground">
                      {formatEuro(annualStack)}&nbsp;€&nbsp;/&nbsp;an
                    </span>
                  </p>
                </>
              )}
            </div>

            <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--brand-blue)] bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-dark)] p-6 text-white shadow-[0_18px_50px_-22px_rgba(0,82,217,0.45)] sm:p-7">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                Économies nettes / an
              </p>
              <AnimatePresence mode="popLayout">
                {monthlySavings > 0 ? (
                  <motion.div
                    key="savings"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={reduce ? undefined : { opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="font-display mt-2 whitespace-nowrap text-4xl font-medium tabular text-white sm:text-5xl">
                      <AnimatedEuro value={annualSavings} />
                      &nbsp;€
                    </p>
                    <p className="mt-3 text-xs leading-5 text-white/70 sm:text-[0.8rem]">
                      En passant à Andoxa ({andoxaPlanLabel(teamSize)}) ·{" "}
                      <span className="font-semibold text-white">
                        {formatEuro(andoxaMonthly)}&nbsp;€/mois
                      </span>{" "}
                      pour {teamSize} {teamSize === 1 ? "user" : "users"}
                    </p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="empty"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={reduce ? undefined : { opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-2 text-sm text-white/65"
                  >
                    Sélectionnez vos outils pour voir l&apos;économie annuelle.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <Button href="/contact?objet=demo" size="lg" className="w-full justify-center">
              Réserver une démo
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-3xl text-center text-[11px] leading-5 text-muted-foreground">
          Tarifs publics mai 2026, tier minimum nécessaire pour matcher les features Andoxa (annual).
          Andoxa : {PLAN_PRESENTATION.solo.price!.annual} €/mois Solo,{" "}
          {PLAN_PRESENTATION.team.price!.annual} €/user/mois Team (3-20),{" "}
          {CUSTOM_INDICATIVE_PER_USER} €/user/mois Custom (21+, indicatif, sur devis).
        </p>
      </Container>
    </section>
  );
}

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

/**
 * Direct logo lookup. Logos live in the `homepage-assets` Supabase bucket at
 * `logos/<id>.<ext>` — see scripts/upload-marketing-assets.ts. We resolve the
 * extension from this static map instead of probing onError, so the browser
 * makes one request per badge instead of up to four for non-SVG logos.
 *
 * Any tool ID missing from the map falls back to the coloured letter tile.
 */
const TOOL_LOGO_EXT: Record<string, string> = {
  hubspot: "svg",
  pipedrive: "svg",
  salesforce: "svg",
  monday: "svg",
  odoo: "svg",
  lemlist: "svg",
  waalaxy: "png",
  lgm: "jpeg",
  phantombuster: "svg",
  apollo: "png",
  calendly: "svg",
  calcom: "jpeg",
  zapier: "jpeg",
  make: "svg",
  n8n: "svg",
};

function ToolBadge({
  tool,
  size = 22,
}: {
  tool: Pick<Tool, "id" | "name" | "letter" | "bg">;
  size?: number;
}) {
  const tile = size + 8;
  const ext = TOOL_LOGO_EXT[tool.id];
  // `errored` keeps the zero-broken-image guarantee: any missing/404 logo
  // (or one we forgot to add to TOOL_LOGO_EXT) falls back to the letter tile.
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

function BarChart({
  tools,
  teamSize,
  andoxaMonthly,
  reduce,
}: {
  tools: (Tool & { monthly: number })[];
  teamSize: number;
  andoxaMonthly: number;
  reduce: boolean;
}) {
  const data = [
    ...tools,
    {
      id: "andoxa",
      name: "Andoxa",
      category: "—",
      perUserMonthly: 0,
      monthly: andoxaMonthly,
      bg: ANDOXA_BG,
      letter: "A",
      isAndoxa: true,
    },
  ];
  const max = Math.max(...data.map((d) => d.monthly), 1);
  const H = 220;
  if (tools.length === 0) {
    return (
      <div className="mt-8 hidden h-[300px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--neutral-50)]/40 text-xs text-muted-foreground sm:flex">
        Sélectionnez des outils pour visualiser le coût.
      </div>
    );
  }
  return (
    <div className="mt-8 hidden rounded-xl border border-[var(--border)] bg-card p-5 sm:block sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-[600px] items-stretch justify-center gap-3 sm:gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {data.map((item) => {
            const isAndoxa = "isAndoxa" in item && item.isAndoxa;
            const h = Math.max((item.monthly / max) * H, 4);
            return (
              <motion.div
                layout
                key={item.id}
                initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex min-w-0 flex-1 basis-0 flex-col items-center"
                style={{ maxWidth: 80 }}
              >
                <div className="flex w-full flex-col items-center justify-end" style={{ height: H + 24 }}>
                  <span
                    className={cn(
                      "mb-1.5 whitespace-nowrap font-mono text-[10px] leading-none tabular",
                      isAndoxa ? "font-semibold text-foreground" : "text-foreground/55",
                    )}
                  >
                    {formatEuro(item.monthly)}€
                  </span>
                  <motion.div
                    layout
                    initial={reduce ? false : { height: 0 }}
                    animate={{ height: h }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className={cn("rounded-full", isAndoxa ? "bg-foreground" : "bg-[var(--neutral-200)]")}
                    style={{ width: "60%", minWidth: 18, maxWidth: 52 }}
                  />
                </div>
                <div className="mt-5 flex h-9 items-center justify-center">
                  <span
                    aria-label={item.name}
                    className="grid place-items-center rounded-md font-display font-semibold leading-none text-white"
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: item.bg,
                      fontSize: 14,
                    }}
                  >
                    {item.letter}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Coût mensuel · {teamSize} {teamSize === 1 ? "collaborateur" : "collaborateurs"}
      </p>
    </div>
  );
}
