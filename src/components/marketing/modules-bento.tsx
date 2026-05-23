"use client";

import Image from "next/image";
import {
  CalendarCheck,
  Database,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Workflow,
} from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { BentoGrid, BentoGridItem } from "@/components/marketing/aceternity/bento-grid";
import {
  CalendarMockup,
  InboxMockup,
  WorkflowsMockup,
} from "@/components/marketing/mockups/product-mockups";

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 768px) 50vw, 100vw"
      className="object-cover"
      style={{ objectPosition: "center top" }}
    />
  );
}

/**
 * "Six modules, une seule interface" bento. Cells host the realistic product
 * mockups for now — a dedicated abstract illustration kit is on the roadmap
 * (see todo list) once the visual direction is locked.
 */
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
            Six modules, une seule interface.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Tout ce dont vos commerciaux ont besoin, sans jongler avec dix outils.
          </p>
        </div>

        <BentoGrid>
          <BentoGridItem
            className="md:col-span-2"
            title="Tableau de bord"
            description="RDV, taux de réponse, closings : pilotez la performance avec les KPI qui comptent."
            icon={<LayoutDashboard size={16} />}
            header={<Cell><Screenshot src="/screenshots/02-dashboard.png" alt="Tableau de bord Andoxa" /></Cell>}
          />
          <BentoGridItem
            title="Messagerie"
            description="LinkedIn et WhatsApp dans une seule inbox augmentée."
            icon={<Inbox size={16} />}
            header={<Cell><InboxMockup /></Cell>}
          />
          <BentoGridItem
            title="Calendrier"
            description="Lien de booking + séquences WhatsApp pré et post-RDV."
            icon={<CalendarCheck size={16} />}
            header={<Cell><CalendarMockup /></Cell>}
          />
          <BentoGridItem
            title="CRM"
            description="Pipeline visuel, fiches prospect, listes segmentées."
            icon={<Database size={16} />}
            header={<Cell><Screenshot src="/screenshots/03-crm.png" alt="CRM Andoxa" /></Cell>}
          />
          <BentoGridItem
            title="Campagnes"
            description="Invitations et séquences LinkedIn dans le respect des limites."
            icon={<Megaphone size={16} />}
            header={<Cell><Screenshot src="/screenshots/04-campagnes.png" alt="Campagnes Andoxa" /></Cell>}
          />
          <BentoGridItem
            className="md:col-span-3 md:row-span-2"
            title="Workflows"
            description="Automations visuelles type Zapier, pensées pour les sales. Triggers avancés sur silence, no-show, statut."
            icon={<Workflow size={16} />}
            header={<Cell><WorkflowsMockup /></Cell>}
          />
        </BentoGrid>
      </Container>
    </section>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 select-none">{children}</div>;
}
