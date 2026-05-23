"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { cn } from "@/lib/utils";

const QA: { q: string; a: React.ReactNode }[] = [
  {
    q: "Y a-t-il un engagement ?",
    a: (
      <p>
        Non. L&apos;abonnement mensuel est résiliable à tout moment depuis votre espace client.
        L&apos;abonnement annuel est payé en une fois, mais reste résiliable en fin de période.
      </p>
    ),
  },
  {
    q: "Que se passe-t-il si je dépasse 20 utilisateurs ?",
    a: (
      <p>
        Le plan Team couvre jusqu&apos;à 20 utilisateurs. Au-delà, contactez-nous pour un{" "}
        <a href="/contact?objet=custom" className="font-medium text-[var(--brand-blue)] hover:underline">
          devis Custom
        </a>
        .
      </p>
    ),
  },
  {
    q: "Andoxa est-il conforme RGPD ?",
    a: (
      <p>
        Oui. Les données sont hébergées en Europe, chiffrées au repos et en transit. Nous fournissons
        un DPA sur demande et respectons la totalité des droits d&apos;accès, rectification,
        effacement et portabilité. Voir notre{" "}
        <a href="/privacy" className="font-medium text-[var(--brand-blue)] hover:underline">
          politique de confidentialité
        </a>
        .
      </p>
    ),
  },
  {
    q: "Mon compte LinkedIn risque-t-il d'être bloqué ?",
    a: (
      <p>
        Andoxa respecte par défaut les limites quotidiennes recommandées (~30 invitations/jour la
        première semaine, montée progressive). Aucune action automatique ne dépasse ces seuils. Vous
        gardez le contrôle total via les paramètres de campagne.
      </p>
    ),
  },
  {
    q: "Comment se passe la migration depuis HubSpot, Pipedrive, Salesforce… ?",
    a: (
      <p>
        Import CSV guidé pour les contacts et les opportunités, mapping des champs assisté, et
        accompagnement par l&apos;équipe pendant la première semaine. Sans frais sur les plans Team
        et Custom.
      </p>
    ),
  },
  {
    q: "Puis-je essayer Andoxa avant de souscrire ?",
    a: (
      <p>
        Oui. Réservez une démo commerciale gratuite de 30 minutes pour voir la plateforme avec vos
        cas d&apos;usage réels. Un essai Solo peut aussi être proposé depuis la page tarifs selon
        l&apos;offre en cours. Une fois souscrit, vous pouvez annuler à tout moment dans le mois si
        ça ne convient pas.
      </p>
    ),
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: (
      <p>
        Carte bancaire et prélèvement SEPA via Stripe pour le paiement mensuel ou annuel. Pour les
        plans Custom, la facturation par virement annuel est possible.
      </p>
    ),
  },
];

export function PricingFaq() {
  return (
    <section className="relative border-t border-[var(--border)] bg-[var(--neutral-50)]/60 py-24 sm:py-32">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Eyebrow className="justify-center">FAQ</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Les questions{" "}
            <span className="text-[var(--brand-blue)]">qu&apos;on nous pose le plus</span>.
          </h2>
        </div>

        <div className="mx-auto max-w-3xl space-y-2">
          {QA.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-muted-foreground">
          Une autre question ?{" "}
          <a href="/contact" className="font-medium text-foreground underline underline-offset-2 hover:text-[var(--brand-blue)]">
            Écrivez-nous
          </a>
          , on vous répond sous 24 h ouvrées.
        </p>
      </Container>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--neutral-50)]/60 sm:px-6"
      >
        <span className="text-[15px] font-semibold text-foreground sm:text-base">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full border border-[var(--border)] transition-colors",
            open ? "border-[var(--brand-blue)] bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]" : "text-muted-foreground",
          )}
        >
          <ChevronDown size={15} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-[15px] leading-7 text-muted-foreground sm:px-6">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
