import type { Metadata } from "next";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { AuroraBackground } from "@/components/marketing/aceternity/aurora-background";
import { ContactForm, type ContactTopic } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contacter l'équipe Andoxa",
  description:
    "Une question commerciale, technique, partenariat ou presse ? L'équipe Andoxa vous répond sous 24 h ouvrées.",
};

// Maps the `?objet=` query param (used by CTAs across the site) onto the
// contact form's pre-selected topic + a helpful pre-filled message.
const OBJET_MAP: Record<string, { topic: ContactTopic; message?: string }> = {
  demo: {
    topic: "demo",
    message:
      "Bonjour, j'aimerais réserver une démo d'Andoxa. Voici un peu de contexte sur mon équipe et ma stack actuelle :",
  },
  custom: {
    topic: "sales",
    message:
      "Bonjour, mon équipe dépasse 20 utilisateurs et je souhaite un devis pour le plan Custom. Contexte :",
  },
  blog: { topic: "other", message: "Bonjour, je souhaite être prévenu·e à la sortie du blog Andoxa." },
  resources: {
    topic: "other",
    message: "Bonjour, je souhaite être prévenu·e dès la sortie des ressources Andoxa.",
  },
  ressources: {
    topic: "other",
    message: "Bonjour, je souhaite être prévenu·e dès la sortie des ressources Andoxa.",
  },
  support: { topic: "support" },
  partnership: { topic: "partnership" },
  press: { topic: "press" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ objet?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const objet = params.objet?.toLowerCase();
  const matched = objet ? OBJET_MAP[objet] : undefined;

  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <section className="relative isolate overflow-hidden pb-16 pt-32 sm:pt-40">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]">
            <AuroraBackground />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 top-0 -z-[5] h-[420px] w-[600px] rounded-full bg-[var(--brand-blue-tint)] opacity-60 blur-3xl"
          />
          <Container className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <Eyebrow className="justify-center">Contact</Eyebrow>
              <h1 className="font-display mt-6 text-5xl text-foreground sm:text-6xl">
                Une question&nbsp;?{" "}
                <span className="block text-[var(--brand-blue)]">On vous répond sous 24 h.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Commercial, technique, partenariat ou presse. Écrivez-nous, l&apos;équipe vous lit et
                vous répond personnellement sous 24 h ouvrées.
              </p>
              <p className="mt-6 text-xs text-muted-foreground">
                Équipe à Paris · Réponse en français · Sans bot intermédiaire
              </p>
            </div>
          </Container>
        </section>

        <section className="pb-24 sm:pb-32">
          <Container>
            <div className="mx-auto max-w-2xl">
              <ContactForm
                defaultTopic={matched?.topic ?? "sales"}
                defaultMessage={matched?.message}
                submitLabel={matched?.topic === "demo" ? "Demander ma démo" : "Envoyer le message"}
              />
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
