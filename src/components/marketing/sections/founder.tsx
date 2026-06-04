"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";

/* Verbatim copy — do not reformulate. */
const TITLE = "Pourquoi je vous parle directement";
const BODY =
  "Andoxa n'a pas encore mille clients — et je préfère vous le dire que vous afficher de faux logos. Ce que je peux vous montrer, c'est que je m'en sers chaque jour pour vendre Andoxa : c'est l'outil avec lequel je suis mes prospects, je relance, et je décroche mes RDV. Si vous rejoignez le Programme Fondateur maintenant, vous ne rejoignez pas un produit fini posé sur une étagère — vous entrez tôt, à prix fondateur, et vous pesez sur ce qu'il devient.";
const SIGNATURE = "— Sebastian, fondateur d'Andoxa";

export function MarketingFounderSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-t border-[var(--border)] bg-background py-24 sm:py-32">
      <Container className="relative">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-16">
          {/* Photo — portrait 4:5.
              TODO: déposer la vraie photo du fondateur ici → public/founder.jpg */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-xs lg:max-w-none"
          >
            <div
              className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--neutral-50)]"
              style={{
                boxShadow:
                  "0 30px 70px -30px color-mix(in srgb, var(--brand-blue) 38%, transparent), 0 8px 24px -12px color-mix(in srgb, var(--foreground) 16%, transparent)",
              }}
            >
              {/* unoptimized → sert /founder.jpg tel quel (placeholder léger,
                  remplacé par la vraie photo). Évite aussi l'optimiseur d'images. */}
              <Image
                src="/founder.jpg"
                alt="Sebastian, fondateur d'Andoxa"
                fill
                unoptimized
                sizes="(min-width: 1024px) 360px, 320px"
                className="object-cover"
              />
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Eyebrow>Mot du fondateur</Eyebrow>
            <h2 className="font-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {TITLE}
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {BODY}
            </p>
            <p className="mt-6 font-display text-base font-medium text-foreground">
              {SIGNATURE}
            </p>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
