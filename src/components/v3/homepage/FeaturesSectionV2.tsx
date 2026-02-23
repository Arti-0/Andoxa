"use client";

import {
  RiUserLine,
  RiMailLine,
  RiBarChartLine,
  RiTeamLine,
  RiShieldCheckLine,
  RiDatabaseLine,
  RiNotificationLine,
  RiStarLine,
  RiMailCheckLine,
  RiQuestionLine,
  RiExternalLinkLine,
} from "@remixicon/react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { motion } from "framer-motion";

const features = [
  {
    name: "Gestion des Prospects",
    description:
      "Centralisez tous vos prospects en un seul endroit. Suivez leurs interactions, notes et statuts en temps réel.",
    icon: RiUserLine,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    href: undefined,
  },
  {
    name: "Campagnes Emails",
    description:
      "Créez et automatisez vos campagnes marketing. Personnalisez vos messages et suivez les performances.",
    icon: RiMailLine,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    href: undefined,
  },
  {
    name: "Scoring Intelligent",
    description:
      "Identifiez vos prospects les plus prometteurs grâce à l'IA. Concentrez vos efforts là où ils comptent le plus.",
    icon: RiStarLine,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    href: undefined,
  },
  {
    name: "Enrichissement",
    description:
      "Enrichissez vos prospects à la demande et obtenez leurs infos clés et emails vérifiés.",
    icon: RiMailCheckLine,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
    href: undefined,
  },
  {
    name: "Équipe Collaborative",
    description:
      "Travaillez en équipe sur vos projets. Partagez les prospects et collaborez efficacement.",
    icon: RiTeamLine,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/20",
    href: undefined,
  },
  {
    name: "Analytics Avancées",
    description:
      "Tableaux de bord personnalisables avec KPIs en temps réel. Mesurez l'impact de vos actions.",
    icon: RiBarChartLine,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    href: undefined,
  },
  {
    name: "Sécurité Renforcée",
    description:
      "Vos données sont protégées avec un chiffrement de niveau entreprise et des sauvegardes automatiques.",
    icon: RiShieldCheckLine,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    href: undefined,
  },
  {
    name: "Base de Données Unifiée",
    description:
      "Toutes vos données centralisées et synchronisées. Plus de doublons, plus de perte d'information.",
    icon: RiDatabaseLine,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/20",
    href: undefined,
  },
  {
    name: "Notifications Intelligentes",
    description:
      "Recevez des alertes personnalisées pour ne jamais rater une opportunité importante.",
    icon: RiNotificationLine,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    href: undefined,
  },
  {
    name: "Centre d'aide",
    description:
      "Documentation complète, guides de démarrage et support pour maîtriser toutes les fonctionnalités.",
    icon: RiQuestionLine,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    href: "/help",
    isCta: true,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export function FeaturesSectionV2() {
  return (
    <section className="relative py-12 sm:py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-2 md:px-4 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-black dark:text-white px-4">
            <Balancer>Tout ce dont vous avez besoin pour réussir</Balancer>
          </h2>
          <p className="mt-4 sm:mt-6 text-base leading-7 text-slate-800 dark:text-slate-200 px-4">
            <Balancer>
              Andoxa combine tous les outils essentiels d&apos;un CRM moderne
              dans une interface intuitive, conçue spécialement pour les
              Junior-Entreprises.
            </Balancer>
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none"
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16 items-stretch sm:[&>*:nth-last-child(1):nth-child(2n+1)]:col-span-2 sm:[&>*:nth-last-child(1):nth-child(2n+1)]:justify-self-center lg:[&>*:nth-last-child(1):nth-child(3n+1)]:col-start-2 lg:[&>*:nth-last-child(1):nth-child(3n+1)]:col-span-1 lg:[&>*:nth-last-child(1):nth-child(3n+1)]:justify-self-center">
            {features.map((feature, index) => {
              const content = (
                <div className="flex flex-col h-full p-6">
                  <div className="flex items-center justify-center sm:justify-start gap-x-3 text-lg font-semibold leading-7 text-black dark:text-white mb-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${feature.bgColor} transition-transform hover:scale-110`}
                    >
                      <feature.icon
                        className={`h-6 w-6 ${feature.color}`}
                        aria-hidden="true"
                      />
                    </div>
                    <Balancer>{feature.name}</Balancer>
                  </div>
                  <div className="flex flex-auto flex-col text-base leading-7 text-slate-900 dark:text-slate-100">
                    <p className="flex-auto text-center sm:text-left">
                      <Balancer>{feature.description}</Balancer>
                    </p>
                  </div>
                </div>
              );

              return feature.href ? (
                <motion.div key={feature.name} variants={itemVariants as any} className="h-full">
                  <Link
                    href={feature.href}
                    target={feature.isCta ? "_blank" : "_self"}
                    className={`group flex flex-col w-full max-w-sm mx-auto h-full rounded-2xl backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-300 ${
                      feature.isCta
                        ? "bg-linear-to-br from-orange-400 to-orange-500 hover:scale-105 hover:shadow-2xl relative text-white"
                        : "bg-white/80 dark:bg-slate-800/80"
                    }`}
                  >
                    {feature.isCta && (
                      <div className="absolute top-3 right-3 z-10">
                        <RiExternalLinkLine className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
                      </div>
                    )}
                    {feature.isCta ? (
                      <div className="flex flex-col h-full p-6">
                        <div className="flex items-center justify-center sm:justify-start gap-x-3 text-base font-semibold leading-7 text-white mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0 bg-white/20 group-hover:bg-white/30 transition-colors">
                            <feature.icon
                              className="h-6 w-6 text-white"
                              aria-hidden="true"
                            />
                          </div>
                          <Balancer>{feature.name}</Balancer>
                        </div>
                        <div className="flex flex-auto flex-col text-sm sm:text-base leading-6 sm:leading-7 text-orange-50">
                          <p className="flex-auto text-center sm:text-left">
                            <Balancer>{feature.description}</Balancer>
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-center sm:justify-start">
                          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white group-hover:bg-white/30 transition-colors">
                            Accéder au centre d&apos;aide
                          </span>
                        </div>
                      </div>
                    ) : (
                      content
                    )}
                  </Link>
                </motion.div>
              ) : (
                <motion.div key={feature.name} variants={itemVariants as any} className="h-full">
                  <div className="flex flex-col w-full max-w-sm mx-auto h-full rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-300 group">
                    {content}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
