"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, TrendingUp } from "lucide-react";
import { LinkedinIcon, WhatsappIcon } from "@/components/marketing/icons/brand-icons";

/**
 * Three notification-style mini-cards floating around the hero CTA zone.
 * lg+ only — decorative, aria-hidden.
 */
type Card = {
  position: string;
  delay: number;
  motionKind: "bob" | "pulse";
  content: React.ReactNode;
};

const CARDS: Card[] = [
  {
    position: "right-[6%] top-[34%]",
    delay: 0.5,
    motionKind: "bob",
    content: (
      <div className="flex items-center gap-3 rounded-2xl border border-[#25D366]/30 bg-card px-4 py-3 shadow-[0_30px_70px_-20px_rgba(37,211,102,0.4),_0_8px_25px_-10px_rgba(0,0,0,0.18)] backdrop-blur-sm">
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#25D366]/12 text-[#25D366]">
          <WhatsappIcon size={16} />
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#25D366] text-white">
            <Check size={9} strokeWidth={3} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            WhatsApp
          </p>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            RDV confirmé · Mardi 14h
          </p>
        </div>
      </div>
    ),
  },
  {
    position: "left-[6%] top-[46%]",
    delay: 0.8,
    motionKind: "bob",
    content: (
      <div className="flex items-center gap-3 rounded-2xl border border-[#0A66C2]/30 bg-card px-4 py-3 shadow-[0_30px_70px_-20px_rgba(10,102,194,0.45),_0_8px_25px_-10px_rgba(0,0,0,0.18)] backdrop-blur-sm">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0A66C2]/12 text-[#0A66C2]">
          <LinkedinIcon size={16} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            LinkedIn
          </p>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            +12 invitations acceptées
          </p>
        </div>
      </div>
    ),
  },
  {
    position: "right-[18%] top-[72%]",
    delay: 1.1,
    motionKind: "pulse",
    content: (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-card px-4 py-3 shadow-[0_30px_70px_-20px_rgba(16,185,129,0.45),_0_8px_25px_-10px_rgba(0,0,0,0.18)] backdrop-blur-sm">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <TrendingUp size={16} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Deal signé
          </p>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Maven · +432 € MRR
          </p>
        </div>
      </div>
    ),
  },
];

export function HeroFloatingCards() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 hidden lg:block"
    >
      {CARDS.map((card, i) => (
        <FloatingCard key={i} card={card} reduce={!!reduce} />
      ))}
    </div>
  );
}

function FloatingCard({ card, reduce }: { card: Card; reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.85, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.85, delay: card.delay, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute ${card.position}`}
    >
      <motion.div
        animate={
          reduce
            ? undefined
            : card.motionKind === "bob"
              ? { y: [0, -5, 0] }
              : { scale: [1, 1.025, 1], opacity: [1, 0.92, 1] }
        }
        transition={{
          duration: card.motionKind === "bob" ? 5.5 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: card.delay,
        }}
      >
        {card.content}
      </motion.div>
    </motion.div>
  );
}
