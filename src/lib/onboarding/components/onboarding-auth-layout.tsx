"use client";

/**
 * Layout pour les pages d'onboarding - Design v3
 *
 * Structure :
 * - Header avec progress bar (au lieu des routes de navigation)
 * - Background avec 3 carrés floutés animés (même que /auth/)
 * - Contenu centré avec formulaire
 * - Bouton retour (optionnel) dans le style du toggle mensuel-annuel
 *
 * Utilise le même design system que les pages /auth/
 */

import { ReactNode } from "react";
import Balancer from "react-wrap-balancer";
import Link from "next/link";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../../../src/lib/utils";

interface OnboardingAuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  showBackButton?: boolean;
  backHref?: string;
}

export function OnboardingAuthLayout({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps,
  showBackButton = false,
  backHref = "/onboarding/name",
}: OnboardingAuthLayoutProps) {
  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Header avec progress bar */}
      <OnboardingHeader currentStep={currentStep} totalSteps={totalSteps} />

      {/* Conteneur principal avec background animé */}
      <div className="relative w-full min-h-screen overflow-hidden">
        {/* 3 carrés floutés animés - au moins un toujours visible */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="auth-background-shape auth-shape-1" />
          <div className="auth-background-shape auth-shape-2" />
          <div className="auth-background-shape auth-shape-3" />
        </div>

        {/* Contenu centré - au-dessus du background */}
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6 pt-24">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
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
        </div>
      </div>
    </div>
  );
}

