import Link from "next/link";
import { Building2, UserRoundX } from "lucide-react";
import { AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
          primary: { href: "/onboarding", label: "Créer une organisation" },
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
    <AuthShell tone="message" title={copy.title} subtitle={copy.subtitle}>
      <Card className="border-[var(--border)] shadow-[0_4px_18px_-12px_rgba(0,0,0,0.08)]">
        <CardContent className="p-7 sm:p-8">
          <div className="flex items-start gap-4">
            <div
              className={`mt-0.5 shrink-0 rounded-full p-2.5 ${copy.iconWrap}`}
              aria-hidden="true"
            >
              <Icon className={`h-6 w-6 ${copy.iconClass}`} />
            </div>
            <div className="min-w-0 space-y-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {copy.body}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button asChild className="w-full sm:w-auto">
                  <Link href={copy.primary.href}>{copy.primary.label}</Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href={copy.secondary.href}>{copy.secondary.label}</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
