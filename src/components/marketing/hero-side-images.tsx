"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarMockup,
  CampaignsMockup,
  CrmMockup,
  DashboardMockup,
  InboxMockup,
  WorkflowsMockup,
} from "@/components/marketing/mockups/product-mockups";

/**
 * Floating product-UI cards peeking from the left/right of the hero.
 * lg+ only, aria-hidden. Originally static screenshots — now live mockups.
 */
type Card = {
  Mockup: React.ComponentType;
  side: "left" | "right";
  top: string;
  offset: string;
  width: number;
  rotate: number;
  delay: number;
  bob: number;
};

const CARDS: Card[] = [
  { Mockup: InboxMockup, side: "left", top: "6%", offset: "-16%", width: 450, rotate: -9, delay: 0.55, bob: 8 },
  { Mockup: CalendarMockup, side: "left", top: "44%", offset: "-22%", width: 525, rotate: -3, delay: 0.7, bob: 6 },
  { Mockup: WorkflowsMockup, side: "left", top: "80%", offset: "-14%", width: 400, rotate: 7, delay: 0.85, bob: 10 },
  { Mockup: CrmMockup, side: "right", top: "8%", offset: "-18%", width: 525, rotate: 7, delay: 0.6, bob: 7 },
  { Mockup: DashboardMockup, side: "right", top: "48%", offset: "-14%", width: 450, rotate: -4, delay: 0.75, bob: 9 },
  { Mockup: CampaignsMockup, side: "right", top: "82%", offset: "-20%", width: 475, rotate: 5, delay: 0.9, bob: 6 },
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
        <BrowserCard Mockup={card.Mockup} />
      </motion.div>
    </motion.div>
  );
}

function BrowserCard({ Mockup }: { Mockup: React.ComponentType }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-card shadow-[0_60px_140px_-25px_rgba(0,82,217,0.50),_0_30px_70px_-15px_rgba(0,82,217,0.28),_0_10px_30px_-8px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--neutral-50)] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#FF5F57]/70" />
        <span className="h-2 w-2 rounded-full bg-[#FEBC2E]/70" />
        <span className="h-2 w-2 rounded-full bg-[#28C840]/70" />
      </div>
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Mockup />
      </div>
    </div>
  );
}
