"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  initials: string;
  accent?: "blue" | "blue-light" | "blue-dark" | "orange";
};

const ACCENT_BG: Record<NonNullable<Testimonial["accent"]>, string> = {
  blue: "bg-[var(--brand-blue)]",
  "blue-light": "bg-[var(--brand-blue-light)]",
  "blue-dark": "bg-[var(--brand-blue-dark)]",
  orange: "bg-[var(--brand-orange)]",
};

const ACCENT_GRADIENT: Record<NonNullable<Testimonial["accent"]>, string> = {
  blue: "from-[var(--brand-blue-tint)]/60",
  "blue-light": "from-[#dbe8ff]/70",
  "blue-dark": "from-[var(--brand-blue-tint)]",
  orange: "from-[var(--brand-orange-tint)]",
};

/** Carousel of testimonials — active avatar centered, others stack behind. */
export function AnimatedTestimonials({
  testimonials,
  autoplay = true,
  className,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
  className?: string;
}) {
  const [active, setActive] = React.useState(0);

  const next = React.useCallback(() => {
    setActive((p) => (p + 1) % testimonials.length);
  }, [testimonials.length]);

  const prev = React.useCallback(() => {
    setActive((p) => (p - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  React.useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [autoplay, next]);

  const rotations = React.useMemo(
    () => testimonials.map(() => Math.floor(Math.random() * 21) - 10),
    [testimonials],
  );

  const isActive = (i: number) => i === active;

  return (
    <div
      className={cn(
        "mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-2 lg:gap-20",
        className,
      )}
    >
      <div>
        <div className="relative h-80 w-full">
          <AnimatePresence>
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, scale: 0.9, z: -100, rotate: rotations[i] }}
                animate={{
                  opacity: isActive(i) ? 1 : 0.5,
                  scale: isActive(i) ? 1 : 0.92,
                  z: isActive(i) ? 0 : -100,
                  rotate: isActive(i) ? 0 : rotations[i],
                  zIndex: isActive(i) ? 50 : testimonials.length + 2 - i,
                  y: isActive(i) ? [0, -40, 0] : 0,
                }}
                exit={{ opacity: 0, scale: 0.9, z: 100, rotate: rotations[i] }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 origin-bottom"
              >
                <div
                  className={cn(
                    "grid h-full w-full place-items-center rounded-3xl border border-[var(--border)] bg-gradient-to-br via-card to-card object-cover",
                    t.accent ? ACCENT_GRADIENT[t.accent] : "from-[var(--brand-blue-tint)]/60",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-32 w-32 place-items-center rounded-2xl text-3xl font-semibold text-white shadow-[0_20px_40px_-12px_rgba(0,82,217,0.45)]",
                      t.accent ? ACCENT_BG[t.accent] : "bg-[var(--brand-blue)]",
                    )}
                  >
                    {t.initials}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col justify-between py-4">
        <motion.div
          key={active}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <h3 className="text-xl font-semibold text-foreground">{testimonials[active].name}</h3>
          <p className="text-sm text-muted-foreground">{testimonials[active].designation}</p>
          <motion.p className="mt-6 font-display text-xl leading-relaxed text-foreground sm:text-2xl">
            {testimonials[active].quote.split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ filter: "blur(8px)", opacity: 0, y: 4 }}
                animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut", delay: 0.02 * i }}
                className="inline-block"
              >
                {word}&nbsp;
              </motion.span>
            ))}
          </motion.p>
        </motion.div>

        <div className="mt-10 flex gap-3">
          <button
            type="button"
            onClick={prev}
            aria-label="Témoignage précédent"
            className="group flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-card transition-colors hover:bg-[var(--neutral-50)]"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Témoignage suivant"
            className="group flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-card transition-colors hover:bg-[var(--neutral-50)]"
          >
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
