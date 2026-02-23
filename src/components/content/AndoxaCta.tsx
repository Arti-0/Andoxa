import { RiArrowRightLine, RiCheckLine } from "@remixicon/react";
import Link from "next/link";
import { Button } from "../ui/button";

const benefits = [
  "Essai gratuit de 14 jours",
  "Aucune carte de crédit requise",
  "Support dédié aux JE",
  "Onboarding",
];

export default function AndoxaCta() {
  return (
    <section className="bg-gradient-to-br from-slate-50 via-blue-100 to-blue-600 dark:from-slate-900 dark:via-blue-900 dark:to-blue-800 py-24 sm:py-32 relative overflow-hidden">
      {/* Gradient overlay for smooth transition */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/20 to-blue-600 dark:via-blue-500/30 dark:to-blue-800"></div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl dark:text-white">
            Prêt à transformer votre gestion commerciale ?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-700 dark:text-blue-100">
            Rejoignez les Junior-Entreprises qui font confiance à Andoxa pour
            gérer leurs prospects et développer leur activité commerciale.
          </p>

          {/* Benefits List */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 text-slate-700 dark:text-blue-100"
              >
                <RiCheckLine className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-300" />
                <span className="text-sm font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-12 px-8 text-base font-semibold"
            >
              <Link href="/pricing" className="flex items-center gap-2">
                Commencer maintenant
                <RiArrowRightLine className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base font-semibold border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors dark:border-blue-600 dark:text-white dark:hover:bg-blue-600 dark:hover:text-white"
            >
              <Link
                href="https://calendly.com/andoxa/30min"
                target="_blank"
                className="flex items-center gap-2"
              >
                Réserver une démo
              </Link>
            </Button>
          </div>

          {/* Trust Indicators - Commented out for later
          <div className="mt-16">
            <p className="text-sm text-slate-600 dark:text-blue-200">
              Une équipe passionnée au service des JEs
            </p>
            <div className="mt-4 flex justify-center space-x-8">
              <div className="h-8 w-24 rounded bg-white/20 dark:bg-white/10"></div>
              <div className="h-8 w-24 rounded bg-white/20 dark:bg-white/10"></div>
              <div className="h-8 w-24 rounded bg-white/20 dark:bg-white/10"></div>
              <div className="h-8 w-24 rounded bg-white/20 dark:bg-white/10"></div>
            </div>
          </div>
          */}
        </div>
      </div>
    </section>
  );
}
