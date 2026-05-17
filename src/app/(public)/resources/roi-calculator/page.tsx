"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, CalendarCheck, Clock, Sparkles, TrendingUp } from "lucide-react";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { Button } from "@/components/marketing/ui/button";
import { cn } from "@/lib/utils";

/* ── compute model ────────────────────────────────────────────────────────── */

const ASSUMED_NOSHOW_RATE = 0.25;
const WORKING_WEEKS_PER_MONTH = 4.33;
const ROI_CAP = 30;

type PlanKey = "solo" | "team" | "scale";
type Billing = "monthly" | "annual";

const PLAN_PRICES: Record<PlanKey, Record<Billing, number>> = {
  solo: { monthly: 49, annual: 39 },
  team: { monthly: 45, annual: 36 },
  scale: { monthly: 39, annual: 29 },
};
const PLAN_LABEL: Record<PlanKey, string> = {
  solo: "Plan Solo",
  team: "Plan Team",
  scale: "Plan Scale",
};

function autoPlanFor(teamSize: number): PlanKey {
  if (teamSize <= 1) return "solo";
  if (teamSize <= 20) return "team";
  return "scale";
}

function monthlyCost(plan: PlanKey, teamSize: number, billing: Billing): number {
  const p = PLAN_PRICES[plan][billing];
  return plan === "solo" ? p : p * teamSize;
}

interface Inputs {
  teamSize: number;
  rdvPerCommercial: number;
  closingRate: number;
  panierMoyen: number;
  margePct: number;
  prospectionHoursPerWeek: number;
}
interface Hypotheses {
  upliftVolume: number;
  reductionNoshow: number;
  gainTempsProspection: number;
}

const DEFAULT_INPUTS: Inputs = {
  teamSize: 5,
  rdvPerCommercial: 6,
  closingRate: 25,
  panierMoyen: 8000,
  margePct: 50,
  prospectionHoursPerWeek: 12,
};
const DEFAULT_HYPOTHESES: Hypotheses = {
  upliftVolume: 35,
  reductionNoshow: 30,
  gainTempsProspection: 50,
};

function compute(inputs: Inputs, hyp: Hypotheses, billing: Billing) {
  const plan = autoPlanFor(inputs.teamSize);
  const cost = monthlyCost(plan, inputs.teamSize, billing);
  const teamRdv = inputs.rdvPerCommercial * inputs.teamSize;
  const effectiveUplift =
    hyp.upliftVolume / 100 + ASSUMED_NOSHOW_RATE * (hyp.reductionNoshow / 100);
  const addRdv = teamRdv * effectiveUplift;
  const addDeals = addRdv * (inputs.closingRate / 100);
  const addCa = addDeals * inputs.panierMoyen;
  const addMargin = addCa * (inputs.margePct / 100);
  const rawRoi = cost > 0 ? addMargin / cost : 0;
  const hours =
    inputs.teamSize *
    inputs.prospectionHoursPerWeek *
    (hyp.gainTempsProspection / 100) *
    WORKING_WEEKS_PER_MONTH;
  return {
    plan,
    monthlyCost: cost,
    teamRdv,
    addRdv,
    addCa,
    addMargin,
    rawRoi,
    roiCapped: Math.min(rawRoi, ROI_CAP),
    roiOverflow: rawRoi > ROI_CAP,
    hours,
  };
}

function formatEuro(n: number) {
  return Math.round(n).toLocaleString("fr-FR");
}
function formatNum(n: number, d = 0) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });
}

function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const [d, setD] = React.useState(value);
  React.useEffect(() => {
    if (reduce) {
      setD(value);
      return;
    }
    const ctrl = animate(mv, value, { duration: 0.45, ease: [0.16, 1, 0.3, 1] });
    const unsub = mv.on("change", (v) => setD(v));
    return () => {
      ctrl.stop();
      unsub();
    };
  }, [value, mv, reduce]);
  return <>{format(d)}</>;
}

/* ── slider row ───────────────────────────────────────────────────────────── */

