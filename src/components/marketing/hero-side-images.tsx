"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { EmbeddedPage } from "@/components/marketing/ui/embedded-page";
import { ANDOXA_PAGE } from "@/lib/andoxa-pages";

/**
 * Floating UI mockups peeking from the left and right of the hero,
 * inspired by uiblockify.co's hero composition.
 *
 *  - Hidden under lg breakpoint (would crowd the hero text on mobile)
 *  - Each card animates in with a soft slide-from-outside + scale
 *  - Each card then loops a gentle y-bob so the composition feels alive
 *  - aria-hidden so screen readers ignore the decorative imagery
 *  - Each card embeds a live Andoxa product page (non-interactive) so
 *    the visitor sees real UI rather than flat PNG screenshots
 */

type Card = {
  src: string;
  /** "embed" → HTML iframe; "image" → static PNG screenshot */
  kind: "embed" | "image";
  alt?: string;
  side: "left" | "right";
  top: string;
  offset: string;
  width: number;
  rotate: number;
  delay: number;
  bob: number;
};

const CARDS: Card[] = [
  { kind: "embed", src: ANDOXA_PAGE.messagerie,           side: "left",  top: "6%",  offset: "-16%", width: 450, rotate: -9, delay: 0.55, bob: 8 },
  { kind: "embed", src: ANDOXA_PAGE.calendrier,           side: "left",  top: "44%", offset: "-22%", width: 525, rotate: -3, delay: 0.7,  bob: 6 },
  { kind: "embed", src: ANDOXA_PAGE.workflows,            side: "left",  top: "80%", offset: "-14%", width: 400, rotate: 7,  delay: 0.85, bob: 10 },
  { kind: "image", src: "/screenshots/03-crm.png",        alt: "CRM Andoxa",          side: "right", top: "8%",  offset: "-18%", width: 525, rotate: 7,  delay: 0.6,  bob: 7 },
  { kind: "image", src: "/screenshots/02-dashboard.png",  alt: "Tableau de bord",     side: "right", top: "48%", offset: "-14%", width: 450, rotate: -4, delay: 0.75, bob: 9 },
  { kind: "image", src: "/screenshots/04-campagnes.png",  alt: "Campagnes Andoxa",    side: "right", top: "82%", offset: "-20%", width: 475, rotate: 5,  delay: 0.9,  bob: 6 },
];

export function HeroSideImages() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden lg:block"
    >
      {CARDS.map((c, i) => (
        <FloatingCard key={i} card={c} reduce={!!reduce} />
      ))}
    </div>
  );
}

function FloatingCard({ card, reduce }: { card: Card; reduce: boolean }) {
  const fromX = card.side === "left" ? -80 : 80;

  return (
    <motion.div
      initial={reduce ? { opacity: 0.7, x: 0 } : { opacity: 0, x: fromX, scale: 0.94 }}
      animate={reduce ? { opacity: 0.7, x: 0 } : { opacity: 0.78, x: 0, scale: 1 }}
      transition={{ duration: 0.95, delay: card.delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        top: card.top,
        width: card.width,
        rotate: `${card.rotate}deg`,
        ...(card.side === "left" ? { left: card.offset } : { right: card.offset }),
      }}
      className="absolute"
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -card.bob, 0] }}
        transition={{
          duration: 7 + card.bob * 0.4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: card.delay,
        }}
      >
        <BrowserCard card={card} />
      </motion.div>
    </motion.div>
  );
}

function BrowserCard({ card }: { card: Card }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-card shadow-2xl shadow-[0_60px_140px_-25px_rgba(0,82,217,0.50),_0_30px_70px_-15px_rgba(0,82,217,0.28),_0_10px_30px_-8px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--neutral-50)] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#FF5F57]/70" />
        <span className="h-2 w-2 rounded-full bg-[#FEBC2E]/70" />
        <span className="h-2 w-2 rounded-full bg-[#28C840]/70" />
      </div>
      {card.kind === "embed" ? (
        <EmbeddedPage src={card.src} title="" className="block w-full" />
      ) : (
        <div className="relative aspect-[16/10] w-full">
          <Image
            src={card.src}
            alt={card.alt ?? ""}
            fill
            sizes="525px"
            className="object-cover"
            style={{ objectPosition: "center top" }}
          />
        </div>
      )}
    </div>
  );
}
