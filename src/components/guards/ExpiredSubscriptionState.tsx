import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

type ExpiredVariant = "default" | "trial_ended";

/**
 * ExpiredSubscriptionState - Displayed when subscription is expired or suspended
 *
 * User can still access settings to update billing, but cannot use the app.
 */
export function ExpiredSubscriptionState({
  variant = "default",
}: {
  variant?: ExpiredVariant;
}) {
  const isTrial = variant === "trial_ended";
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>
              {isTrial ? "Essai terminé" : "Abonnement expiré"}
            </CardTitle>
          </div>
          <CardDescription>
            {isTrial
              ? "Vos 14 jours d'essai sont terminés. Ajoutez un moyen de paiement valide pour continuer."
              : "Votre abonnement a expiré ou a été suspendu."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isTrial
              ? "Sans abonnement actif, l'accès aux outils Andoxa est désactivé."
              : "Pour continuer à utiliser l'application, renouvelez votre abonnement."}
          </p>
          <Button asChild className="w-full">
            <Link href="/settings">
              Gérer l&apos;abonnement
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/onboarding/plan">
              Voir les plans
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
