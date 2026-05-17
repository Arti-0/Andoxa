import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Newspaper } from "lucide-react";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { Button } from "@/components/marketing/ui/button";

export const metadata: Metadata = {
  title: "Blog Andoxa — outbound, no-shows et conformité par les sales",
  description:
    "Notre regard sur la prospection B2B : ce qui marche, ce qui change, ce que pensent les équipes commerciales sur le terrain.",
};

export default function BlogPage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <section className="relative overflow-hidden border-b border-[var(--border)] py-24 sm:py-32">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[600px] rounded-full bg-[var(--brand-blue-tint)]/40 blur-3xl"
          />
          <Container className="relative">
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Blog</Eyebrow>
              <h1 className="font-display mt-4 text-5xl text-foreground sm:text-6xl lg:text-7xl">
                La prospection B2B, <span className="text-[var(--brand-blue)]">vue du terrain</span>.
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
                Outbound, no-shows, conformité LinkedIn, pipeline qui ment. Notre regard sur ce qui
                marche, ce qui change, et ce que pensent les équipes commerciales aujourd&apos;hui.
                Pas de fluff, du concret.
              </p>
            </div>
          </Container>
        </section>

        <section className="py-24 sm:py-32">
          <Container>
            <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-card p-10 text-center sm:p-14">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                <Newspaper size={22} />
              </span>
              <h2 className="font-display mt-6 text-3xl text-foreground sm:text-4xl">
                Le blog arrive bientôt.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Premiers articles en préparation&nbsp;: comment diviser ses no-shows par deux,
                structurer une séquence multi-canal, rester dans les clous LinkedIn. Inscrivez-vous
                pour ne rien rater.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href="/contact?objet=blog" size="lg">
                  Me prévenir à la sortie
                  <ArrowRight size={14} />
                </Button>
                <Button href="/contact?objet=demo" variant="ghost" size="lg">
                  <CalendarCheck size={14} />
                  Réserver une démo
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                En attendant, le{" "}
                <Link
                  href="/resources/guide"
                  className="font-medium text-foreground underline underline-offset-2 hover:text-[var(--brand-blue)]"
                >
                  guide détaillé
                </Link>{" "}
                couvre déjà l&apos;essentiel du produit.
              </p>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
