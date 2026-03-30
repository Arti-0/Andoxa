import { UnifiedHeader } from "@/components/v3/homepage/UnifiedHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import Balancer from "react-wrap-balancer";
import { Building2, UserRoundX } from "lucide-react";

type Search = { reason?: string | string[] };

function normalizeReason(raw: string | string[] | undefined): "organization" | "account" {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "organization" || v === "org") return "organization";
  return "account";
}

export default async function InactiveAccountPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const reason = normalizeReason(params.reason);

  const copy =
    reason === "organization"
      ? {
          title: "Organisation supprimée",
          subtitle:
            "L’espace de travail auquel vous étiez rattaché n’est plus disponible.",
          body: (
            <>
              Cette organisation a été supprimée ou vous n’y avez plus accès.
              Vous pouvez en créer une nouvelle pour continuer à utiliser Andoxa.
            </>
          ),
          icon: Building2,
          iconWrap: "bg-amber-100 dark:bg-amber-900/30",
          iconClass: "text-amber-700 dark:text-amber-400",
          primary: { href: "/onboarding/setup", label: "Créer une organisation" },
          secondary: { href: "/auth/login", label: "Retour à la connexion" },
        }
      : {
          title: "Compte supprimé",
          subtitle: "Votre compte Andoxa a bien été supprimé.",
          body: (
            <>
              Vous n’avez plus accès aux pages réservées aux utilisateurs
              connectés. Vous pouvez créer un nouveau compte à tout moment en
              vous inscrivant à nouveau.
            </>
          ),
          icon: UserRoundX,
          iconWrap: "bg-emerald-100 dark:bg-emerald-900/30",
          iconClass: "text-emerald-700 dark:text-emerald-400",
          primary: { href: "/auth/login", label: "Créer un compte" },
          secondary: { href: "/", label: "Retour à l’accueil" },
        };

  const Icon = copy.icon;

  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      <UnifiedHeader showMobileMenu={false} enableScrollEffect={false} />

      <div className="relative w-full min-h-screen overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="auth-background-shape auth-shape-1" />
          <div className="auth-background-shape auth-shape-2" />
          <div className="auth-background-shape auth-shape-3" />
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center p-6 pt-32">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                <Balancer>{copy.title}</Balancer>
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                <Balancer>{copy.subtitle}</Balancer>
              </p>
            </div>

            <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
              <CardContent className="p-8 sm:p-10">
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 shrink-0 rounded-full p-2.5 ${copy.iconWrap}`}
                  >
                    <Icon className={`h-6 w-6 ${copy.iconClass}`} />
                  </div>
                  <div className="space-y-5 min-w-0">
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {copy.body}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button asChild className="w-full sm:w-auto">
                        <Link href={copy.primary.href}>{copy.primary.label}</Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href={copy.secondary.href}>
                          {copy.secondary.label}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
