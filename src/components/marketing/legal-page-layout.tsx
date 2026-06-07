import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FloatingNav, type NavItem } from "@/components/marketing/aceternity/floating-nav";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { ScrollProgress } from "@/components/marketing/ui/scroll-progress";
import { COMPARISONS } from "@/lib/marketing/comparisons";

// English slugs per the route-reconciliation decision.

/**
 * Shared "Ressources" mega-menu. The "Alternatives à Andoxa" column is driven
 * by COMPARISONS so adding a comparison page = one entry there. No hub link
 * yet (no /comparatif index route exists, so no dead link).
 */
export const RESOURCES_MENU: NavItem = {
  name: "Ressources",
  href: "/resources",
  columns: [
    {
      title: "Ressources",
      items: [
        { name: "Guide Andoxa", href: "/resources/guide", description: "Tour complet du produit, module par module.", icon: "guide" as const },
        { name: "Calculateur de ROI", href: "/resources/roi-calculator", description: "Estimez le gain mensuel pour votre équipe.", icon: "calculator" as const },
      ],
    },
    {
      title: "Alternatives à Andoxa",
      cols: 2,
      items: COMPARISONS.map((c) => ({
        name: `Andoxa vs ${c.competitor}`,
        href: c.href,
        icon: "compare" as const,
      })),
    },
  ],
};

export const SITE_NAV: NavItem[] = [
  { name: "Tarifs", href: "/pricing" },
  RESOURCES_MENU,
  { name: "Contact", href: "/contact" },
];

export interface LegalSection {
  id: string;
  heading: string;
  body: ReactNode;
}

/**
 * Shared shell for the legal pages (CGV, confidentialité, mentions légales).
 * Nav + a title block + a sticky table of contents + the prose sections +
 * footer. Prose is intentionally muted; headings carry the structure.
 */
export function LegalPageLayout({
  title,
  updatedOn,
  intro,
  sections,
}: {
  title: string;
  updatedOn: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <ScrollProgress />
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <section className="border-b border-[var(--border)] pb-16 pt-32 sm:pt-40">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Légal</Eyebrow>
              <nav
                aria-label="Fil d'Ariane"
                className="mt-5 flex items-center gap-1.5 text-[13px] text-muted-foreground"
              >
                <Link href="/" className="transition-colors hover:text-foreground">
                  Accueil
                </Link>
                <ChevronRight size={12} strokeWidth={1.8} aria-hidden="true" className="text-muted-foreground/60" />
                <span aria-current="page" className="text-foreground">
                  {title}
                </span>
              </nav>
              <h1 className="font-display mt-5 text-4xl text-foreground sm:text-5xl">{title}</h1>
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Dernière mise à jour&nbsp;: {updatedOn}
              </p>
              <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">{intro}</p>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20">
          <Container>
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
              {/* sticky TOC */}
              <aside className="hidden lg:block">
                <nav aria-label="Sommaire" className="sticky top-28">
                  <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Sommaire
                  </p>
                  <ul className="space-y-1">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="block rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-[var(--neutral-50)] hover:text-[var(--brand-blue)]"
                        >
                          {s.heading}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>

              {/* sections */}
              <article className="min-w-0 max-w-3xl">
                <div className="space-y-12">
                  {sections.map((s) => (
                    <section key={s.id} id={s.id} className="scroll-mt-28">
                      <h2 className="font-display text-2xl text-foreground sm:text-3xl">{s.heading}</h2>
                      <div className="mt-4 space-y-4 text-base leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-[var(--brand-blue)] [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-foreground">
                        {s.body}
                      </div>
                    </section>
                  ))}
                </div>

                {/* End-of-page contact card */}
                <aside className="mt-16 rounded-xl border border-[var(--border)] bg-[var(--neutral-50)] p-5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Une question&nbsp;?
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    Écrivez-nous à{" "}
                    <a
                      href="mailto:contact@andoxa.fr"
                      className="font-medium text-[var(--brand-blue)] underline underline-offset-2"
                    >
                      contact@andoxa.fr
                    </a>{" "}
                    — on répond sous 48&nbsp;h ouvrées.
                  </p>
                </aside>
              </article>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
