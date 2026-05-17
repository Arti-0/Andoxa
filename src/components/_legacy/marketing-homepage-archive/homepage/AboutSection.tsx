"use client";

import { motion } from "framer-motion";
import {
  RiFocus3Line,
  RiLightbulbLine,
  RiHeartLine,
} from "@remixicon/react";
import Balancer from "react-wrap-balancer";
import { cn } from "@/lib/utils";

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

export function AboutSection() {
  return (
    <section id="a-propos" className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-2 md:px-4 lg:px-8">
        {/* Hero */}
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white px-4">
            <Balancer>L&apos;outil qu&apos;on aurait rêvé d&apos;avoir en mandat</Balancer>
          </h2>
          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base leading-7 text-slate-800 dark:text-slate-200 px-4">
            <Balancer>
              Piloter une Junior-Entreprise change,{" "}
              <strong>Andoxa en est le moteur.</strong>
              <br />
              Les données deviennent un levier, pas un poids.
            </Balancer>
          </p>
        </div>

        {/* Values */}
        <div className="mt-12 sm:mt-16">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white px-4">
              <Balancer>Notre vision</Balancer>
            </h3>
            <p className="mt-3 sm:mt-4 text-base text-slate-800 dark:text-slate-200 px-4">
              <Balancer>
                Transformer l&apos;expérience des Junior-Entrepreneurs
              </Balancer>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-3 px-4 sm:px-0">
            {values.map((value, idx) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative"
              >
                {/* Glassmorphism card */}
                <div className="relative overflow-hidden rounded-2xl bg-white/10 dark:bg-black/20 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-center h-full">

                  {/* Content */}
                  <div className="relative z-10">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-sm border border-white/30 dark:border-white/20 group-hover:scale-110 transition-transform duration-300">
                      <value.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="mt-6 text-lg font-semibold text-slate-900 dark:text-white">
                      {value.title}
                    </h4>
                    <p className="mt-3 text-base text-slate-900 dark:text-slate-100 leading-relaxed">
                      {value.description}
                    </p>
                  </div>

                  {/* Shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-linear-to-r from-transparent via-white/20 to-transparent" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Story */}
        <div className="mt-12 sm:mt-16 md:mt-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className={cn(
                "relative overflow-hidden rounded-2xl",
                "bg-white/10 dark:bg-black/20 backdrop-blur-xl shadow-xl p-8 md:p-12"
              )}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-br from-orange-400/5 via-transparent to-blue-400/5" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  Notre histoire
                </h3>
                <div className="space-y-6 text-slate-900 dark:text-slate-100">
                <p className="text-base leading-7">
                  Nous imaginons un monde où la gestion d&apos;une
                  Junior-Entreprise ne repose plus sur des fichiers dispersés et
                  des tâches manuelles, mais sur une plateforme fluide,
                  intelligente et collaborative. Chez Andoxa, nous voulons
                  transformer les processus internes des JE en leviers de
                  performance et de professionnalisation.
                </p>
                <p className="text-base leading-7">
                  En intégrant l&apos;automatisation, la centralisation et
                  l&apos;intelligence dans chaque interaction, nous aidons les
                  équipes à se concentrer sur ce qui compte vraiment :
                  développer, closer, transmettre.
                </p>
                <p className="text-base leading-7">
                  Nous croyons en une génération de Junior-Entrepreneurs
                  capables de piloter leur structure avec la même agilité
                  qu&apos;une startup tech. Notre ambition : offrir à chaque JE
                  les outils pour structurer leur croissance, simplifier leur
                  quotidien, et libérer leur potentiel.
                </p>
                <div className="mt-8 text-center">
                  <p className="w-fit mx-auto rotate-3 font-handwriting text-2xl text-indigo-600 dark:text-indigo-400">
                    – Sebastian et Andreas
                  </p>
                </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
