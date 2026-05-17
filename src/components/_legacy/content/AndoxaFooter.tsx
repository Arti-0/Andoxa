"use client";

import Link from "next/link";
import Image from "next/image";
import { RiLinkedinLine, RiArrowUpLine } from "@remixicon/react";

const navigation = {
  product: [
    { name: "Fonctionnalités", href: "#features" },
    { name: "Tarifs", href: "/pricing" },
    // { name: "Démo", href: "/demo" },
    // { name: "API", href: "/api" },
  ],
  company: [
    { name: "À propos", href: "/about" },
    { name: "Changelog", href: "/changelog" },
    // { name: "Blog", href: "/blog" },
    // { name: "Carrières", href: "/careers" },
    // { name: "Presse", href: "/press" },
  ],
  support: [
    { name: "Centre d'aide", href: "/help" },
    // { name: "Documentation", href: "/docs" },
    // { name: "Communauté", href: "/community" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    // { name: "Mentions légales", href: "/legal" },
    { name: "Politique de confidentialité", href: "/privacy" },
    { name: "Sécurité", href: "/security" },
    { name: "Conditions d'utilisation", href: "/terms" },
    { name: "Conditions de vente", href: "/cgv" },
    // { name: "Cookies", href: "/cookies" },
  ],
  social: [
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/andoxa-crm/",
      icon: RiLinkedinLine,
    },
  ],
};

export default function AndoxaFooter() {
  return (
    <footer
      className="bg-slate-900 dark:bg-slate-950"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Logo and description */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/logofiles/logo_3.svg"
                alt="Andoxa Logo"
                width={120}
                height={40}
                className="h-8 w-auto"
                priority
              />
            </div>
            <p className="text-sm leading-6 text-slate-300">
              La plateforme CRM moderne conçue spécialement pour les
              Junior-Entreprises. Gérez vos prospects, automatisez vos campagnes
              et développez votre activité commerciale.
            </p>
            <div className="flex space-x-6">
              {navigation.social.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation links */}
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Produit
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.product.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-slate-300 hover:text-white transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Entreprise
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.company.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-slate-300 hover:text-white transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Support
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.support.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-slate-300 hover:text-white transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Légal
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.legal.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-slate-300 hover:text-white transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-16 border-t border-slate-800 pt-8 sm:mt-20 lg:mt-24">
          <div className="flex items-center justify-between">
          <p className="text-xs leading-5 text-slate-400">
            &copy; {new Date().getFullYear()} Andoxa. Tous droits réservés.
            Plateforme CRM pour Junior-Entreprises.
          </p>
            <button
              onClick={() => {
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
              className="flex items-center justify-center rounded-full bg-slate-800 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700"
              aria-label="Retour en haut de la page"
            >
              <RiArrowUpLine className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
