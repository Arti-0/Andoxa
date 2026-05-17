"use client";

/**
 * Layout pour les pages d'authentification - Design v3
 *
 * Structure :
 * - Header unifié avec logo, navigation et boutons auth
 * - Background avec 3 carrés floutés animés
 * - Contenu centré avec formulaire
 */

import { ReactNode } from "react";
import Balancer from "react-wrap-balancer";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  showBackToLogin?: boolean;
  showSignUpLink?: boolean;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  showBackToLogin = false,
  showSignUpLink = false,
}: AuthLayoutProps) {
  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Header simple avec logo et theme toggle */}
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Andoxa</span>
          </Link>
          <ThemeSwitcher />
        </div>
      </header>

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
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                <Balancer>{subtitle}</Balancer>
              </p>
            </div>

            {/* Contenu du formulaire */}
            <div className="animate-in fade-in duration-500">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
