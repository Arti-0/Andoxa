import { ArrowRight, Check, Minus } from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { AndoxaLogoIcon, AndoxaWordmark } from "@/components/marketing/icons/brand-icons";

/**
 * Reusable "Andoxa vs [competitor]" comparison page. Server component (no
 * client state) so it stays SEO-friendly.
 *
 * Honesty guardrails (see CLAUDE.md): real, established competitors, Andoxa in
 * pre-launch. Never invent competitor limits, never claim Andoxa is bigger or
 * more mature, neutral and factual tone. Andoxa does NOT do cold email or
 * automated sequences — stated plainly. Each tool wins on its own terrain.
 *
 * The optional price comparator compares at COMPARABLE SCOPE & VOLUME (not the
 * entry price) and always carries an "indicative, evolving" disclaimer.
 */
export type ComparisonCell = boolean | string;
export type ComparisonRow = {
  label: string;
  andoxa: ComparisonCell;
  competitor: ComparisonCell;
};

export type PriceComparison = {
  title?: string;
  scopeNote: string;
  andoxa: { price: string; unit: string; billing: string; includes: string };
  competitor: { price: string; unit: string; tag: string; breakdown: string; missing: string };
  note: string;
  disclaimer: string;
};

const POSITIONING =
  "Deux approches différentes. Voici laquelle correspond à votre équipe.";

