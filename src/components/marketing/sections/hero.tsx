"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Magnetic } from "@/components/marketing/ui/magnetic";
import { marketingAsset } from "@/lib/marketing/assets";

/* ------------------------------------------------------------------ *
 * Hero background — tunable knobs (the soft rounded panel behind the
 * upper content). Everything is derived from the brand tokens via
 * color-mix, so there is no hard-coded hex and it adapts to light/dark
 * automatically (built on `var(--background)`).
 * ------------------------------------------------------------------ */
const HERO_BG_VARS = {
  // a. Base gradient — a whisper of blue at the top, fading to the page bg.
  "--hero-base-top": "color-mix(in srgb, var(--brand-blue) 8%, var(--background))",
  // b. Aurora blobs — wide, soft, low-opacity colour washes.
  "--hero-aurora-blue": "color-mix(in srgb, var(--brand-blue) 24%, transparent)",
  "--hero-aurora-blue-2": "color-mix(in srgb, var(--brand-blue-light) 18%, transparent)",
  // ...one single warm accent, used with parcimony.
  "--hero-aurora-warm": "color-mix(in srgb, var(--brand-orange) 12%, transparent)",
  // c. Centred halo that lifts the headline off the panel.
  "--hero-halo": "color-mix(in srgb, var(--brand-blue) 16%, transparent)",
  // d. Side dot-grid colour (swap for var(--border) if you want it more discreet).
  "--hero-dot": "color-mix(in srgb, var(--brand-blue) 40%, transparent)",
  // e. Grain texture opacity.
  "--hero-grain-opacity": "0.04",
} as CSSProperties;

/** Integration logos for the marquee — reuses the EXACT same assets as the
 *  pricing "Apps à remplacer" comparison (see comparison-section.tsx): the
 *  `logos/<id>.<ext>` files resolved through marketingAsset (homepage-assets
 *  bucket, with /public fallback). id + ext mirror TOOLS / TOOL_LOGO_EXT there. */
const INTEGRATIONS: { alt: string; id: string; ext: string }[] = [
  { alt: "HubSpot", id: "hubspot", ext: "svg" },
  { alt: "Pipedrive", id: "pipedrive", ext: "svg" },
  { alt: "Salesforce", id: "salesforce", ext: "svg" },
  { alt: "Monday.com", id: "monday", ext: "svg" },
  { alt: "Odoo", id: "odoo", ext: "svg" },
  { alt: "Lemlist", id: "lemlist", ext: "svg" },
  { alt: "Waalaxy", id: "waalaxy", ext: "png" },
  { alt: "LaGrowthMachine", id: "lgm", ext: "jpeg" },
  { alt: "Phantombuster", id: "phantombuster", ext: "svg" },
  { alt: "Apollo", id: "apollo", ext: "png" },
  { alt: "Calendly", id: "calendly", ext: "svg" },
  { alt: "Cal.com", id: "calcom", ext: "jpeg" },
  { alt: "Zapier", id: "zapier", ext: "jpeg" },
  { alt: "Make", id: "make", ext: "svg" },
  { alt: "n8n", id: "n8n", ext: "svg" },
];

/** Inline keyword underline — discreet brand-coloured rule, no hard-coded hex. */
const KW =
  "font-medium text-foreground underline decoration-[var(--brand-blue)] decoration-2 underline-offset-4";

