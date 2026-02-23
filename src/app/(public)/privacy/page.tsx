"use client";

import { Badge } from "@/components/ui/badge";
import AndoxaHeader from "@/components/content/AndoxaHeader";
import AndoxaFooter from "@/components/content/AndoxaFooter";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { Lock, Shield, FileText, Users, Eye, Database, Cookie, Mail, Phone } from "lucide-react";

export default function Privacy() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    { id: "intro", title: "Introduction", icon: Shield },
    { id: "donnees", title: "Données collectées", icon: Database },
    { id: "utilisation", title: "Utilisation", icon: Users },
    { id: "partage", title: "Partage", icon: Users },
    { id: "securite", title: "Sécurité", icon: Lock },
    { id: "conservation", title: "Conservation", icon: Database },
    { id: "droits", title: "Vos droits", icon: FileText },
    { id: "cookies", title: "Cookies", icon: Cookie },
    { id: "contact", title: "Contact", icon: Mail },
  ];

  // Scroll spy effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <AndoxaHeader />
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Politique de Confidentialité
              </h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`block px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                      activeSection === section.id
                        ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/20 dark:text-blue-400"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <section.icon className="h-4 w-4" />
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 mb-4">
                  Besoin d&apos;informations supplémentaires ?
                </p>
                <Link
                  href="/contact"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Contacter l&apos;équipe →
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Hero */}
            <section className="mb-16">
              <Badge className="mb-6 bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                Politique de Confidentialité
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white mb-6">
                <Balancer>Protection de vos Données Personnelles</Balancer>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Cette politique explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre plateforme CRM.
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
                <span>Dernière mise à jour : Décembre 2025</span>
              </div>
            </section>

            {/* Content Cards */}
            <div className="space-y-12">
              {/* Introduction */}
              <section id="intro" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                  1. Introduction
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <Balancer>
                    Chez Andoxa, nous nous engageons à protéger votre vie privée
                    et vos données personnelles. Cette politique explique
                    comment nous collectons, utilisons et protégeons vos
                    informations lorsque vous utilisez notre plateforme CRM.
                    Nous respectons le RGPD et la loi Informatique et Libertés.
                  </Balancer>
                </p>
                </Card>
              </section>

              {/* Données */}
              <section id="donnees" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Database className="h-6 w-6 text-blue-600" />
                  2. Données collectées
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Nous collectons les types de données suivants, uniquement avec
                  votre consentement ou pour l&apos;exécution de notre contrat
                  de service :
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                  <li>Nom complet, adresse email, numéro de téléphone</li>
                  <li>Nom d&apos;entreprise et URL LinkedIn professionnels</li>
                  <li>Rôle et informations professionnelles</li>
                  <li>Photo de profil ou avatar</li>
                  <li>Notes sur vos prospects et clients</li>
                  <li>Informations de paiement (via Stripe sécurisé)</li>
                  <li>Événements calendrier et rendez-vous</li>
                  <li>Contenu de campagnes email</li>
                  <li>Historique d&apos;activité et métriques</li>
                  </ul>
                </Card>
              </section>

              {/* Utilisation */}
              <section id="utilisation" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 text-blue-600" />
                  3. Utilisation des données
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                  <li>Authentification et gestion de votre compte</li>
                  <li>Gestion CRM de vos prospects et clients</li>
                  <li>Envoi de campagnes email personnalisées</li>
                  <li>Calcul de KPIs et génération de rapports</li>
                  <li>Synchronisation calendrier</li>
                  <li>Collaboration en équipe</li>
                  <li>Amélioration du service</li>
                  <li>Support client</li>
                  </ul>
                </Card>
              </section>

              {/* Partage */}
              <section id="partage" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 text-blue-600" />
                  4. Partenaires et partage de données
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Nous ne vendons jamais vos données. Partenaires conformes RGPD
                  :
                </p>
                <div className="space-y-3">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <strong className="text-slate-900 dark:text-white">
                      Supabase, Vercel
                    </strong>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      Infrastructure et hébergement
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <strong className="text-slate-900 dark:text-white">
                      SendGrid, Google, Microsoft, Schedule-X
                    </strong>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      Emails et synchronisation calendrier
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <strong className="text-slate-900 dark:text-white">
                      Stripe
                    </strong>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      Paiements sécurisés (PCI-DSS)
                    </p>
                  </div>
                </div>
                </Card>
              </section>

              {/* Sécurité */}
              <section id="securite" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Lock className="h-6 w-6 text-blue-600" />
                  5. Mesures de sécurité
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Chiffrement TLS/SSL et AES-256, authentification JWT,
                  isolation multi-tenant stricte, validation de toutes les
                  entrées, protection contre injections SQL et XSS, rate limiting
                  sur toutes les routes API, sauvegardes quotidiennes, certification SOC 2 et ISO 27001, protection
                  DDoS.
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                  <li><strong>Rate Limiting :</strong> Protection contre les abus et attaques par déni de service via un système de limitation de débit intelligent basé sur Redis</li>
                  <li><strong>Sanitization :</strong> Tous les contenus HTML sont nettoyés via DOMPurify avant affichage</li>
                  <li><strong>Validation stricte :</strong> Toutes les données sont validées via Zod avant traitement</li>
                </ul>
                <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                  Pour obtenir des informations détaillées sur nos protocoles,
                  vous pouvez consulter notre{" "}
                  <Link
                    href="/security"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    livre blanc sur la sécurité
                  </Link>
                  .
                </p>
                </Card>
              </section>

              {/* Conservation */}
              <section id="conservation" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Database className="h-6 w-6 text-blue-600" />
                  6. Conservation des données
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-2 text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>Compte :</strong> Durée active + 30 jours
                  </p>
                  <p>
                    <strong>Prospects :</strong> Relation commerciale + 3 ans
                    max
                  </p>
                  <p>
                    <strong>Campagnes :</strong> 2 ans
                  </p>
                  <p>
                    <strong>Analytics :</strong> 13 mois
                  </p>
                  <p>
                    <strong>Facturation :</strong> 10 ans (obligation légale)
                  </p>
                </div>
                </Card>
              </section>

              {/* Droits */}
              <section id="droits" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  7. Vos droits RGPD
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
                    <strong className="text-slate-900 dark:text-white">
                      Droit d&apos;accès
                    </strong>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Copie de vos données
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
                    <strong className="text-slate-900 dark:text-white">
                      Droit de rectification
                    </strong>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Corriger vos données
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
                    <strong className="text-slate-900 dark:text-white">
                      Droit à l&apos;effacement
                    </strong>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Suppression de vos données
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
                    <strong className="text-slate-900 dark:text-white">
                      Droit à la portabilité
                    </strong>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Export de vos données (sur demande)
                    </p>
                  </div>
                </div>
                </Card>
              </section>

              {/* Cookies */}
              <section id="cookies" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Cookie className="h-6 w-6 text-blue-600" />
                  8. Cookies
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4">
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      Cookies essentiels
                    </strong>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      Authentification Supabase (obligatoires)
                    </p>
                  </div>
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      Préférences
                    </strong>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      Thème clair/sombre (localStorage)
                    </p>
                  </div>
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      Analytics
                    </strong>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      Vercel (anonymisées, 13 mois)
                    </p>
                  </div>
                </div>
                </Card>
              </section>

              {/* Contact */}
              <section id="contact" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Mail className="h-6 w-6 text-blue-600" />
                  9. Contact et DPO
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Contact :
                    </span>
                    <a
                      href="mailto:contact@andoxa.fr"
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      contact@andoxa.fr
                    </a>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Téléphone :
                    </span>
                    <a
                      href="tel:+33661758940"
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      06 61 75 89 40
                    </a>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      CNIL :
                    </span>
                    <a
                      href="https://www.cnil.fr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      www.cnil.fr
                    </a>
                  </div>
                </div>
                </Card>
              </section>
            </div>

            {/* CTA */}
            <section className="mt-16">
              <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-12 text-center">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  Une question spécifique ?
                </h2>
                <p className="mt-4 text-lg text-slate-300">
                  Notre équipe est à votre écoute.
                </p>
                <div className="mt-8">
                  <a
                    href="mailto:contact@andoxa.fr"
                    className="inline-flex items-center justify-center rounded-md bg-white px-8 py-3 text-base font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    contact@andoxa.fr
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <AndoxaFooter />
    </main>
  );
}
