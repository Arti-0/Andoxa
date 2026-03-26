import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AndoxaHeader from "@/components/content/AndoxaHeader";
import AndoxaFooter from "@/components/content/AndoxaFooter";
import { cn } from "../../../../src/lib/utils";
import Balancer from "react-wrap-balancer";
import {
  RiArrowRightLine,
  RiFocus3Line,
  RiLightbulbLine,
  RiHeartLine,
} from "@remixicon/react";

const values = [
  {
    icon: RiFocus3Line,
    title: "Mission",
    description:
      "Transformer la gestion des Junior-Entreprises en processus fluides et intelligents.",
  },
  {
    icon: RiLightbulbLine,
    title: "Vision",
    description:
      "Une génération de Junior-Entrepreneurs pilotant leur structure avec l'agilité d'une startup tech.",
  },
  {
    icon: RiHeartLine,
    title: "Valeurs",
    description:
      "Collaboration, innovation et professionnalisation au service de l'excellence.",
  },
];

export default function About() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <AndoxaHeader />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="text-center">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">
            <Balancer>
              L&apos;outil qu&apos;on aurait rêvé d&apos;avoir en mandat
            </Balancer>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            <Balancer>
              Piloter une Junior-Entreprise change,{" "}
              <strong>Andoxa en est le moteur.</strong>
              <br />
              Les données deviennent un levier, pas un poids.
            </Balancer>
          </p>
        </section>

        {/* Values Section */}
        <section className="mt-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              <Balancer>Notre vision</Balancer>
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              <Balancer>
                Transformer l&apos;expérience des Junior-Entrepreneurs
              </Balancer>
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <value.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
                  {value.title}
                </h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Story Section */}
        <section className="mt-24">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl bg-linear-to-br from-slate-50 to-slate-100 p-8 dark:from-slate-800 dark:to-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Notre histoire
              </h2>
              <div className="space-y-6 text-slate-600 dark:text-slate-300">
                <p className="text-lg leading-8">
                  Nous imaginons un monde où la gestion d&apos;une
                  Junior-Entreprise ne repose plus sur des fichiers dispersés et
                  des tâches manuelles, mais sur une plateforme fluide,
                  intelligente et collaborative. Chez Andoxa, nous voulons
                  transformer les processus internes des JE en leviers de
                  performance et de professionnalisation.
                </p>
                <p className="text-lg leading-8">
                  En intégrant l&apos;automatisation, la centralisation et
                  l&apos;intelligence dans chaque interaction, nous aidons les
                  équipes à se concentrer sur ce qui compte vraiment :
                  développer, closer, transmettre.
                </p>
                <p className="text-lg leading-8">
                  Nous croyons en une génération de Junior-Entrepreneurs
                  capables de piloter leur structure avec la même agilité
                  qu&apos;une startup tech. Notre ambition : offrir à chaque JE
                  les outils pour structurer leur croissance, simplifier leur
                  quotidien, et libérer leur potentiel.
                </p>
                <div className="mt-8 text-center">
                  <p
                    className={cn(
                      "w-fit mx-auto rotate-3 font-handwriting text-2xl text-indigo-600 dark:text-indigo-400"
                    )}
                  >
                    – Sebastian et Andreas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            <Balancer>Prêt à découvrir Andoxa ?</Balancer>
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            <Balancer>
              Rejoignez les Junior-Entreprises qui transforment leur gestion
              commerciale
            </Balancer>
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base font-semibold dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
            >
              <a href="/auth/login" className="flex items-center gap-2">
                Essai de 14 jours
                <RiArrowRightLine className="h-5 w-5" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base font-semibold border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors dark:border-blue-600 dark:text-white dark:hover:bg-blue-600 dark:hover:text-white"
            >
              <a
                href="https://calendly.com/andoxa/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                Planifier une démo
              </a>
            </Button>
          </div>
        </section>
      </div>

      <div className="pb-12"></div>
      <AndoxaFooter />
    </main>
  );
}