/** The soft rounded panel behind the upper part of the hero. */
function HeroPanel({ reduce }: { reduce: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={HERO_BG_VARS}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl sm:rounded-[2.5rem]"
    >
      {/* a. Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, var(--hero-base-top) 0%, var(--background) 75%)",
        }}
      />

      {/* b. Aurora blobs */}
      <motion.div
        className="absolute -left-[8%] -top-[20%] h-[420px] w-[420px] rounded-full blur-[90px]"
        style={{
          background:
            "radial-gradient(circle at center, var(--hero-aurora-blue), transparent 70%)",
        }}
        animate={reduce ? undefined : { x: [0, 20, 0], y: [0, 14, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[6%] -top-[12%] h-[360px] w-[360px] rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle at center, var(--hero-aurora-blue-2), transparent 70%)",
        }}
        animate={reduce ? undefined : { x: [0, -18, 0], y: [0, 18, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* ...single discreet warm accent */}
      <div
        className="absolute left-1/2 top-[28%] h-[240px] w-[440px] -translate-x-1/2 rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--hero-aurora-warm), transparent 72%)",
        }}
      />

      {/* c. Centred halo behind the headline */}
      <div
        className="absolute left-1/2 top-[26%] h-[320px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[60px]"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--hero-halo), transparent 65%)",
        }}
      />

      {/* Side dot-grid decoration — two lateral bands (lg+ only, where the
          centred text leaves empty margins). The radial mask keeps the centre
          clean and fades the dots toward the centre, the edges and the bottom.
          The #000 in the masks is alpha-only (opaque vs transparent), not a
          visible colour. */}
      <div
        className="absolute inset-y-0 left-0 hidden w-1/4 lg:block"
        style={{
          backgroundImage:
            "radial-gradient(var(--hero-dot) 1px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          WebkitMaskImage:
            "radial-gradient(65% 70% at 45% 35%, #000 0%, transparent 68%)",
          maskImage:
            "radial-gradient(65% 70% at 45% 35%, #000 0%, transparent 68%)",
        }}
      />
      <div
        className="absolute inset-y-0 right-0 hidden w-1/4 lg:block"
        style={{
          backgroundImage:
            "radial-gradient(var(--hero-dot) 1px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          WebkitMaskImage:
            "radial-gradient(65% 70% at 55% 35%, #000 0%, transparent 68%)",
          maskImage:
            "radial-gradient(65% 70% at 55% 35%, #000 0%, transparent 68%)",
        }}
      />

      {/* d. Subtle grain */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ opacity: "var(--hero-grain-opacity)" }}
      >
        <filter id="hero-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-grain)" />
      </svg>

      {/* Bottom fade — panel dissolves into the page bg where the screenshot begins */}
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{ background: "linear-gradient(180deg, transparent, var(--background))" }}
      />
    </div>
  );
}

