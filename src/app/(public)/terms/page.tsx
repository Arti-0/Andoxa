"use client";

import { Badge } from "@/components/ui/badge";
import AndoxaHeader from "@/components/content/AndoxaHeader";
import AndoxaFooter from "@/components/content/AndoxaFooter";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { FileText, Shield, Users, CreditCard, Lock, AlertTriangle, X, Mail, Phone, HelpCircle } from "lucide-react";

export default function Terms() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    { id: "acceptation", title: "Acceptation", icon: FileText },
    { id: "service", title: "Description du service", icon: Shield },
    { id: "utilisation", title: "Utilisation acceptable", icon: AlertTriangle },
    { id: "compte", title: "Compte utilisateur", icon: Users },
    { id: "trial", title: "Essai gratuit", icon: Shield },
    { id: "facturation", title: "Facturation", icon: CreditCard },
    { id: "propriete", title: "Propriété intellectuelle", icon: Lock },
    { id: "responsabilite", title: "Limitation de responsabilité", icon: AlertTriangle },
    { id: "resiliation", title: "Résiliation", icon: X },
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
                <FileText className="h-4 w-4" />
                Conditions Générales
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
                Conditions Générales d&apos;Utilisation
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white mb-6">
                <Balancer>Règles d&apos;Utilisation de la Plateforme</Balancer>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Ce document définit les conditions d&apos;utilisation de la plateforme Andoxa et constitue un contrat légalement contraignant entre vous et Andoxa.
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
                <span>Dernière mise à jour : Décembre 2025</span>
              </div>
            </section>

            {/* Content */}
            <div className="space-y-12">
              <section id="acceptation" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  1. Acceptation des conditions
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <Balancer>
                    En accédant et en utilisant la plateforme Andoxa (&quot;le
                    Service&quot;), vous acceptez d&apos;être lié par ces
                    conditions générales d&apos;utilisation (&quot;CGU&quot;).
                    Si vous n&apos;acceptez pas l&apos;intégralité de ces
                    conditions, veuillez ne pas utiliser notre service. Ces CGU
                    constituent un contrat légalement contraignant entre vous et
                    Andoxa.
                  </Balancer>
                </p>
                </Card>
              </section>

              <section id="service" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                  2. Description du service
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Andoxa est une plateforme CRM (Customer Relationship
                  Management) SaaS conçue spécialement pour les
                  Junior-Entreprises. Notre service comprend :
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                  <li>Gestion centralisée des prospects et clients</li>
                  <li>
                    Création et automatisation de campagnes email marketing
                  </li>
                  <li>
                    Enrichissement et scoring intelligent des prospects (IA)
                  </li>
                  <li>Synchronisation calendrier avec Google et Microsoft</li>
                  <li>Tableaux de bord et analytics en temps réel</li>
                  <li>Outils de collaboration en équipe</li>
                  <li>
                    Base de données unifiée avec déduplication automatique
                  </li>
                </ul>
                </Card>
              </section>

              <section id="utilisation" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                  3. Utilisation acceptable
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Vous vous engagez à utiliser Andoxa uniquement à des fins
                  légales et professionnelles. Les utilisations suivantes sont
                  strictement interdites :
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                  <li>
                    Envoi de spam, emails non sollicités ou communications
                    abusives
                  </li>
                  <li>
                    Violation des droits de propriété intellectuelle de tiers
                  </li>
                  <li>
                    Transmission de contenus illégaux, diffamatoires ou
                    nuisibles
                  </li>
                  <li>
                    Tentative de compromettre la sécurité du système ou
                    d&apos;autres utilisateurs
                  </li>
                  <li>
                    Utilisation de robots, scrapers ou outils automatisés non
                    autorisés
                  </li>
                  <li>
                    Revente ou redistribution du service sans autorisation
                  </li>
                  <li>
                    Collecte de données d&apos;autres utilisateurs sans
                    consentement
                  </li>
                </ul>
                </Card>
              </section>

              <section id="compte" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 text-blue-600" />
                  4. Compte utilisateur
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Pour accéder aux fonctionnalités d&apos;Andoxa, vous devez
                  créer un compte avec une adresse email valide. Vous êtes
                  responsable de maintenir la confidentialité de vos
                  identifiants de connexion et de toutes les activités qui se
                  déroulent sous votre compte. Vous devez nous informer
                  immédiatement de toute utilisation non autorisée de votre
                  compte. Un seul essai gratuit par structure (domaine email)
                  est autorisé.
                </p>
                </Card>
              </section>

              <section id="trial" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                  5. Essai gratuit de 14 jours
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Nous proposons un essai gratuit de 14 jours pour le plan Essential, limité à 1
                  utilisateur avec accès à :
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                  <li>
                    Prospection CRM (liste de prospects, BDD, Pipeline) -
                    Maximum 500 prospects
                  </li>
                  <li>Campagnes email basiques</li>
                  <li>KPI de base</li>
                  <li>Support email</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-300 mt-4">
                  <strong>
                    Fonctionnalités verrouillées pendant l&apos;essai :
                  </strong>{" "}
                  Calendrier intégré, Analytics avancés, Crédits d&apos;enrichissement. Aucune carte bancaire n&apos;est requise pour
                  l&apos;                  essai. Un seul essai gratuit est autorisé par utilisateur.
                </p>
                </Card>
              </section>

              <section id="facturation" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  6. Facturation et paiement
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Les tarifs sont indiqués sur notre page de tarification et
                  peuvent être modifiés avec un préavis de 30 jours. Nos plans disponibles sont :
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300 mb-4">
                  <li><strong>Essential :</strong> 29€/mois ou 279€/an (soit 23€/mois avec réduction de 20%)</li>
                  <li><strong>Pro :</strong> 99€/mois ou 950€/an (soit 79€/mois avec réduction de 20%)</li>
                  <li><strong>Business :</strong> 179€/mois ou 1718€/an (soit 143€/mois avec réduction de 20%)</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Les paiements sont facturés à l&apos;avance selon le cycle choisi
                  (mensuel ou annuel). Tous les paiements sont traités de
                  manière sécurisée par Stripe. Vous pouvez changer de plan ou
                  annuler votre abonnement à tout moment depuis votre tableau de
                  bord. Les changements prennent effet immédiatement et sont
                  proratisés. Aucun remboursement ne sera effectué pour la
                  période déjà facturée, sauf en cas d&apos;interruption
                  prolongée du service (plus de 24h) de notre fait. En cas de non-paiement,
                  votre accès au service sera suspendu après un délai de grâce
                  de 7 jours.
                </p>
                </Card>
              </section>

              <section id="propriete" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Lock className="h-6 w-6 text-blue-600" />
                  7. Propriété intellectuelle
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  La plateforme Andoxa, son code source, sa marque, son logo et
                  tout son contenu sont protégés par les lois françaises et
                  internationales sur la propriété intellectuelle. Vous
                  conservez la propriété complète de vos données (prospects,
                  campagnes, contenu). Nous vous accordons une licence limitée,
                  non exclusive et révocable pour utiliser le service. Vous ne
                  pouvez pas copier, modifier, distribuer ou créer des œuvres
                  dérivées de notre logiciel sans autorisation écrite préalable.
                </p>
                </Card>
              </section>

              <section id="responsabilite" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                  8. Limitation de responsabilité
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Le service est fourni &quot;en l&apos;état&quot; sans garantie
                  d&apos;aucune sorte. Dans la mesure permise par la loi
                  française, Andoxa ne peut être tenu responsable des dommages
                  indirects, consécutifs, spéciaux ou punitifs résultant de
                  l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser
                  notre service. Notre responsabilité totale ne dépassera pas le
                  montant que vous avez payé au cours des 12 derniers mois. Nous
                  ne garantissons pas un fonctionnement ininterrompu et nous
                  nous réservons le droit d&apos;effectuer des maintenances
                  planifiées.
                </p>
              </Card>

              <Card
                id="resiliation"
                className="p-8 border-slate-200 dark:border-slate-700"
              >
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  9. Résiliation
                </h2>
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>Par vous :</strong> Vous pouvez résilier votre
                    compte à tout moment depuis votre tableau de bord. La
                    résiliation prend effet immédiatement et vos données seront
                    supprimées dans les 30 jours selon notre politique de
                    conservation.
                  </p>
                  <p>
                    <strong>Par Andoxa :</strong> Nous pouvons suspendre ou
                    résilier votre compte en cas de violation de ces conditions,
                    de non-paiement, ou d&apos;utilisation frauduleuse. Nous
                    vous en informerons par email avec un préavis de 7 jours
                    sauf en cas d&apos;urgence sécuritaire.
                  </p>
                  <p>
                    <strong>Après résiliation :</strong> Vous perdrez
                    l&apos;accès à toutes vos données. Nous vous recommandons
                    d&apos;exporter vos données avant la résiliation via la
                    fonctionnalité d&apos;export CSV.
                  </p>
                </div>
                </Card>
              </section>

              <section id="modifications" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  10. Modification des conditions
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Nous nous réservons le droit de modifier ces conditions
                  générales d&apos;utilisation à tout moment. Les modifications
                  importantes vous seront communiquées par email au moins 30
                  jours à l&apos;avance. Votre utilisation continue du service
                  après la notification constitue votre acceptation des
                  nouvelles conditions. Nous vous encourageons à consulter
                  régulièrement cette page pour rester informé.
                </p>
                </Card>
              </section>

              <section id="droit" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  11. Droit applicable et juridiction
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Ces conditions générales d&apos;utilisation sont régies et
                  interprétées conformément au droit français. En cas de litige,
                  les parties s&apos;engagent à rechercher une solution amiable.
                  Le Client peut recourir à la médiation de la consommation selon les
                  modalités prévues aux articles L. 616-1 et suivants du Code
                  de la consommation. À défaut d&apos;accord, tout litige relatif à
                  l&apos;interprétation ou à l&apos;exécution des présentes sera
                  soumis à la compétence exclusive des tribunaux de Paris,
                  France.
                </p>
                </Card>
              </section>

              <section id="contact" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Mail className="h-6 w-6 text-blue-600" />
                  12. Contact
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  Pour toute question concernant ces conditions
                  d&apos;utilisation :
                </p>
                <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Email :
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
                      Support technique :
                    </span>
                    <a
                      href="mailto:support@andoxa.fr"
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      support@andoxa.fr
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
                      Support :
                    </span>
                    <Link
                      href="/help"
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Centre d&apos;aide
                    </Link>
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
