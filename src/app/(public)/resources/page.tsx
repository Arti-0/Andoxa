import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, GraduationCap, Layers } from "lucide-react";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { Button } from "@/components/marketing/ui/button";

export const metadata: Metadata = {
  title: "Ressources Andoxa : guides et calculateur de ROI",
  description:
    "Guide détaillé d'Andoxa et calculateur de ROI pour votre équipe : toutes nos ressources pour structurer votre prospection B2B.",
};

const CATEGORIES = [
  {
    icon: BookOpen,
    title: "Guide détaillé d'Andoxa",
    description:
      "Tour complet du produit, module par module. Onboarding, anatomie de chaque page, cas d'usage et erreurs à éviter.",
    href: "/resources/guide",
    cta: "Lire le guide",
    live: true,
  },
  {
    icon: Calculator,
    title: "Calculateur de ROI",
    description:
      "Combien Andoxa peut faire gagner à votre équipe ? Personnalisez le calcul avec vos chiffres, voyez le CA additionnel en direct.",
    href: "/resources/roi-calculator",
    cta: "Estimer le ROI",
    live: true,
  },
  {
    icon: GraduationCap,
    title: "Études de cas",
    description:
      "Comment ESCP Conseil est passé de 12 à 38 RDV par mois. Comment HEC a divisé ses no-shows par trois. Des chiffres réels, des contextes réels.",
    href: "/contact?objet=resources",
    cta: "Me prévenir",
    live: false,
  },
  {
    icon: Layers,
    title: "Templates",
    description:
      "Séquences LinkedIn, scripts d'appel, workflows de relance, templates WhatsApp. Prêts à importer dans Andoxa, ou à adapter à votre stack.",
    href: "/contact?objet=resources",
    cta: "Me prévenir",
    live: false,
  },
];

export default function ResourcesPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <section className="border-b border-[var(--border)] py-24 sm:py-32">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Ressources</Eyebrow>
              <h1 className="font-display mt-4 text-5xl text-foreground sm:text-6xl lg:text-7xl">
                Tout ce qui aide vos équipes à{" "}
                <span className="text-[var(--brand-blue)]">mieux prospecter</span>.
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
                Guides pratiques, calculateur de ROI, études de cas, blog. Construits avec et pour
                des équipes sales qui font de l&apos;outbound tous les jours.
              </p>
            </div>
          </Container>
        </section>

        <section className="border-b border-[var(--border)] bg-[var(--neutral-50)]/60 py-24 sm:py-32">
          <Container>
            <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:gap-6">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-22px_rgba(0,82,217,0.22)] sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                      <cat.icon size={18} />
                    </span>
                    {!cat.live && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-800 ring-1 ring-amber-200/60 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
                        Bientôt
                      </span>
                    )}
                  </div>
                  <h3 className="font-display mt-5 text-xl text-foreground sm:text-2xl">{cat.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                    {cat.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-blue)] transition-transform group-hover:translate-x-0.5">
                    {cat.cta}
                    <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        <section className="py-24 sm:py-32">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-4xl text-foreground sm:text-5xl">
                Une question avant&nbsp;?
              </h2>
              <p className="mt-5 text-lg leading-7 text-muted-foreground">
                30 minutes avec l&apos;équipe pour qu&apos;on regarde votre stack ensemble.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href="/contact?objet=demo" size="lg">
                  Réserver une démo
                  <ArrowRight size={16} />
                </Button>
                <Button href="/pricing" variant="outline" size="lg">
                  Voir les tarifs
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