export function MarketingHero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate w-full overflow-hidden pt-24 sm:pt-28">
      {/* Page-wide dot-grid BEHIND the panel — fills the white side margins so the
          panel sits on a continuous field of dots. Same 1px / 24px metrics as the
          in-panel dots. Masked to fade toward every edge; the panel covers the
          centre. `#000` in the mask is alpha-only, not a visible colour. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in srgb, var(--brand-blue) 20%, transparent) 1px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          WebkitMaskImage:
            "radial-gradient(85% 80% at 50% 45%, #000 0%, #000 35%, transparent 82%)",
          maskImage:
            "radial-gradient(85% 80% at 50% 45%, #000 0%, #000 35%, transparent 82%)",
        }}
      />

      <Container className="relative">
        {/* ---- Upper zone: rounded gradient panel + centred copy ---- */}
        <div className="relative">
          <HeroPanel reduce={!!reduce} />

          <div className="relative z-10 flex flex-col items-center px-4 pb-44 pt-12 text-center sm:pt-16">
            {/* 1. Badge pill — shield + label, transparent fill (gradient shows through) */}
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-transparent px-3 py-1 backdrop-blur-sm transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--brand-blue)_40%,var(--border))]"
            >
              <ShieldCheck size={14} className="text-[var(--brand-blue)]" />
              <span className="text-xs font-medium tracking-wide text-foreground">
                LinkedIn Safe
              </span>
            </motion.span>

            {/* 2. Massive headline (2 lines + LinkedIn logo) */}
            <h1
              className="font-display mt-8 max-w-5xl text-[2.5rem] text-foreground sm:text-6xl lg:text-[4.25rem] xl:text-[4.5rem]"
              style={{ fontWeight: 700, lineHeight: 1.03 }}
            >
              <motion.span
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="block"
              >
                Vendez sur{" "}
                <span className="whitespace-nowrap">
                  <img
                    src="/logos/linkedin-icon.svg"
                    alt="LinkedIn"
                    className="inline-block h-[0.78em] w-[0.78em] rounded-[0.16em] object-contain"
                    style={{ verticalAlign: "-0.04em", marginRight: "0.06em" }}
                  />
                  LinkedIn,
                </span>
              </motion.span>
              <motion.span
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="block text-[var(--brand-blue)]"
              >
                sans gérer la prospection.
              </motion.span>
            </h1>

            {/* 3. Subtitle with underlined keywords */}
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg"
            >
              Andoxa réunit vos campagnes <span className={KW}>LinkedIn</span>, votre{" "}
              <span className={KW}>inbox</span>, votre <span className={KW}>booking</span> et votre{" "}
              <span className={KW}>CRM</span> en une seule plateforme. Plus de copier-coller, aucun
              prospect oublié.
            </motion.p>

            {/* 4. Two CTAs */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Magnetic strength={0.1}>
                <Button href="/pricing" size="lg">
                  Essai gratuit de 14 jours
                  <ArrowRight size={16} />
                </Button>
              </Magnetic>
              <Magnetic strength={0.08}>
                <Button href="/contact?objet=demo" variant="outline" size="lg">
                  <CalendarCheck size={16} />
                  Réserver une démo
                </Button>
              </Magnetic>
            </motion.div>

            {/* 5. Integrations row */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 flex flex-col items-center gap-4"
            >
              <p className="text-sm text-muted-foreground">
                Une seule plateforme à la place de votre stack
              </p>

              {/* Auto-scrolling marquee — duplicated series for a seamless loop,
                  paused on hover, frozen when prefers-reduced-motion is set. */}
              <div className="hero-marquee w-full max-w-2xl overflow-hidden">
                <div className="hero-marquee__track flex w-max items-center">
                  {[0, 1].map((copy) => (
                    <div
                      key={copy}
                      aria-hidden={copy === 1 ? "true" : undefined}
                      className="flex shrink-0 items-center gap-x-4 px-3"
                    >
                      {INTEGRATIONS.map((logo) => (
                        // Fixed, identical slot for every logo → uniform visual size.
                        <div
                          key={`${copy}-${logo.alt}`}
                          className="flex h-6 w-20 shrink-0 items-center justify-center"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={marketingAsset(`logos/${logo.id}.${logo.ext}`)}
                            alt={logo.alt}
                            className="max-h-full max-w-full object-contain opacity-60 grayscale transition-opacity duration-200 hover:opacity-100 dark:opacity-80"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <style jsx>{`
                .hero-marquee {
                  -webkit-mask-image: linear-gradient(
                    to right,
                    transparent,
                    #000 12%,
                    #000 88%,
                    transparent
                  );
                  mask-image: linear-gradient(
                    to right,
                    transparent,
                    #000 12%,
                    #000 88%,
                    transparent
                  );
                }
                .hero-marquee__track {
                  animation: hero-marquee 64s linear infinite;
                }
                .hero-marquee:hover .hero-marquee__track {
                  animation-play-state: paused;
                }
                @keyframes hero-marquee {
                  from {
                    transform: translateX(0);
                  }
                  to {
                    transform: translateX(-50%);
                  }
                }
                @media (prefers-reduced-motion: reduce) {
                  .hero-marquee__track {
                    animation: none;
                  }
                }
              `}</style>
            </motion.div>
          </div>
        </div>
      </Container>

      {/* ---- 6. Big product capture, overlapping the panel's faded bottom.
           Outside <Container> so it can be slightly wider than the text column. */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto -mt-28 w-full max-w-[1280px] px-4 pb-24 sm:-mt-32"
      >
          <div
            className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-card"
            style={{
              boxShadow:
                "0 40px 120px -30px color-mix(in srgb, var(--brand-blue) 35%, transparent), 0 16px 50px -20px color-mix(in srgb, var(--foreground) 18%, transparent)",
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--neutral-50)] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--neutral-300)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--neutral-300)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--neutral-300)]" />
            </div>

            {/* Real dashboard capture (served from /public/dashboard-hero.png).
                Frame ratio matches the source image (1919×944) → shown in full,
                no cropping of the sidebar. */}
            <div className="relative aspect-[1919/944] w-full bg-[var(--neutral-50)]">
              {/* unoptimized → a single image at every resolution / zoom level
                  (no responsive srcset that would swap variants on zoom). */}
              <Image
                src="/dashboard-hero.png"
                alt="Tableau de bord Andoxa"
                fill
                unoptimized
                className="object-cover object-top dark:hidden"
                loading="eager"
                fetchPriority="high"
              />
              <Image
                src="/dashboard-dark.png"
                alt="Tableau de bord Andoxa"
                fill
                unoptimized
                className="hidden object-cover object-top dark:block"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </div>
        </motion.div>
    </section>
  );
}
