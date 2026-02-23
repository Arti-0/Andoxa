"use client";

/**
 * Layout pour les pages /select-organization/step1 et step2 - Design v3
 *
 * Structure :
 * - Header avec progress bar (au lieu des routes de navigation)
 * - Utilise le même background animé que le layout parent
 * - Contenu centré avec formulaire
 * - Bouton retour (optionnel) dans le style du toggle mensuel-annuel
 *
 * Utilise le même design system que les pages /auth/ et /onboarding/
 */

import { ReactNode } from "react";
import Balancer from "react-wrap-balancer";
import Link from "next/link";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../../../src/lib/utils";

interface SelectOrgLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  showBackButton?: boolean;
  backHref?: string;
  wide?: boolean; // Permet une largeur plus grande pour les pages comme step2
}

export function SelectOrgLayout({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps,
  showBackButton = false,
  backHref = "/select-organization",
  wide = false,
}: SelectOrgLayoutProps) {
  return (
    <div className={cn(
      "w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700",
      wide ? "max-w-7xl" : "max-w-md"
    )}>
      {/* Header avec progress bar */}
      <OnboardingHeader currentStep={currentStep} totalSteps={totalSteps} />

      {/* Titre et sous-titre */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          <Balancer>{title}</Balancer>
        </h1>
        {subtitle && (
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            <Balancer>{subtitle}</Balancer>
          </p>
        )}
      </div>

      {/* Contenu du formulaire */}
      <div className="animate-in fade-in duration-500">{children}</div>

      {/* Bouton retour - style toggle mensuel-annuel */}
      {showBackButton && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            href={backHref}
            className={cn(
              "flex items-center gap-2 text-base font-medium transition-colors",
              "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>
      )}
    </div>
  );
}

