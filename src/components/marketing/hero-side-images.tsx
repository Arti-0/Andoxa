"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { marketingAsset } from "@/lib/marketing/assets";

/**
 * Floating UI mockups peeking from the left and right of the hero. Each card
 * is a distinct product screenshot, tilted and slowly bobbing.
 *
 *  - Hidden under md (would crowd the hero text on mobile)
 *  - From md to lg, the entire composition is scaled down so it fits
 *  - Each card animates in with a soft slide-from-outside + scale
 *  - Each card then loops a gentle y-bob so the composition feels alive
 *  - aria-hidden so screen readers ignore the decorative imagery
 */

type Card = {
  src: string;
  alt: string;
  side: "left" | "right";
  /** Vertical position, expressed as a fraction of the hero height (0..1). */
  topPct: number;
  /** Card box width (before the inner image overflow zoom). */
  width: number;
  rotate: number;
  delay: number;
  bob: number;
};

const CARDS: Card[] = [
  { src: marketingAsset("screenshots/07-messagerie.png"),       alt: "Messagerie Andoxa",       side: "left",  topPct: 0.06, width: 450, rotate: -9, delay: 0.55, bob: 8 },
  { src: marketingAsset("screenshots/09-workflow-builder.png"), alt: "Workflow builder Andoxa", side: "left",  topPct: 0.42, width: 525, rotate: -3, delay: 0.7,  bob: 6 },
  { src: marketingAsset("screenshots/08-call-session.png"),     alt: "Session d'appels Andoxa", side: "left",  topPct: 0.78, width: 425, rotate: 7,  delay: 0.85, bob: 10 },
  { src: marketingAsset("screenshots/03-crm.png"),          alt: "CRM Andoxa",              side: "right", topPct: 0.08, width: 525, rotate: 7,  delay: 0.6,  bob: 7 },
  { src: marketingAsset("screenshots/06-calendar.png"),     alt: "Calendrier Andoxa",       side: "right", topPct: 0.46, width: 450, rotate: -4, delay: 0.75, bob: 9 },
  { src: marketingAsset("screenshots/08-call-session.png"), alt: "Session d'appels Andoxa", side: "right", topPct: 0.80, width: 475, rotate: 5,  delay: 0.9,  bob: 6 },
];

/**
 * Distance the card pokes into the viewport, in CSS pixels. Scales linearly
 * with viewport width via `clamp(min, ideal, max)` so the decoration:
 *   • peeks gently from the edge on mobile (peek ≈ 60px),
 *   • grows smoothly to ~340px on xl+,
 * keeping the central copy uncluttered at every breakpoint. The percentage
 * approach we had before produced the opposite: huge peek on mobile, tiny
 * peek on desktop.
 */
const PEEK_CLAMP = "clamp(60px, 14vw, 340px)";

export function HeroSideImages() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden md:block"
    >
      {CARDS.map((c, i) => (
        <FloatingCard key={i} card={c} reduce={!!reduce} />
      ))}
    </div>
  );
}

function FloatingCard({ card, reduce }: { card: Card; reduce: boolean }) {
  const fromX = card.side === "left" ? -80 : 80;

  // The visible side anchors at `peek - width`: a peek of 60px on mobile
  // leaves cardWidth - 60 hidden outside the viewport, so the card stays at
  // the edge. On wider screens peek grows and more of the card shows.
  const positionStyle: React.CSSProperties =
    card.side === "left"
      ? { left: `calc(${PEEK_CLAMP} - ${card.width}px)` }
      : { right: `calc(${PEEK_CLAMP} - ${card.width}px)` };

  return (
    <motion.div
      initial={reduce ? { opacity: 0.7, x: 0 } : { opacity: 0, x: fromX, scale: 0.94 }}
      animate={reduce ? { opacity: 0.7, x: 0 } : { opacity: 0.78, x: 0, scale: 1 }}
      transition={{ duration: 0.95, delay: card.delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        top: `${card.topPct * 100}%`,
        width: card.width,
        rotate: `${card.rotate}deg`,
        ...positionStyle,
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
  // Render the screenshot at roughly 2.5× the card width and crop with
  // overflow-hidden. The card box ends up showing only the top-left ~40% of
  // the source — which means UI elements (text, icons, kanban columns) are
  // shown at ~2.5× their "fit-everything-in-the-card" size and read crisply
  // instead of being shrunk into a blurry mosaic.
  const renderWidth = Math.round(card.width * 2.4);
  const renderHeight = Math.round(renderWidth * 0.625); // 16:10 source aspect

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-card shadow-2xl shadow-[0_60px_140px_-25px_rgba(0,82,217,0.50),_0_30px_70px_-15px_rgba(0,82,217,0.28),_0_10px_30px_-8px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--neutral-50)] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#FF5F57]/70" />
        <span className="h-2 w-2 rounded-full bg-[#FEBC2E]/70" />
        <span className="h-2 w-2 rounded-full bg-[#28C840]/70" />
      </div>
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16 / 10" }}
      >
        <Image
          src={card.src}
          alt={card.alt}
          width={renderWidth}
          height={renderHeight}
          sizes={`${renderWidth}px`}
          className="block max-w-none"
        />
      </div>
    </div>
  );
}
