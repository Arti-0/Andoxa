"use client";

import Image from "next/image";
import {
  CalendarCheck,
  Database,
  Inbox,
  LayoutDashboard,
  Megaphone,
} from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { BentoGrid, BentoGridItem } from "@/components/marketing/aceternity/bento-grid";
import { MessagerieRelief } from "@/components/marketing/mockups/relief/messagerie-relief";

/**
 * "Tout votre système commercial, en cinq modules" bento. Cells use the clean
 * /public captures (same Sharp pipeline as the hero, served unoptimized) where
 * one exists. Messagerie has no capture, so it reuses the flow's MessagerieRelief
 * mock (flat, vector). Never the (removed) workflow builder.
 */
function Screenshot({ src, srcDark, alt }: { src: string; srcDark?: string; alt: string }) {
  if (!srcDark) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
        style={{ objectPosition: "center top" }}
      />
    );
  }
  // Light capture in light mode, dark capture in dark mode (one shows at a time).
  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover dark:hidden"
        style={{ objectPosition: "center top" }}
      />
      <Image
        src={srcDark}
        alt={alt}
        fill
        unoptimized
        sizes="(min-width: 768px) 50vw, 100vw"
        className="hidden object-cover dark:block"
        style={{ objectPosition: "center top" }}
      />
    </>
  );
}

export function MarketingModulesBentoSection() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--border)] bg-gradient-to-b from-background via-[var(--neutral-50)]/60 to-background py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/3 h-[400px] w-[600px] rounded-full bg-[var(--brand-blue-tint)]/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-1/3 h-[360px] w-[520px] rounded-full bg-[var(--brand-orange-tint)]/50 blur-3xl"
      />
      <Container className="relative">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow className="justify-center">La plateforme</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Tout votre système commercial, en cinq modules.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Cinq modules alignés sur votre cycle commercial, dans une seule interface.
          </p>
        </div>

        <BentoGrid>
          <BentoGridItem
            className="md:col-span-2"
            title="Tableau de bord"
            description="Invitations, taux de réponse, RDV, closings, performance par commercial."
            icon={<LayoutDashboard size={16} />}
            // Same capture as the hero, but a distinct URL (query suffix) on purpose:
            // next/image keys its LCP-detection map by resolved URL, so a second
            // <Image> with the hero's exact URL (and default lazy loading) would
            // overwrite the hero's eager entry and trigger a false LCP warning.
            // The query is ignored when serving the static file.
            header={<Cell><Screenshot src="/dashboard-hero.png?in=bento" srcDark="/dashboard-dark.png?in=bento" alt="Tableau de bord Andoxa" /></Cell>}
          />
          <BentoGridItem
            title="Messagerie"
            description="Toutes vos conversations LinkedIn dans une inbox unifiée, avec le contexte commercial de chaque échange."
            icon={<Inbox size={16} />}
            header={
              <Cell>
                <div className="absolute inset-0 flex items-start justify-center bg-[var(--neutral-50)] p-3">
                  <MessagerieRelief />
                </div>
              </Cell>
            }
          />
          <BentoGridItem
            title="Campagnes & Appels"
            description="Campagnes LinkedIn (invitation + premier message) et sessions d'appels, depuis un seul endroit."
            icon={<Megaphone size={16} />}
            header={<Cell><Screenshot src="/campagnes-section.png" srcDark="/campagnes-dark.png" alt="Campagnes et appels Andoxa" /></Cell>}
          />
          <BentoGridItem
            title="CRM & pipeline"
            description="Chaque prospect, son statut, son historique, le pipeline en kanban."
            icon={<Database size={16} />}
            header={<Cell><Screenshot src="/crm-section.png" srcDark="/crm-dark.png" alt="CRM et pipeline Andoxa" /></Cell>}
          />
          <BentoGridItem
            title="Calendrier & booking"
            description="Un lien de réservation, les RDV dans un calendrier unifié, synchro Google."
            icon={<CalendarCheck size={16} />}
            header={<Cell><Screenshot src="/calendrier-section.png" srcDark="/calendrier-dark.png" alt="Calendrier et booking Andoxa" /></Cell>}
          />
        </BentoGrid>
      </Container>
    </section>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 select-none">{children}</div>;
}
