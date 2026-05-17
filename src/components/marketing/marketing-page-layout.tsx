import type { ReactNode } from "react";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";

/**
 * Shared wrapper for marketing-style content pages that are NOT the main
 * homepage / pricing / legal pages — changelog, help, security, etc.
 *
 * Same chrome as the rest of `@/components/marketing` (FloatingNav + Footer) so users don't
 * land on a visually different page when they click "Changelog" or "Centre
 * d'aide" from the marketing site.
 *
 * Pass `chrome={false}` to opt out of the centered hero block when the page
 * needs to render its own custom hero (e.g. /security with its scroll-spy
 * sidebar).
 */
export function MarketingPageLayout({
  eyebrow,
  title,
  subtitle,
  chrome = true,
  children,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  chrome?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main className="bg-background">
        {chrome && title ? (
          <section className="border-b border-[var(--border)] pb-12 pt-32 sm:pt-40">
            <Container>
              <div className="mx-auto max-w-3xl text-center">
                {eyebrow ? <Eyebrow className="justify-center">{eyebrow}</Eyebrow> : null}
                <h1 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-4 text-lg leading-8 text-muted-foreground">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </Container>
          </section>
        ) : null}
        {children}
      </main>
      <Footer />
    </>
  );
}
