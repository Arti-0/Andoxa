"use client";

import { Badge } from "@/components/ui/badge";
import AndoxaHeader from "@/components/content/AndoxaHeader";
import AndoxaFooter from "@/components/content/AndoxaFooter";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { Shield, Lock, Server, FileCheck, Eye, Activity, Users, Database } from "lucide-react";

export default function SecurityWhitePaper() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    { id: "intro", title: "Introduction", icon: Shield },
    { id: "infrastructure", title: "Infrastructure Cloud", icon: Server },
    { id: "data-protection", title: "Protection des données", icon: Lock },
    { id: "authentication", title: "Authentification & Contrôle", icon: Users },
    { id: "application-security", title: "Sécurité Applicative", icon: Activity },
    { id: "operational", title: "Sécurité Opérationnelle", icon: Eye },
    { id: "compliance", title: "Conformité & RGPD", icon: FileCheck },
    { id: "backup", title: "Sauvegardes & DRP", icon: Database },
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
                <Shield className="h-4 w-4" />
                Livre Blanc Sécurité
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
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 mb-4">
                  Besoin d'un audit ou d'informations spécifiques ?
                </p>
                <Link
                  href="/contact"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Contacter l'équipe sécurité →
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Hero */}
            <section className="mb-16">
              <Badge className="mb-6 bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                Security White Paper
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white mb-6">
                <Balancer>Architecture de Sécurité & Protection des Données</Balancer>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Ce document détaille les mesures techniques et organisationnelles mises en œuvre par Andoxa
                pour garantir la confidentialité, l'intégrité et la disponibilité de vos données.
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
                <span>Dernière mise à jour : Décembre 2025</span>
                <span>•</span>
                <span>Version 1.1</span>
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
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    La sécurité n'est pas une fonctionnalité optionnelle chez Andoxa, c'est le fondement de notre architecture.
                    En tant que plateforme CRM gérant des données sensibles de prospects et clients, nous appliquons une approche
                    de « Security by Design » à chaque étape de notre cycle de développement.
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Notre architecture repose sur des services cloud de classe mondiale (AWS via Supabase, Vercel) et suit les
                    recommandations de l'OWASP et les standards SOC 2.
                  </p>
                </Card>
              </section>

              {/* Infrastructure */}
              <section id="infrastructure" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Server className="h-6 w-6 text-blue-600" />
                  2. Infrastructure Cloud
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Hébergement & Fournisseurs</h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                      Andoxa ne gère pas ses propres serveurs physiques. Nous nous appuyons sur une infrastructure Serverless hautement sécurisée :
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <li className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                        <strong className="block text-slate-900 dark:text-white mb-1">Base de données & Auth</strong>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Supabase (AWS Europe - Frankfurt)</span>
                      </li>
                      <li className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                        <strong className="block text-slate-900 dark:text-white mb-1">Frontend & API Edge</strong>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Vercel (Global Edge Network)</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Sécurité physique</h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      Nos fournisseurs (AWS) maintiennent des certifications ISO 27001, SOC 1, SOC 2, et PCI-DSS Niveau 1.
                      L'accès physique aux datacenters est strictement contrôlé (biométrie, surveillance 24/7).
                    </p>
                  </div>
                </Card>
              </section>

              {/* Data Protection */}
              <section id="data-protection" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Lock className="h-6 w-6 text-blue-600" />
                  3. Protection des données
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Chiffrement</h3>
                    <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                      <li className="flex items-start gap-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        <div>
                          <strong>En transit :</strong> Toutes les communications sont chiffrées via TLS 1.3 (HTTPS).
                          L'utilisation de HSTS (HTTP Strict Transport Security) est forcée.
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        <div>
                          <strong>Au repos :</strong> Les données en base (PostgreSQL) sont chiffrées avec l'algorithme AES-256.
                          Les clés de chiffrement sont gérées via AWS KMS.
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Isolation des données</h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      Andoxa utilise une architecture multi-tenant avec isolation logique stricte.
                      Chaque requête en base de données inclut obligatoirement l'identifiant du tenant (Locataire)
                      via les politiques RLS (Row Level Security) de PostgreSQL. Il est mathématiquement impossible
                      pour un utilisateur d'accéder aux données d'une autre organisation sans les droits appropriés.
                    </p>
                  </div>
                </Card>
              </section>

              {/* Authentication */}
              <section id="authentication" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 text-blue-600" />
                  4. Authentification & Contrôle
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Authentification</h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                      Nous utilisons Supabase Auth qui implémente les standards sécurisés :
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                      <li>JSON Web Tokens (JWT) pour la gestion des sessions.</li>
                      <li>Mots de passe hashés (Argon2id).</li>
                      <li>Protection contre les attaques par force brute.</li>
                      <li>Support OAuth (Google, LinkedIn).</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Contrôle d'accès (RBAC)</h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      Les permissions sont gérées finement :
                      <br />
                      <strong>Admin :</strong> Accès complet à l'organisation.
                      <br />
                      <strong>Membre :</strong> Accès opérationnel (lecture/écriture sur les prospects).
                      <br />
                      <strong>Observateur :</strong> Accès en lecture seule (si applicable).
                    </p>
                  </div>
                </Card>
              </section>

              {/* Application Security */}
              <section id="application-security" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Activity className="h-6 w-6 text-blue-600" />
                  5. Sécurité Applicative
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Sanitization & Validation</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Toutes les entrées utilisateur sont validées strictement via Zod (schémas de données)
                        avant tout traitement. Cela protège contre les injections malveillantes.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Protection SQL Injection</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        L'utilisation exclusive de requêtes paramétrées et de l'ORM Supabase élimine
                        les risques d'injection SQL classiques.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">XSS & CSRF</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        React échappe automatiquement le contenu rendu pour prévenir les failles XSS.
                        Les protections CSRF sont intégrées au framework Next.js et aux cookies SameSite.
                        Le contenu HTML est également sanitized via DOMPurify avant affichage.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Rate Limiting</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Toutes nos routes API sont protégées par un système de rate limiting basé sur un algorithme
                        de fenêtre glissante (sliding window) avec Redis. Les limites varient selon le type de route :
                        routes publiques (20 req/min), authentifiées (100 req/min), intensives (10 req/min), admin (30 req/min).
                        Les violations sont loggées et les réponses incluent les headers RFC 6585 (X-RateLimit-*, Retry-After).
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Dépendances</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Scan automatique des vulnérabilités (CVE) sur nos dépendances npm via les outils d'audit GitHub et Vercel.
                      </p>
                    </div>
                  </div>
                </Card>
              </section>

              {/* Operational */}
              <section id="operational" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Eye className="h-6 w-6 text-blue-600" />
                  6. Sécurité Opérationnelle
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                  <ul className="space-y-4 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-blue-600">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <strong>Accès développeurs restreint :</strong> L'accès aux données de production est strictement limité au personnel autorisé et nécessite une authentification forte (2FA).
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-blue-600">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <strong>Logs d'audit :</strong> Les actions critiques (suppression de données, export) sont journalisées pour traçabilité.
                      </div>
                    </li>
                  </ul>
                </Card>
              </section>

               {/* Compliance */}
               <section id="compliance" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <FileCheck className="h-6 w-6 text-blue-600" />
                  7. Conformité & RGPD
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    Andoxa est conçu pour faciliter votre conformité RGPD :
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                      <strong className="block text-slate-900 dark:text-white">Droit à l'oubli</strong>
                      <span className="text-xs text-slate-500">Suppression définitive possible</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                      <strong className="block text-slate-900 dark:text-white">Portabilité</strong>
                      <span className="text-xs text-slate-500">Export des données</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                      <strong className="block text-slate-900 dark:text-white">Minimisation</strong>
                      <span className="text-xs text-slate-500">Collecte pertinente uniquement</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 italic">
                    Nos serveurs sont situés dans l'Union Européenne (Francfort, Allemagne) pour garantir la souveraineté des données.
                  </p>
                </Card>
              </section>

              {/* Backup */}
              <section id="backup" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Database className="h-6 w-6 text-blue-600" />
                  8. Sauvegardes & Continuité
                </h2>
                <Card className="p-8 border-slate-200 dark:border-slate-700">
                  <div className="space-y-4">
                    <div>
                      <strong className="text-slate-900 dark:text-white">Point-in-Time Recovery (PITR)</strong>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">
                        Nous maintenons des sauvegardes continues permettant de restaurer l'état de la base de données
                        à n'importe quelle seconde des 7 derniers jours.
                      </p>
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-white">Sauvegardes quotidiennes</strong>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">
                        Des snapshots complets sont effectués quotidiennement et conservés de manière sécurisée sur un stockage redondant (S3).
                      </p>
                    </div>
                  </div>
                </Card>
              </section>

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
      </div>
      <AndoxaFooter />
    </main>
  );
}

