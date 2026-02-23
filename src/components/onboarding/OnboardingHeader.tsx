"use client";

/**
 * Header pour les pages d'onboarding - Design v3
 * 
 * Basé sur UnifiedHeader mais avec une progress bar au lieu des routes de navigation
 * Utilise le même design system que les pages /auth/
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "../../../src/lib/utils";

interface OnboardingHeaderProps {
  /**
   * Étape actuelle (1-indexed)
   */
  currentStep: number;
  /**
   * Nombre total d'étapes
   */
  totalSteps: number;
}

export function OnboardingHeader({
  currentStep,
  totalSteps,
}: OnboardingHeaderProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0, 0, 0, 1]
      }}
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-6rem)] max-w-7xl transition-all duration-300 rounded-3xl backdrop-blur-xl",
        "bg-white/90 dark:bg-black/90 border-white/20 dark:border-white/10 shadow-lg"
      )}
      style={{
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 1px 4px rgba(0, 0, 0, 0.03)"
      }}
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-4 sm:py-4 lg:px-8"
        aria-label="Global"
      >
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Andoxa</span>
            <Image
              src="/assets/logofiles/logo_1.svg"
              alt="Andoxa Logo"
              width={120}
              height={40}
              className="h-8 w-auto dark:hidden"
              priority
            />
            <Image
              src="/assets/logofiles/logo_3.svg"
              alt="Andoxa Logo"
              width={120}
              height={40}
              className="h-8 w-auto hidden dark:block"
              priority
            />
          </Link>
        </div>

        {/* Progress Bar - Centré */}
        <div className="hidden md:flex flex-1 items-center justify-center px-8 max-w-md mx-auto">
          <div className="w-full space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                Étape {currentStep} sur {totalSteps}
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                {Math.round(progress)}%
              </span>
            </div>
            {/* Progress Bar avec style glassmorphism/neumorphism */}
            <div className="relative w-full h-3 rounded-full overflow-hidden backdrop-blur-sm bg-slate-200/30 dark:bg-slate-700/30 border border-white/20 dark:border-white/10 shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary/80 shadow-lg"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                }}
              />
            </div>
          </div>
        </div>

        {/* Mobile Progress - Compact */}
        <div className="md:hidden flex-1 mx-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
              {currentStep}/{totalSteps}
            </span>
            <div className="relative flex-1 h-2 rounded-full overflow-hidden backdrop-blur-sm bg-slate-200/30 dark:bg-slate-700/30 border border-white/20 dark:border-white/10 shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary/80"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex lg:flex-1 lg:justify-end">
          <ThemeSwitcher />
        </div>
      </nav>
    </motion.header>
  );
}

