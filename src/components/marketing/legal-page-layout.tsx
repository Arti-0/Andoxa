import type { ReactNode } from "react";
import { FloatingNav, type NavItem } from "@/components/marketing/aceternity/floating-nav";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";

// English slugs per the route-reconciliation decision.
export const SITE_NAV: NavItem[] = [
  { name: "Tarifs", href: "/pricing" },
  {
    name: "Ressources",
    href: "/resources",
    children: [
      { name: "Guide détaillé d'Andoxa", href: "/resources/guide", description: "Tour complet du produit, module par module." },
      { name: "Calculateur de ROI", href: "/resources/roi-calculator", description: "Estimez le gain mensuel pour votre équipe." },
      { name: "Blog", href: "/resources/blog", description: "Outbound, no-shows, conformité, par les sales." },
    ],
  },
  { name: "À propos", href: "/about" },
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
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <section className="border-b border-[var(--border)] pb-12 pt-32 sm:pt-40">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Légal</Eyebrow>
              <h1 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">{title}</h1>
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Dernière mise à jour&nbsp;: {updatedOn}
              </p>
              <p className="mt-5 text-base leading-7 text-muted-foreground">{intro}</p>
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
                  <ul className="space-y-1.5">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="block rounded-md py-1 text-[13px] text-muted-foreground transition-colors hover:text-[var(--brand-blue)]"
                        >
                          {s.heading}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>

              {/* sections */}
              <div className="min-w-0 space-y-12">
                {sections.map((s) => (
                  <section key={s.id} id={s.id} className="scroll-mt-28">
                    <h2 className="font-display text-xl text-foreground sm:text-2xl">{s.heading}</h2>
                    <div className="mt-4 space-y-3 text-[15px] leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-[var(--brand-blue)] [&_a]:underline [&_a]:underline-offset-2">
                      {s.body}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
