import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GitCompare } from "lucide-react";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { Button } from "@/components/marketing/ui/button";
import { COMPARISONS } from "@/lib/marketing/comparisons";

export const metadata: Metadata = {
  title: "Comparatifs Andoxa : alternatives et différences",
  description:
    "Andoxa face aux outils de prospection (Waalaxy, Lemlist, La Growth Machine, Phantombuster) et aux CRM, scheduling et suites de gestion (HubSpot, Calendly, Monday, Odoo). Quand choisir l'un ou l'autre, honnêtement.",
  openGraph: {
    title: "Comparatifs Andoxa",
    description: "Andoxa face aux autres outils : quand choisir l'un ou l'autre.",
    locale: "fr_FR",
    type: "website",
  },
};

export default function ComparatifHubPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <section className="relative overflow-hidden border-b border-[var(--border)] bg-background py-20 sm:py-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-60px] -z-10 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-[var(--brand-blue-tint)]/45 blur-3xl"
          />
          <Container className="relative">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow className="justify-center">Comparatifs</Eyebrow>
              <h1 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
                Andoxa face aux autres outils.
              </h1>
              <p className="mt-4 text-lg leading-7 text-muted-foreground">
                Andoxa n&apos;est pas fait pour tout le monde. Outil par outil, voici quand le
                choisir et quand préférer une alternative.
              </p>
            </div>
          </Container>
        </section>

        <section className="bg-[var(--neutral-50)]/50 py-16 sm:py-20">
          <Container>
            <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
              {COMPARISONS.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-blue)]/30 hover:shadow-lg"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                      <GitCompare size={18} />
                    </span>
                    <span className="font-display text-base font-medium text-foreground">
                      Andoxa <span className="text-muted-foreground">vs</span> {c.competitor}
                    </span>
                  </span>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-[var(--brand-blue)]"
                  />
                </Link>
              ))}
            </div>
          </Container>
        </section>

        <section className="bg-background py-16 sm:py-20">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-base leading-7 text-muted-foreground">
                Andoxa exécute nativement la prospection LinkedIn et téléphone jusqu&apos;au
                pipeline, prêt à l&apos;emploi.
              </p>
              <div className="mt-6 flex justify-center">
                <Button href="/pricing" size="lg">
                  Essai gratuit de 14 jours
                  <ArrowRight size={16} />
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
