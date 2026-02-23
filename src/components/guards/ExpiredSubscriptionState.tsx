import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

/**
 * ExpiredSubscriptionState - Displayed when subscription is expired or suspended
 *
 * User can still access settings to update billing, but cannot use the app.
 */
export function ExpiredSubscriptionState() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Abonnement expiré</CardTitle>
          </div>
          <CardDescription>
            Votre abonnement a expiré ou a été suspendu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pour continuer à utiliser l'application, veuillez renouveler votre abonnement.
          </p>
          <Button asChild className="w-full">
            <Link href="/settings">
              Gérer l'abonnement
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