function Cell({ value, highlight }: { value: ComparisonCell; highlight?: boolean }) {
  if (value === true) {
    return (
      <span
        className={
          highlight
            ? "mx-auto grid size-6 place-items-center rounded-full bg-[var(--brand-blue)] text-white"
            : "mx-auto grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        }
      >
        <Check size={13} strokeWidth={3} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="mx-auto grid size-6 place-items-center rounded-full bg-[var(--neutral-100)] text-muted-foreground/60">
        <Minus size={13} strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="block text-center text-[13px] leading-snug text-foreground/75">
      {value}
    </span>
  );
}

export function ComparisonPage({
  competitor,
  competitorLogo,
  positioning = POSITIONING,
  intro,
  rows,
  priceComparison,
  chooseCompetitor,
  chooseAndoxa,
}: {
  competitor: string;
  competitorLogo?: string;
  positioning?: string;
  intro: string;
  rows: ComparisonRow[];
  priceComparison?: PriceComparison;
  chooseCompetitor: string[];
  chooseAndoxa: string[];
}) {
  return (
    <>
      {/* 1 — Header : logos face à face + badge "vs" + fond discret */}
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-background py-20 sm:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_55%_45%_at_50%_28%,black,transparent_75%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-60px] -z-10 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-[var(--brand-blue-tint)]/50 blur-3xl"
        />
        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="justify-center">Comparatif</Eyebrow>

            <div className="mt-7 flex items-center justify-center gap-4 sm:gap-6">
              <span
                className="inline-flex h-16 min-w-16 items-center justify-center rounded-2xl px-4 shadow-sm sm:h-20 sm:min-w-20"
                style={{ backgroundColor: "#0052D9" }}
              >
                {/* logo_mark 2 : A blanc sur fond bleu de marque */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/andoxa.svg" alt="Andoxa" className="h-9 w-auto sm:h-11" />
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--brand-blue)] font-display text-sm font-semibold italic text-white shadow-[0_8px_24px_-10px_rgba(0,82,217,0.6)] ring-4 ring-background sm:size-12">
                vs
              </span>
              <span className="inline-flex h-16 min-w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-card px-4 shadow-sm sm:h-20 sm:min-w-20">
                {competitorLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={competitorLogo}
                    alt={competitor}
                    className="max-h-10 w-auto max-w-[120px] object-contain"
                  />
                ) : (
                  <span className="font-display text-base font-semibold text-foreground">
                    {competitor}
                  </span>
                )}
              </span>
            </div>

            <h1 className="font-display mt-7 text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Andoxa <span className="text-[var(--brand-blue)]">vs</span> {competitor}
            </h1>
            <p className="mt-4 text-lg leading-7 text-muted-foreground">{positioning}</p>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-foreground/80">
              {intro}
            </p>
          </div>
        </Container>
      </section>

      {/* 3 — Comparison table */}
      <section className="bg-[var(--neutral-50)]/50 py-20 sm:py-24">
        <Container>
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[var(--border)] bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]/60">
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
                      Capacité
                    </th>
                    <th className="bg-[var(--brand-blue-tint)]/60 px-3 py-4 text-center sm:px-4">
                      <AndoxaWordmark height={16} className="justify-center" />
                    </th>
                    <th className="px-3 py-4 text-center text-sm font-semibold text-foreground sm:px-4">
                      {competitor}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-t border-[var(--border)]/70">
                      <td className="px-4 py-3 text-sm text-foreground sm:px-6">{r.label}</td>
                      <td className="bg-[var(--brand-blue-tint)]/40 px-3 py-3 sm:px-4">
                        <Cell value={r.andoxa} highlight />
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <Cell value={r.competitor} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-4xl text-center text-[11px] leading-5 text-muted-foreground">
            ✓ = oui · — = non natif · le reste précise l&apos;approche. Comparatif établi de
            bonne foi sur les capacités ; les produits évoluent.
          </p>
        </Container>
      </section>

      {/* 3bis — Comparateur de prix (optionnel) — avant les blocs de choix */}
      {priceComparison && (
        <section className="border-b border-[var(--border)] bg-background py-20 sm:py-24">
          <Container>
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <Eyebrow className="justify-center">Comparateur de prix</Eyebrow>
              <h2 className="font-display mt-4 text-3xl text-foreground sm:text-4xl">
                {priceComparison.title ?? "À périmètre et volume équivalents."}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                {priceComparison.scopeNote}
              </p>
            </div>

            <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2 md:gap-6">
              {/* Andoxa (mis en avant) */}
              <div className="rounded-2xl border-2 border-[var(--brand-blue)] bg-card p-6 shadow-[0_18px_50px_-30px_rgba(0,82,217,0.4)] sm:p-7">
                <div className="flex items-center gap-2.5">
                  <AndoxaLogoIcon size={22} />
                  <span className="font-semibold text-foreground">Andoxa</span>
                </div>
                <p className="mt-5 font-display text-4xl font-medium tabular text-foreground">
                  {priceComparison.andoxa.price}
                  <span className="text-base font-normal text-muted-foreground">
                    {priceComparison.andoxa.unit}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{priceComparison.andoxa.billing}</p>
                <p className="mt-5 text-sm leading-6 text-foreground/85">
                  {priceComparison.andoxa.includes}
                </p>
              </div>

              {/* Concurrent */}
              <div className="rounded-2xl border border-[var(--border)] bg-card p-6 sm:p-7">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-foreground">{competitor}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {priceComparison.competitor.tag}
                  </span>
                </div>
                <p className="mt-5 font-display text-4xl font-medium tabular text-foreground">
                  {priceComparison.competitor.price}
                  <span className="text-base font-normal text-muted-foreground">
                    {priceComparison.competitor.unit}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {priceComparison.competitor.breakdown}
                </p>
                <p className="mt-5 text-sm leading-6 text-foreground/85">
                  {priceComparison.competitor.missing}
                </p>
              </div>
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-6 text-muted-foreground">
              {priceComparison.note}
            </p>
            <p className="mx-auto mt-3 max-w-3xl text-center text-[11px] leading-5 text-muted-foreground/80">
              {priceComparison.disclaimer}
            </p>
          </Container>
        </section>
      )}

      {/* 4 — Choose blocks */}
      <section className="bg-background py-20 sm:py-24">
        <Container>
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2 md:gap-6">
            <div className="rounded-2xl border border-[var(--border)] bg-card p-6 sm:p-7">
              <h2 className="font-display text-xl text-foreground sm:text-2xl">
                Choisissez {competitor} si…
              </h2>
              <ul className="mt-5 space-y-3">
                {chooseCompetitor.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] leading-7 text-foreground/85">
                    <Check size={16} strokeWidth={2.5} className="mt-1 shrink-0 text-muted-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--brand-blue)]/30 bg-[var(--brand-blue-tint)]/30 p-6 sm:p-7">
              <h2 className="font-display text-xl text-foreground sm:text-2xl">
                Choisissez Andoxa si…
              </h2>
              <ul className="mt-5 space-y-3">
                {chooseAndoxa.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] leading-7 text-foreground/90">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-[var(--brand-blue)] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* 5 — Andoxa CTA (panneau premium bleu de marque) */}
      <section className="bg-background pb-24 sm:pb-32">
        <Container>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[var(--brand-blue)] bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-dark)] p-10 text-center text-white shadow-[0_30px_60px_-30px_rgba(0,82,217,0.5)] sm:p-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_30%_10%,rgba(255,255,255,0.16),transparent_60%)]"
            />
            <div className="relative">
              <h2 className="font-display text-2xl text-white sm:text-3xl">
                Tout votre cycle commercial, dans un seul outil.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-white/80">
                Prospects, conversations, RDV et pipeline au même endroit, LinkedIn et téléphone
                inclus. Essayez Andoxa gratuitement.
              </p>
              <div className="mt-8 flex justify-center">
                <Button
                  href="/pricing"
                  size="lg"
                  className="bg-white !text-[var(--brand-blue-dark)] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] hover:bg-white/95"
                >
                  Essai gratuit de 14 jours
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
