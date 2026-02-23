import { ArrowRight, Shield, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import Balancer from "react-wrap-balancer";

export default function AndoxaHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%233b82f6%22%20fill-opacity%3D%220.08%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <Badge
            variant="secondary"
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
          >
            <Shield className="h-6 w-6" />
            Plateforme CRM pour Junior-Entreprises
          </Badge>

          {/* Main Heading */}
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-slate-800 sm:text-6xl lg:text-7xl dark:text-white">
            <Balancer>
              Gérez vos prospects comme une{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                équipe pro
              </span>
            </Balancer>
          </h1>

          {/* Subheading */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
            <Balancer>
              Andoxa est la plateforme CRM moderne conçue spécialement pour les
              Junior-Entreprises. Centralisez vos prospects, automatisez vos
              campagnes et boostez vos ventes.
            </Balancer>
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base font-semibold dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
            >
              <Link href="/auth/sign-up" className="flex items-center gap-2">
                Essai de 14 jours
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base font-semibold border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors dark:border-blue-600 dark:text-white dark:hover:bg-blue-600 dark:hover:text-white"
            >
              <Link
                href="https://calendly.com/andoxa/30min"
                target="_blank"
                className="flex items-center gap-2"
              >
                Réserver une démo
                <Users className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                +30%
              </div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Gain de temps commercial
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                +40%
              </div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Taux de conversion des leads
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                100%
              </div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Sécurisé & hébergé en France
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Image */}
        <div className="mt-20">
          <div className="relative mx-auto max-w-6xl">
            <div className="rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <div className="rounded-xl overflow-hidden">
                <Image
                  src="/assets/images/Dashboard.png"
                  alt="Dashboard Andoxa - Tableau de bord KPI moderne avec analytics en temps réel"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