function SliderRow({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  format,
  subtle,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  subtle?: boolean;
}) {
  const fillPct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className={cn("text-sm font-medium text-foreground", subtle && "text-foreground/85")}>
          {label}
        </label>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap font-mono text-sm font-semibold tabular text-foreground sm:text-[0.95rem]",
            subtle && "text-[var(--brand-blue)]",
          )}
        >
          {format(value)}
        </span>
      </div>
      {hint && <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{hint}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="andoxa-range mt-2 w-full"
        style={{ ["--range-fill" as string]: `${fillPct}%` }}
      />
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function CalculateurRoiPage() {
  const [inputs, setInputs] = React.useState<Inputs>(DEFAULT_INPUTS);
  const [hyp, setHyp] = React.useState<Hypotheses>(DEFAULT_HYPOTHESES);
  const billing: Billing = "annual";
  const r = React.useMemo(() => compute(inputs, hyp, billing), [inputs, hyp]);

  const setI = <K extends keyof Inputs>(k: K, v: Inputs[K]) =>
    setInputs((s) => ({ ...s, [k]: v }));
  const setH = <K extends keyof Hypotheses>(k: K, v: Hypotheses[K]) =>
    setHyp((s) => ({ ...s, [k]: v }));

  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <section className="relative isolate overflow-hidden pb-12 pt-32 sm:pb-16 sm:pt-40">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 top-0 -z-[5] h-[420px] w-[600px] rounded-full bg-[var(--brand-blue-tint)]/55 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 top-1/3 -z-[5] h-[360px] w-[520px] rounded-full bg-[var(--brand-orange-tint)]/45 blur-3xl"
          />
          <Container className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <Eyebrow className="justify-center">Calculateur de ROI</Eyebrow>
              <h1 className="font-display mt-6 text-4xl text-foreground sm:text-5xl lg:text-6xl">
                <span className="block">Combien Andoxa peut faire</span>
                <span className="block text-[var(--brand-blue)]">gagner à votre équipe.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Personnalisé en 30 secondes. Chiffres ajustables, calcul transparent.
              </p>
            </div>
          </Container>
        </section>

        <section className="border-t border-[var(--border)] py-16 sm:py-24">
          <Container>
            <div className="mx-auto max-w-5xl">
              {/* INPUTS */}
              <div className="rounded-2xl border border-[var(--border)] bg-card p-6 shadow-[0_4px_18px_-12px_rgba(0,82,217,0.18)] sm:p-8">
                <div className="mb-6 flex items-baseline gap-3">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
                    01
                  </span>
                  <div>
                    <p className="text-base font-semibold text-foreground sm:text-lg">
                      Votre situation actuelle
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-[0.8rem]">
                      Ajustez les curseurs pour refléter votre équipe.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  <SliderRow
                    label="Équipe commerciale"
                    value={inputs.teamSize}
                    onChange={(v) => setI("teamSize", v)}
                    min={1}
                    max={50}
                    step={1}
                    format={(v) => `${v} ${v === 1 ? "commercial" : "commerciaux"}`}
                  />
                  <SliderRow
                    label="RDV bookés / mois / commercial"
                    hint="Par personne, pas total équipe"
                    value={inputs.rdvPerCommercial}
                    onChange={(v) => setI("rdvPerCommercial", v)}
                    min={1}
                    max={30}
                    step={1}
                    format={(v) => `${v} RDV`}
                  />
                  <SliderRow
                    label="Taux de closing"
                    value={inputs.closingRate}
                    onChange={(v) => setI("closingRate", v)}
                    min={5}
                    max={50}
                    step={1}
                    format={(v) => `${v} %`}
                  />
                  <SliderRow
                    label="Panier moyen par deal"
                    value={inputs.panierMoyen}
                    onChange={(v) => setI("panierMoyen", v)}
                    min={500}
                    max={50000}
                    step={500}
                    format={(v) => `${formatEuro(v)} €`}
                  />
                  <SliderRow
                    label="Marge brute par deal"
                    value={inputs.margePct}
                    onChange={(v) => setI("margePct", v)}
                    min={10}
                    max={95}
                    step={5}
                    format={(v) => `${v} %`}
                  />
                  <SliderRow
                    label="Prospection manuelle / sem. / commercial"
                    value={inputs.prospectionHoursPerWeek}
                    onChange={(v) => setI("prospectionHoursPerWeek", v)}
                    min={2}
                    max={30}
                    step={1}
                    format={(v) => `${v} h`}
                  />
                </div>
                <p className="mt-6 border-t border-[var(--border)] pt-4 text-sm text-muted-foreground">
                  Plan auto-sélectionné&nbsp;:{" "}
                  <strong className="text-foreground">{PLAN_LABEL[r.plan]}</strong> ·{" "}
                  <strong className="text-foreground">{formatEuro(r.monthlyCost)} €/mois</strong>{" "}
                  (facturation annuelle).
                </p>
              </div>

              {/* RESULT */}
              <div className="my-6 flex justify-center" aria-hidden="true">
                <span className="h-10 w-px bg-gradient-to-b from-[var(--border)] via-[var(--brand-blue)]/40 to-transparent" />
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--brand-blue-tint)]/45 via-card to-card p-6 shadow-[0_10px_32px_-14px_rgba(0,82,217,0.22)] sm:p-8 lg:p-10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--brand-blue-tint)] opacity-50 blur-3xl"
                />
                <div className="absolute right-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-blue)]/20 bg-card/85 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--brand-blue)] backdrop-blur">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-blue)] opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
                  </span>
                  Live
                </div>
                <div className="relative">
                  <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
                    <span>02</span>
                    <span className="h-px w-8 bg-[var(--brand-blue)]/30" />
                    <span>Votre estimation</span>
                  </span>

                  <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        CA additionnel estimé, par mois
                      </p>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-3"
                      >
                        <span className="font-display inline-block whitespace-nowrap text-5xl tracking-tight tabular text-foreground sm:text-6xl lg:text-7xl">
                          +<AnimatedNumber value={r.addCa} format={formatEuro} />
                          <span>&nbsp;€</span>
                        </span>
                      </motion.div>
                      <p className="mt-4 max-w-md text-xs leading-5 text-muted-foreground sm:text-[0.85rem]">
                        Pour{" "}
                        <span className="font-semibold text-foreground">
                          {inputs.teamSize} {inputs.teamSize === 1 ? "commercial" : "commerciaux"}
                        </span>{" "}
                        à{" "}
                        <span className="font-semibold text-foreground">
                          {inputs.rdvPerCommercial} RDV/mois chacun
                        </span>{" "}
                        (
                        <span className="font-medium">{r.teamRdv} RDV/mois équipe</span>
                        ), à équipe constante.
                      </p>
                    </div>

                    <div className="space-y-3 lg:border-l lg:border-[var(--border)]/70 lg:pl-10">
                      <CompactMetric
                        icon={TrendingUp}
                        label="RDV qualifiés / mois"
                        value={
                          <span className="whitespace-nowrap">
                            +<AnimatedNumber value={r.addRdv} format={(v) => formatNum(v, 0)} />
                          </span>
                        }
                      />
                      <CompactMetric
                        icon={Clock}
                        label="Heures récupérées / mois"
                        value={
                          <span className="whitespace-nowrap">
                            <AnimatedNumber value={r.hours} format={(v) => `${formatNum(v, 0)} h`} />
                          </span>
                        }
                      />
                      <CompactMetric
                        icon={Sparkles}
                        label="ROI sur la marge"
                        value={
                          <span className="whitespace-nowrap">
                            {r.roiOverflow ? (
                              <>&gt; {ROI_CAP}&nbsp;×</>
                            ) : (
                              <AnimatedNumber
                                value={r.roiCapped}
                                format={(v) => `${formatNum(v, 1)} ×`}
                              />
                            )}
                          </span>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* HYPOTHESES */}
              <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--neutral-50)]/50 p-6 sm:p-8">
                <div className="mb-5 flex items-baseline gap-3">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
                    03
                  </span>
                  <div>
                    <p className="text-base font-semibold text-foreground sm:text-lg">
                      Hypothèses du calcul
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-[0.8rem]">
                      Basé sur les retours moyens de nos clients. Ajustez pour un scénario plus
                      prudent ou plus agressif.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-3">
                  <SliderRow
                    label="Uplift volume RDV"
                    hint="Extension + séquences automatisées"
                    value={hyp.upliftVolume}
                    onChange={(v) => setH("upliftVolume", v)}
                    min={0}
                    max={60}
                    step={5}
                    format={(v) => `+${v} %`}
                    subtle
                  />
                  <SliderRow
                    label="Réduction des no-shows"
                    hint="Rappels WhatsApp pré-RDV"
                    value={hyp.reductionNoshow}
                    onChange={(v) => setH("reductionNoshow", v)}
                    min={0}
                    max={50}
                    step={5}
                    format={(v) => `−${v} %`}
                    subtle
                  />
                  <SliderRow
                    label="Gain de temps prospection"
                    hint="Sur les heures manuelles actuelles"
                    value={hyp.gainTempsProspection}
                    onChange={(v) => setH("gainTempsProspection", v)}
                    min={0}
                    max={80}
                    step={5}
                    format={(v) => `${v} %`}
                    subtle
                  />
                </div>
              </div>

              <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-5 text-muted-foreground">
                Calcul indicatif basé sur les hypothèses ajustables ci-dessus et sur un taux de
                no-show actuel estimé à 25 %. Le ROI est calculé à partir de la marge additionnelle,
                plafonné à {ROI_CAP} × dans l&apos;affichage.
              </p>
            </div>
          </Container>
        </section>

        <section className="relative isolate overflow-hidden border-t border-[var(--border)] bg-gradient-to-br from-[var(--brand-blue)] via-[var(--brand-blue)] to-[var(--brand-blue-dark)] py-24 sm:py-28">
          <Container className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl text-white sm:text-4xl lg:text-5xl">
                Prêt à débloquer{" "}
                <span className="inline-block whitespace-nowrap text-white">
                  +<AnimatedNumber value={r.addCa} format={formatEuro} />
                  &nbsp;€
                </span>{" "}
                de CA par mois&nbsp;?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
                30 minutes avec l&apos;équipe pour qu&apos;on regarde votre stack ensemble.
              </p>
              <div className="mt-10 flex justify-center">
                <Button
                  href="/contact?objet=demo"
                  size="lg"
                  className="bg-white !text-[var(--brand-blue-dark)] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] hover:bg-white/95"
                >
                  <CalendarCheck size={16} />
                  Réserver une démo
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CompactMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-card/80 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display mt-0.5 text-2xl font-medium tabular text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
