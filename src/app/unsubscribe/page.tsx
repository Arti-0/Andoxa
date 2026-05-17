import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail } from "lucide-react";

/**
 * Legacy marketing-email unsubscribe URLs pointed at `/unsubscribe`.
 * Phase 8: outbound product campaigns are LinkedIn / WhatsApp; the old API
 * route was removed. This page replaces the broken flow with honest guidance.
 */
export default function UnsubscribePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Préférences email</CardTitle>
          <CardDescription className="text-pretty">
            Les liens de désinscription des anciennes campagnes email ne sont plus
            pris en charge. Andoxa n&apos;utilise plus ce mécanisme pour ses
            campagnes sortantes (LinkedIn et WhatsApp).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
          <p>
            Pour une demande relative à vos données personnelles ou pour arrêter
            des emails transactionnels (invitations calendrier, etc.), écrivez-nous à{" "}
            <a
              href="mailto:support@andoxa.fr"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              support@andoxa.fr
            </a>
            .
          </p>
          <p>
            <Link
              href="/privacy"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Politique de confidentialité
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
