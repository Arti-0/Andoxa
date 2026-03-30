"use client";

/**
 * Header unifié pour homepage et pages auth - Design v3
 *
 * Utilisé à la fois sur :
 * - La homepage (avec menu mobile)
 * - Les pages d'authentification (sans menu mobile)
 */

import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { RiMenuLine, RiCloseLine } from "@remixicon/react";
import { LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/lib/auth/components/logout-button";

const navigation = [
  { name: "Fonctionnalités", href: "/#features" },
  { name: "Tarifs", href: "/#tarifs" },
  { name: "Contact", href: "/#contact" },
  { name: "Changelog", href: "/changelog" },
];

interface UnifiedHeaderProps {
  /**
   * Si true, affiche le menu mobile (pour la homepage)
   * Si false, header simplifié (pour les pages auth)
   */
  showMobileMenu?: boolean;
  /**
   * Si true, le header réagit au scroll (pour la homepage)
   */
  enableScrollEffect?: boolean;
  /**
   * Si true, masque les routes de navigation et les boutons d'authentification
   * (pour les pages /select-organization)
   */
  hideNavigation?: boolean;
}

export function UnifiedHeader({
  showMobileMenu = false,
  enableScrollEffect = false,
  hideNavigation = false,
}: UnifiedHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const { scrollY } = useScroll();

  // Routes où le bouton "Vue d'ensemble" ne doit pas être affiché
  const hideOverviewButton =
    pathname === "/onboarding" ||
    pathname?.startsWith("/onboarding/");

  // Animate header on scroll (seulement si activé)
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (enableScrollEffect) {
      setScrolled(latest > 50);
    }
  });

  // Écouter les changements d'auth state
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
      } else if (event === "SIGNED_OUT" || !session) {
        setUser(null);
      }
    });

    // Vérifier l'état initial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (!enableScrollEffect) return;
    // Only animate if clicking on the header itself, not on interactive elements
    if ((e.target as HTMLElement).closest("a, button")) {
      return;
    }
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);
  };

  return (
    <>
      <motion.header
        initial={enableScrollEffect ? { y: -100 } : false}
        animate={
          enableScrollEffect
            ? {
                y: 0,
                scale: isClicked ? 0.97 : 1,
              }
            : {}
        }
        transition={
          enableScrollEffect
            ? {
                duration: 0.3,
                ease: [0, 0, 0, 1],
              }
            : {}
        }
        onMouseDown={handleHeaderMouseDown}
        className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-6rem)] max-w-7xl transition-all duration-300 rounded-3xl backdrop-blur-xl cursor-pointer",
          enableScrollEffect && scrolled
            ? "bg-white/80 dark:bg-slate-900/80 border-white/30 dark:border-white/10 shadow-xl"
            : "bg-white/90 dark:bg-black/90 border-white/20 dark:border-white/10 shadow-lg"
        )}
        style={
          enableScrollEffect
            ? {
                boxShadow: scrolled
                  ? "0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 2px 8px rgba(0, 0, 0, 0.05)"
                  : "0 4px 24px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 1px 4px rgba(0, 0, 0, 0.03)",
              }
            : {}
        }
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

          {/* Mobile menu button - seulement si activé */}
          {showMobileMenu && (
            <div className="flex lg:hidden">
              <motion.button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center rounded-md p-2.5 transition-colors",
                  "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={
                  mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu principal"
                }
                whileTap={{ scale: 0.95 }}
              >
                <span className="sr-only">
                  {mobileMenuOpen
                    ? "Fermer le menu"
                    : "Ouvrir le menu principal"}
                </span>
                {mobileMenuOpen ? (
                  <RiCloseLine className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <RiMenuLine className="h-6 w-6" aria-hidden="true" />
                )}
              </motion.button>
            </div>
          )}

          {/* Desktop navigation */}
          {!hideNavigation && (
            <div className="hidden lg:flex lg:gap-x-8">
              {navigation.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={enableScrollEffect ? { opacity: 0, y: -20 } : false}
                  animate={enableScrollEffect ? { opacity: 1, y: 0 } : {}}
                  transition={enableScrollEffect ? { delay: index * 0.1 } : {}}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "text-sm font-semibold leading-6 transition-colors relative group",
                      enableScrollEffect && scrolled
                        ? "text-slate-900 hover:text-orange-500 dark:text-white dark:hover:text-orange-400"
                        : "text-black hover:text-orange-500 dark:text-white/90 dark:hover:text-white"
                    )}
                  >
                    {item.name}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full" />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Desktop CTA - Boutons d'authentification et toggle de thème */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-4">
            {!hideNavigation && (
              <>
                {user ? (
                  <div className="flex items-center gap-2">
                    {!hideOverviewButton && (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-10 px-4 text-sm font-semibold text-slate-800 dark:text-slate-100 btn-neumorphism glassmorphism rounded-full border-0"
                      >
                        <Link href="/dashboard" className="relative z-10">
                          Vue d&apos;ensemble
                        </Link>
                      </Button>
                    )}
                    <LogoutButton />
                  </div>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-10 px-4 text-sm font-semibold text-slate-800 dark:text-slate-100 btn-neumorphism glassmorphism btn-gradient-border always-active rounded-full border-0"
                  >
                    <Link
                      href="/auth/login"
                      className="relative z-10 flex items-center gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      S&apos;inscrire
                    </Link>
                  </Button>
                )}
              </>
            )}
            {/* Toggle de thème tout à droite */}
            <ThemeSwitcher />
          </div>
        </nav>

        {/* Mobile dropdown menu - seulement si activé */}
        {showMobileMenu && (
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="overflow-hidden lg:hidden"
              >
                <div className="px-3 pb-4 pt-2 space-y-3 border-t border-white/20 dark:border-white/10 mt-2">
                  {/* Navigation routes */}
                  <nav className="space-y-1">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "block rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                          enableScrollEffect && scrolled
                            ? "text-slate-900 hover:bg-white/20 dark:text-white dark:hover:bg-white/10"
                            : "text-black hover:bg-white/20 dark:text-white/90 dark:hover:bg-white/10"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>

                  {/* Separator */}
                  <div className="h-px bg-white/20 dark:bg-white/10 my-2" />

                  {/* Auth & Theme */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-4 py-2">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          enableScrollEffect && scrolled
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-black dark:text-white/90"
                        )}
                      >
                        Thème
                      </span>
                      <ThemeSwitcher />
                    </div>
                    <div className="px-1">
                      {user ? (
                        <div className="flex flex-col gap-2">
                          {!hideOverviewButton && (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="w-full h-10 text-sm font-semibold text-slate-800 dark:text-slate-100 btn-neumorphism glassmorphism rounded-full border-0"
                            >
                              <Link href="/dashboard">Vue d&apos;ensemble</Link>
                            </Button>
                          )}
                          <LogoutButton />
                        </div>
                      ) : (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="w-full h-10 text-sm font-semibold text-slate-800 dark:text-slate-100 btn-neumorphism glassmorphism btn-gradient-border always-active rounded-full border-0"
                        >
                          <Link
                            href="/auth/login"
                            className="relative z-10 flex items-center justify-center gap-2"
                          >
                            <LogIn className="h-4 w-4" />
                            S&apos;inscrire
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.header>
    </>
  );
}

