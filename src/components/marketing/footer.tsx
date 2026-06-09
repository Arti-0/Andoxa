"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ShieldCheck } from "lucide-react";
import { AndoxaWordmark, LinkedinIcon } from "@/components/marketing/icons/brand-icons";
import { Container } from "@/components/marketing/ui/container";

// French slugs per the route-reconciliation decision.
const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: "CGU", href: "/cgu" },
  { label: "CGV", href: "/cgv" },
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Confidentialité", href: "/privacy" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden text-white/85" style={{ backgroundColor: "#0a1530" }}>
      {/* Soft blue halo at the top so it blends with the CTA above. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_top,_var(--brand-blue)/0.25,_transparent_60%)]"
      />

      <Container className="relative py-14 sm:py-16">
        {/* Zone 1 — branding + contact */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="lg:max-w-md">
            <Link href="/" aria-label="Andoxa, retour à l'accueil" className="inline-flex items-center">
              {/* Dark footer → force the dark wordmark variant. */}
              <span className="dark">
                <AndoxaWordmark height={26} />
              </span>
            </Link>
            <p className="mt-5 text-xl font-medium leading-snug text-white sm:text-[1.375rem]">
              Le revenue engine pour les équipes commerciales modernes.
            </p>
            <p className="mt-3 text-sm leading-6 text-white/55">
              De LinkedIn à la signature, dans une seule stack.
            </p>
            <div className="mt-6 inline-flex items-center gap-2.5">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs text-white/55">Tous les services opérationnels</span>
            </div>
          </div>

          <div className="flex flex-col gap-7 lg:items-end lg:text-right">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Contact
              </p>
              <ul className="mt-3 space-y-1.5 text-sm leading-6 text-white/70">
                <li>
                  <a href="mailto:contact@andoxa.fr" className="transition-colors hover:text-white">
                    contact@andoxa.fr
                  </a>
                </li>
                <li>
                  <a href="tel:+33767068812" className="transition-colors hover:text-white">
                    07&nbsp;67&nbsp;06&nbsp;88&nbsp;12
                  </a>
                </li>
                <li className="pt-1 text-white/45">
                  18 rue du Général Leclerc
                  <br />
                  93110 Rosny-sous-Bois, France
                </li>
              </ul>
            </div>
            <div className="flex items-center gap-2 lg:justify-end">
              <a
                href="https://www.linkedin.com/company/andoxa"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Andoxa"
                className="grid h-9 w-9 place-items-center rounded-md text-white/55 transition-all hover:scale-110 hover:bg-white/5 hover:text-white"
              >
                <LinkedinIcon size={16} />
              </a>
              <a
                href="mailto:contact@andoxa.fr"
                aria-label="Envoyer un email à Andoxa"
                className="grid h-9 w-9 place-items-center rounded-md text-white/55 transition-all hover:scale-110 hover:bg-white/5 hover:text-white"
              >
                <Mail size={16} strokeWidth={1.8} />
              </a>
            </div>
          </div>
        </div>

        {/* Zone 2 — giant ANDOXA wordmark */}
        <div className="mt-12 border-t border-white/10 pt-10 sm:mt-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
            className="select-none whitespace-nowrap text-center font-black leading-[0.85] text-white/[0.06] text-[3.5rem] sm:text-[6rem] md:text-[9rem] lg:text-[12.5rem] xl:text-[16rem]"
            style={{ letterSpacing: "-0.06em" }}
          >
            ANDOXA
          </motion.div>
        </div>

        {/* Zone 3 — legal line */}
        <div className="mt-8 flex flex-col items-start gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-white/45">
            © {year} Andoxa. Tous droits réservés.
          </p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-white/55 sm:gap-x-4">
              {LEGAL_LINKS.map((link, i) => (
                <React.Fragment key={link.href}>
                  <li>
                    <Link href={link.href} className="transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                  {i < LEGAL_LINKS.length - 1 && (
                    <li aria-hidden="true" className="text-white/25">
                      ·
                    </li>
                  )}
                </React.Fragment>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-white/40">
              <ShieldCheck size={13} strokeWidth={1.8} />
              Conforme RGPD
            </span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
