"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AuthButton } from "@/lib/auth/components/auth-button-client";
import { ThemeSwitcher } from "../theme-switcher";
import { RiMenuLine, RiCloseLine } from "@remixicon/react";

const navigation = [
  { name: "Fonctionnalités", href: "/#features" },
  { name: "Tarifs", href: "/#tarifs" },
  { name: "À propos", href: "/#a-propos" },
  { name: "Changelog", href: "/changelog" },
  { name: "Contact", href: "/contact" },
];

export default function AndoxaHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/60">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8"
          aria-label="Global"
        >
          {/* Logo */}
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Andoxa</span>
              <div className="flex items-center gap-3">
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
              </div>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir le menu principal"
            >
              <span className="sr-only">Ouvrir le menu principal</span>
              <RiMenuLine className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden lg:flex lg:gap-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-semibold leading-6 text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-4">
            <ThemeSwitcher />
            <AuthButton />
          </div>
        </nav>
      </header>

      {/* Mobile menu - Outside header, portal-style */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-tooltip bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu panel */}
          <div className="fixed inset-y-0 right-0 z-notification w-full overflow-y-auto bg-white dark:bg-slate-900 sm:max-w-sm shadow-2xl lg:hidden">
            {/* Header with logo and close button */}
            <div className="flex items-center justify-between px-6 py-6 border-b border-slate-200 dark:border-slate-700">
              <Link
                href="/"
                className="-m-1.5 p-1.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Andoxa</span>
                <div className="flex items-center gap-3">
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
                </div>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fermer le menu"
              >
                <span className="sr-only">Fermer le menu</span>
                <RiCloseLine className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* Navigation menu */}
            <div className="px-6 py-6">
              <nav className="space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block rounded-lg px-4 py-3 text-base font-semibold text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Auth & Theme at bottom */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between px-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Thème
                  </span>
                  <ThemeSwitcher />
                </div>
                <AuthButton />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
