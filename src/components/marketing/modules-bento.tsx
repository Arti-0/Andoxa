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

/**
 * Screenshot frame. Three modes:
 *
 *   • cover       — fills the cell, crops what doesn't fit (default)
 *   • scale-down  — fits the full screenshot, leaves whitespace
 *   • crop        — zooms into a specific point of the screenshot using a
 *                   CSS scale transform anchored on `originX% originY%`. The
 *                   anchor point stays in place; everything else scales away,
 *                   so passing { zoom: 4, originX: 30, originY: 45 } makes
 *                   the screenshot 4× larger and shows a window centred on
 *                   that pixel — the trick that turns full-page mockups into
 *                   readable detail shots without resizing the cell itself.
 */
function Screenshot({
  src,
  alt,
  fit = "cover",
  crop,
}: {
  src: string;
  alt: string;
  fit?: "cover" | "scale-down";
  crop?: { zoom: number; originX: number; originY: number };
}) {
  if (crop) {
    // CSS `transform: scale()` blurs because Next/Image first paints the
    // source into the cell-sized <img>, and the transform then stretches
    // that small bitmap. Switching to a CSS background-image lets the
    // browser rasterise directly from source pixels at the zoomed display
    // size — no intermediate downscale, so no blur. We trade Next/Image's
    // srcset optimisation for sharpness on these decorative crops.
    //
    // backgroundPosition uses the natural "X% of source aligned with X% of
    // container" convention, so originX/originY = 0..100 maps directly to
    // the source: 0 = top/left of the screenshot, 100 = bottom/right,
    // 50 = centre. Independent of the cell's aspect ratio.
    return (
      <div
        role="img"
        aria-label={alt}
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: `${crop.zoom * 100}%`,
          backgroundPosition: `${crop.originX}% ${crop.originY}%`,
          backgroundRepeat: "no-repeat",
        }}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 768px) 50vw, 100vw"
      className={fit === "scale-down" ? "object-scale-down" : "object-cover"}
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
            header={
              <Cell>
                <Screenshot
                  src="/screenshots/07-messagerie.png"
                  alt="Messagerie Andoxa"
                  crop={{ zoom: 2.5, originX: 25, originY: 50 }}
                />
              </Cell>
            }
          />
          <BentoGridItem
            title="Calendrier"
            description="Lien de booking + séquences WhatsApp pré et post-RDV."
            icon={<CalendarCheck size={16} />}
            header={
              <Cell>
                <Screenshot
                  src="/screenshots/06-calendar.png"
                  alt="Calendrier Andoxa"
                  crop={{ zoom: 3, originX: 45, originY: 55 }}
                />
              </Cell>
            }
          />
          <BentoGridItem
            title="CRM"
            description="Pipeline visuel, fiches prospect, listes segmentées."
            icon={<Database size={16} />}
            header={
              <Cell>
                <Screenshot
                  src="/screenshots/03-crm-short.png"
                  alt="CRM Andoxa"
                  crop={{ zoom: 1.8, originX: 50, originY: 55 }}
                />
              </Cell>
            }
          />
          <BentoGridItem
            title="Campagnes"
            description="Invitations et séquences LinkedIn dans le respect des limites."
            icon={<Megaphone size={16} />}
            header={
              <Cell>
                <Screenshot
                  src="/screenshots/04-campagnes.png"
                  alt="Campagnes Andoxa"
                  crop={{ zoom: 1.8, originX: 50, originY: 55 }}
                />
              </Cell>
            }
          />
          <BentoGridItem
            className="md:col-span-3 md:row-span-2"
            title="Workflows"
            description="Automations visuelles type Zapier, pensées pour les sales. Triggers avancés sur silence, no-show, statut."
            icon={<Workflow size={16} />}
            header={<Cell><Screenshot src="/screenshots/09-workflow-builder.png" alt="Workflow builder Andoxa" /></Cell>}
          />
        </BentoGrid>
      </Container>
    </section>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 select-none">{children}</div>;
}
