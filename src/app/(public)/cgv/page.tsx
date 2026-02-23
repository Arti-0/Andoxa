"use client";

import { Badge } from "@/components/ui/badge";
import AndoxaHeader from "@/components/content/AndoxaHeader";
import AndoxaFooter from "@/components/content/AndoxaFooter";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { FileText, ShoppingCart, CreditCard, Truck, Shield, RotateCcw, X, Gavel, Mail, Phone } from "lucide-react";

export default function CGV() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    { id: "preambule", title: "Préambule", icon: FileText },
    { id: "definitions", title: "Définitions", icon: FileText },
    { id: "commande", title: "Commande et acceptation", icon: ShoppingCart },
    { id: "tarifs", title: "Tarifs et modalités de paiement", icon: CreditCard },
    { id: "facturation", title: "Facturation", icon: CreditCard },
    { id: "livraison", title: "Livraison et mise à disposition", icon: Truck },
    { id: "garanties", title: "Garanties", icon: Shield },
    { id: "retractation", title: "Droit de rétractation", icon: RotateCcw },
    { id: "resiliation", title: "Résiliation et remboursements", icon: X },
    { id: "litiges", title: "Litiges et médiation", icon: Gavel },
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
                Conditions de Vente
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
              <Badge className="mb-6 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                Conditions Générales de Vente
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white mb-6">
                <Balancer>Conditions Commerciales et Facturation</Balancer>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Ce document définit les conditions commerciales, tarifs, modalités de paiement et garanties applicables à nos services.
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
                <span>Dernière mise à jour : Décembre 2025</span>
              </div>
            </section>

            {/* Content */}
            <div className="space-y-12">
              <section id="preambule" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-green-600" />
                  1. Préambule
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>Vendeur :</strong> Andoxa SAS
                  </p>
                  <p>
                    <strong>Forme juridique :</strong> Société par Actions
                    Simplifiée
                  </p>
                  <p>
                    <strong>Capital social :</strong> 500€
                  </p>
                  <p>
                    <strong>RCS :</strong> 990 974 370 R.C.S. Bobigny
                  </p>
                  <p>
                    <strong>SIRET :</strong> 99097437000019
                  </p>
                  <p>
                    <strong>Siège social :</strong> 18 Rue du Général Leclerc, 93110 Rosny-sous-Bois, France
                  </p>
                  <p>
                    <strong>Directeur de publication :</strong> BODIN Sebastian
                  </p>
                  <p>
                    <strong>Téléphone :</strong> 06 61 75 89 40
                  </p>
                  <p>
                    <strong>Email :</strong> contact@andoxa.fr
                  </p>
                  <p>
                    <strong>Site web :</strong> https://andoxa.fr
                  </p>
                </div>
                </Card>
              </section>

              <section id="definitions" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-green-600" />
                  2. Définitions
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      Client :
                    </strong>{" "}
                    Toute personne physique ou morale qui souscrit à un
                    abonnement Andoxa
                  </div>
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      Service :
                    </strong>{" "}
                    Plateforme CRM SaaS Andoxa accessible via internet
                  </div>
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      Abonnement :
                    </strong>{" "}
                    Contrat de service récurrent (mensuel ou annuel)
                  </div>
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      Essai gratuit :
                    </strong>{" "}
                    Période de 14 jours d&apos;évaluation du service
                  </div>
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      Junior-Entreprise (JE) :
                    </strong>{" "}
                    Association étudiante à vocation économique
                  </div>
                </div>
                </Card>
              </section>

              <section id="commande" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6 text-green-600" />
                  3. Commande et acceptation
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <p>
                    La commande s&apos;effectue en ligne sur le site andoxa.fr.
                    Le Client choisit son plan d&apos;abonnement et procède au
                    paiement via Stripe.
                  </p>
                  <p>
                    <strong>Processus de commande :</strong>
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Sélection du plan (Essential, Pro, ou Business)</li>
                    <li>Choix de la facturation (mensuelle ou annuelle)</li>
                    <li>Création du compte utilisateur</li>
                    <li>Paiement sécurisé via Stripe</li>
                    <li>Confirmation par email</li>
                    <li>Activation immédiate du service</li>
                  </ul>
                  <p>
                    La validation de la commande par le Client vaut acceptation
                    sans réserve des présentes conditions générales de vente.
                  </p>
                </div>
                </Card>
              </section>

              <section id="tarifs" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-green-600" />
                  4. Tarifs et modalités de paiement
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>Tarifs en vigueur (TTC) :</strong>
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          Plan Essential
                        </h4>
                        <p className="text-2xl font-bold text-green-600">
                          29€/mois
                        </p>
                        <p className="text-sm">279€/an (soit 23€/mois)</p>
                        <p className="text-xs text-slate-500 mt-1">14 jours d&apos;essai gratuit</p>
                      </div>
                      <div className="text-center">
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          Plan Pro
                        </h4>
                        <p className="text-2xl font-bold text-blue-600">
                          99€/mois
                        </p>
                        <p className="text-sm">950€/an (soit 79€/mois)</p>
                      </div>
                      <div className="text-center">
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          Plan Business
                        </h4>
                        <p className="text-2xl font-bold text-purple-600">
                          179€/mois
                        </p>
                        <p className="text-sm">1718€/an (soit 143€/mois)</p>
                      </div>
                    </div>
                  </div>
                  <p>
                    <strong>Modalités de paiement :</strong>
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      Paiement par carte bancaire (Visa, Mastercard, American
                      Express)
                    </li>
                    <li>Paiement sécurisé via Stripe (PCI-DSS)</li>
                    <li>Facturation à l&apos;avance selon le cycle choisi</li>
                    <li>Aucun frais de dossier ou d&apos;activation</li>
                    <li>Prix exprimés en euros TTC (TVA 20% incluse)</li>
                  </ul>
                </div>
                </Card>
              </section>

              <section id="facturation" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-green-600" />
                  5. Facturation
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>Émission des factures :</strong> Automatique par
                    email au format PDF
                  </p>
                  <p>
                    <strong>Contenu de la facture :</strong>
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Numéro de facture unique</li>
                    <li>Date d&apos;émission</li>
                    <li>Période facturée</li>
                    <li>Détail des services</li>
                    <li>Montant HT et TTC</li>
                    <li>TVA (20%)</li>
                    <li>Informations client</li>
                  </ul>
                  <p>
                    <strong>Conservation :</strong> Les factures sont conservées
                    10 ans conformément à la réglementation française.
                  </p>
                  <p>
                    <strong>Accès :</strong> Le Client peut télécharger ses
                    factures depuis son tableau de bord.
                  </p>
                </div>
                </Card>
              </section>

              <section id="livraison" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Truck className="h-6 w-6 text-green-600" />
                  6. Livraison et mise à disposition
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>Activation du service :</strong> Immédiate après
                    validation du paiement
                  </p>
                  <p>
                    <strong>Accès :</strong> Via navigateur web à l&apos;adresse
                    app.andoxa.fr
                  </p>
                  <p>
                    <strong>Disponibilité :</strong> 99.9% du temps (hors
                    maintenances planifiées)
                  </p>
                  <p>
                    <strong>Maintenances :</strong> Préavis de 48h minimum pour
                    les maintenances planifiées
                  </p>
                  <p>
                    <strong>Mises à jour :</strong> Automatiques et gratuites
                    pour tous les clients
                  </p>
                  <p>
                    <strong>Support technique :</strong> Disponible via email et
                    centre d&apos;aide en ligne
                  </p>
                </div>
                </Card>
              </section>

              <section id="garanties" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Shield className="h-6 w-6 text-green-600" />
                  7. Garanties
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>Garantie de conformité :</strong> Le service est
                    conforme à sa description sur le site web
                  </p>
                  <p>
                    <strong>Garantie de disponibilité :</strong> Engagement de
                    99.9% de disponibilité mensuelle
                  </p>
                  <p>
                    <strong>Sauvegarde des données :</strong> Sauvegardes
                    quotidiennes et cryptées
                  </p>
                  <p>
                    <strong>Sécurité :</strong> Chiffrement TLS/SSL et
                    authentification sécurisée
                  </p>
                  <p>
                    <strong>Support :</strong> Support technique inclus selon le
                    plan choisi
                  </p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>Limitation :</strong> Andoxa ne garantit pas un
                      fonctionnement ininterrompu et ne peut être tenu
                      responsable des interruptions dues à des cas de force
                      majeure.
                    </p>
                  </div>
                </div>
                </Card>
              </section>

              <section id="retractation" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <RotateCcw className="h-6 w-6 text-green-600" />
                  8. Droit de rétractation
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p>
                      <strong>Exception légale :</strong> Conformément à
                      l&apos;article L. 221-28 du Code de la consommation, le droit
                      de rétractation ne s&apos;applique pas aux contrats de
                      fourniture de services pleinement exécutés avant la fin du
                      délai de rétractation et dont l&apos;exécution a commencé après
                      accord préalable exprès du consommateur et renoncement
                      exprès à son droit de rétractation.
                    </p>
                  </div>
                  <p>
                    Le service Andoxa étant un service numérique, son activation
                    immédiate après paiement vaut renoncement au droit de
                    rétractation.
                  </p>
                  <p>
                    <strong>Alternative :</strong> Le Client bénéficie d&apos;un
                    essai gratuit de 14 jours pour évaluer le service avant tout
                    engagement financier.
                  </p>
                </div>
                </Card>
              </section>

              <section id="resiliation" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <X className="h-6 w-6 text-green-600" />
                  9. Résiliation et remboursements
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>Résiliation par le Client :</strong>
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Possible à tout moment depuis le tableau de bord</li>
                    <li>Prise d&apos;effet immédiate</li>
                    <li>Aucun frais de résiliation</li>
                    <li>Export des données avant suppression</li>
                  </ul>

                  <p>
                    <strong>Résiliation par Andoxa :</strong>
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>En cas de non-paiement après 7 jours de relance</li>
                    <li>En cas de violation des CGU/CGV</li>
                    <li>Préavis de 30 jours pour les autres cas</li>
                  </ul>

                  <p>
                    <strong>Politique de remboursement :</strong>
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Aucun remboursement pour la période déjà facturée</li>
                    <li>
                      Exception : interruption prolongée du service (plus de
                      24h)
                    </li>
                    <li>
                      Remboursement proportionnel au temps d&apos;interruption
                    </li>
                    <li>
                      Modalités de remboursement selon les mêmes moyens de
                      paiement
                    </li>
                  </ul>
                </div>
                </Card>
              </section>

              <section id="litiges" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Gavel className="h-6 w-6 text-green-600" />
                  10. Litiges et médiation
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <div className="space-y-4 text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>Résolution amiable :</strong> En cas de litige, les
                    parties s&apos;engagent à rechercher une solution amiable.
                  </p>
                  <p>
                    <strong>Médiation de la consommation :</strong> Le Client
                    peut recourir à la médiation de la consommation selon les
                    modalités prévues aux articles L. 616-1 et suivants du Code
                    de la consommation.
                  </p>
                  <p>
                    <strong>Compétence juridictionnelle :</strong> À défaut de
                    résolution amiable, tout litige relatif à l&apos;exécution
                    des présentes conditions sera soumis aux tribunaux compétents de Paris, France.
                  </p>
                </div>
                </Card>
              </section>

              <section id="contact" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Mail className="h-6 w-6 text-green-600" />
                  11. Contact
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  Pour toute question concernant ces conditions de vente :
                </p>
                <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Service client :
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
