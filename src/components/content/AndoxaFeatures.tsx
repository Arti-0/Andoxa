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

const features = [
  {
    name: "Gestion des Prospects",
    description:
      "Centralisez tous vos prospects en un seul endroit. Suivez leurs interactions, notes et statuts en temps réel.",
    icon: RiUserLine,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    href: undefined,
  },
  {
    name: "Campagnes Emails",
    description:
      "Créez et automatisez vos campagnes marketing. Personnalisez vos messages et suivez les performances.",
    icon: RiMailLine,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    href: undefined,
  },
  {
    name: "Scoring Intelligent",
    description:
      "Identifiez vos prospects les plus prometteurs grâce à l'IA. Concentrez vos efforts là où ils comptent le plus.",
    icon: RiStarLine,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    href: undefined,
  },
  {
    name: "Enrichissement",
    description:
      "Enrichissez vos prospects à la demande et obtenez leurs infos clés et emails vérifiés.",
    icon: RiMailCheckLine,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
    href: undefined,
  },
  {
    name: "Équipe Collaborative",
    description:
      "Travaillez en équipe sur vos projets. Partagez les prospects et collaborez efficacement.",
    icon: RiTeamLine,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/20",
    href: undefined,
  },
  {
    name: "Analytics Avancées",
    description:
      "Tableaux de bord personnalisables avec KPIs en temps réel. Mesurez l'impact de vos actions.",
    icon: RiBarChartLine,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    href: undefined,
  },
  {
    name: "Sécurité Renforcée",
    description:
      "Vos données sont protégées avec un chiffrement de niveau entreprise et des sauvegardes automatiques.",
    icon: RiShieldCheckLine,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    href: undefined,
  },
  {
    name: "Base de Données Unifiée",
    description:
      "Toutes vos données centralisées et synchronisées. Plus de doublons, plus de perte d'information.",
    icon: RiDatabaseLine,
    color: "text-pink-600",
    bgColor: "bg-pink-100 dark:bg-pink-900/20",
    href: undefined,
  },
  {
    name: "Notifications Intelligentes",
    description:
      "Recevez des alertes personnalisées pour ne jamais rater une opportunité importante.",
    icon: RiNotificationLine,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    href: undefined,
  },
  {
    name: "Centre d'aide",
    description:
      "Documentation complète, guides de démarrage et support pour maîtriser toutes les fonctionnalités.",
    icon: RiQuestionLine,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    href: "/help",
    isCta: true, // Mark this as a CTA for different styling
  },
];

export default function AndoxaFeatures() {
  return (
    <section className="py-24 sm:py-32 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl dark:text-white">
            Tout ce dont vous avez besoin pour réussir
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-700 dark:text-slate-300">
            Andoxa combine tous les outils essentiels d&apos;un CRM moderne dans
            une interface intuitive, conçue spécialement pour les
            Junior-Entreprises.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16 justify-items-center sm:[&>*:nth-last-child(1):nth-child(2n+1)]:col-span-2 sm:[&>*:nth-last-child(1):nth-child(2n+1)]:justify-self-center lg:[&>*:nth-last-child(1):nth-child(3n+1)]:col-start-2 lg:[&>*:nth-last-child(1):nth-child(3n+1)]:col-span-1 lg:[&>*:nth-last-child(1):nth-child(3n+1)]:justify-self-center">
            {features.map((feature) => {
              const content = (
                <div className="flex flex-col h-full p-6">
                  <div className="flex items-center justify-center sm:justify-start gap-x-3 text-base font-semibold leading-7 text-slate-800 dark:text-white mb-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${feature.bgColor}`}
                    >
                      <feature.icon
                        className={`h-6 w-6 ${feature.color}`}
                        aria-hidden="true"
                      />
                    </div>
                    <Balancer>{feature.name}</Balancer>
                  </div>
                  <div className="flex flex-auto flex-col text-sm sm:text-base leading-6 sm:leading-7 text-slate-700 dark:text-slate-300">
                    <p className="flex-auto text-center sm:text-left">
                      <Balancer>{feature.description}</Balancer>
                    </p>
                  </div>
                </div>
              );

              return feature.href ? (
                <Link
                  key={feature.name}
                  href={feature.href}
                  target={feature.isCta ? "_blank" : "_self"}
                  className={`flex flex-col w-full max-w-sm mx-auto rounded-lg backdrop-blur-sm border shadow-sm hover:shadow-md transition-all duration-200 ${
                    feature.isCta
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-500 dark:border-blue-400 hover:scale-105 hover:shadow-xl relative text-white"
                      : "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-700/50"
                  }`}
                >
                  {feature.isCta && (
                    <div className="absolute top-3 right-3 z-10">
                      <RiExternalLinkLine className="h-4 w-4 text-white" />
                    </div>
                  )}
                  {feature.isCta ? (
                    <div className="flex flex-col h-full p-6">
                      <div className="flex items-center justify-center sm:justify-start gap-x-3 text-base font-semibold leading-7 text-white mb-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 bg-white/20`}
                        >
                          <feature.icon
                            className={`h-6 w-6 text-white`}
                            aria-hidden="true"
                          />
                        </div>
                        <Balancer>{feature.name}</Balancer>
                      </div>
                      <div className="flex flex-auto flex-col text-sm sm:text-base leading-6 sm:leading-7 text-blue-100">
                        <p className="flex-auto text-center sm:text-left">
                          <Balancer>{feature.description}</Balancer>
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-center sm:justify-start">
                        <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                          Accéder au centre d&apos;aide
                        </span>
                      </div>
                    </div>
                  ) : (
                    content
                  )}
                </Link>
              ) : (
                <div
                  key={feature.name}
                  className="flex flex-col w-full max-w-sm mx-auto rounded-lg bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 shadow-sm hover:shadow-md transition-shadow"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
