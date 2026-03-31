import Link from "next/link";
import { AuthLayout } from "@/lib/auth/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResendConfirmationForm } from "@/lib/auth/components/resend-confirmation-form";

interface AuthErrorPageProps {
  searchParams: Promise<{
    error?: string;
    /** Alias historique / liens externes */
    reason?: string;
    email?: string;
  }>;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const params = await searchParams;
  const raw =
    params.error ||
    params.reason ||
    "Une erreur inattendue s'est produite";
  const error = safeDecodeURIComponent(raw);
  const email = params.email;

  // Déterminer si c'est un problème de lien invalide
  const isInvalidLink =
    error.toLowerCase().includes("token") ||
    error.toLowerCase().includes("lien") ||
    error.toLowerCase().includes("invalid") ||
    error.toLowerCase().includes("expired") ||
    error.toLowerCase().includes("code") ||
    error.toLowerCase().includes("challenge") ||
    error.toLowerCase().includes("verifier") ||
    error.toLowerCase().includes("does not match");

  return (
    <AuthLayout
      title="Erreur d'authentification"
      subtitle="Il y a eu un problème avec votre authentification"
      showBackToLogin={true}
    >
      <Card className="border-0 shadow-xl">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Erreur d&apos;authentification
            </h2>
            <p className="text-muted-foreground mb-4">{error}</p>
          </div>

          {isInvalidLink && (
            <>
              <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-2">💡 Conseils :</p>
                  <ul className="list-disc list-inside space-y-1 text-left ml-2">
                    <li>
                      Vérifiez que vous avez cliqué sur le bon lien dans votre
                      email
                    </li>
                    <li>Le lien peut avoir expiré (valide 60 minutes)</li>
                    <li>
                      Assurez-vous de copier le lien complet si vous l&apos;avez
                      collé manuellement
                    </li>
                    <li>
                      Vous pouvez demander un nouvel email de confirmation
                      ci-dessous
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              <ResendConfirmationForm email={email} />
            </>
          )}

          <div className="space-y-2">
            {isInvalidLink && (
              <>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/login">
                    Essayer de se connecter
                  </Link>
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Si votre compte est déjà confirmé, vous pouvez vous connecter directement.
                </p>
              </>
            )}
            {!isInvalidLink && (
              <Button asChild className="w-full">
                <Link href="/auth/login">Retour à la connexion</Link>
              </Button>
            )}
            {!isInvalidLink && (
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">Se connecter</Link>
            </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
