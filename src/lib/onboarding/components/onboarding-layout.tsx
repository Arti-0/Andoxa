import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import Balancer from "react-wrap-balancer";
import { ThemeSwitcher as ThemeToggle } from "@/components/ui/theme-switcher";

interface OnboardingLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  showBackButton?: boolean;
  backHref?: string;
  showProgress?: boolean;
  currentStep?: number;
  totalSteps?: number;
  showPrivacyText?: boolean;
}

export function OnboardingLayout({
  children,
  title,
  subtitle,
  showBackButton = false,
  backHref = "/auth/login",
  showProgress = false,
  currentStep = 1,
  totalSteps = 5,
  showPrivacyText = false,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative">
      {/* Header */}
      <div className="flex h-20 items-center justify-between px-6">
        <Link href="/" className="flex items-center space-x-2">
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
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <Link
              href={backHref}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              ← Retour
            </Link>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="px-6 pb-6">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
              <span>
                Étape {currentStep} sur {totalSteps}
              </span>
              <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 mt-20">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              <Balancer>{title}</Balancer>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              <Balancer>{subtitle}</Balancer>
            </p>
          </div>

          {children}

          {showPrivacyText && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                En utilisant ce service, vous acceptez nos{" "}
                <Link
                  href="/terms"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  conditions d&apos;utilisation
                </Link>{" "}
                et notre{" "}
                <Link
                  href="/privacy"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  politique de confidentialité
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Theme Toggle in bottom right */}
      <div className="fixed bottom-6 right-6">
        <ThemeToggle />
      </div>
    </div>
  );
}
