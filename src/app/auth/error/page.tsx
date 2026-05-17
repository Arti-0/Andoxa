import Link from "next/link";
import { AuthShell } from "@/components/marketing/auth-shell";
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

const INVALID_LINK_HINTS = [
  "token",
  "lien",
  "invalid",
  "expired",
  "code",
  "challenge",
  "verifier",
  "does not match",
];

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const raw = params.error || params.reason || "Une erreur inattendue s'est produite";
  const error = safeDecodeURIComponent(raw);
  const email = params.email;

  const lower = error.toLowerCase();
  const isInvalidLink = INVALID_LINK_HINTS.some((needle) => lower.includes(needle));

  return (
    <AuthShell
      tone="message"
      title="Erreur d'authentification"
      subtitle="Il y a eu un problème avec votre authentification"
    >
      <Card className="border-[var(--border)] shadow-[0_4px_18px_-12px_rgba(0,0,0,0.08)]">
        <CardContent className="p-7 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
          </div>

          {isInvalidLink ? (
            <>
              <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="mb-2 font-semibold">Conseils&nbsp;:</p>
                  <ul className="ml-2 list-inside list-disc space-y-1 text-left">
                    <li>Vérifiez que vous avez cliqué sur le bon lien dans votre email</li>
                    <li>Le lien peut avoir expiré (valide 60 minutes)</li>
                    <li>
                      Assurez-vous de copier le lien complet si vous l&apos;avez collé
                      manuellement
                    </li>
                    <li>Vous pouvez demander un nouvel email de confirmation ci-dessous</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <ResendConfirmationForm email={email} />
            </>
          ) : null}

          <div className="mt-2 space-y-2">
            {isInvalidLink ? (
              <>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/login">Essayer de se connecter</Link>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Si votre compte est déjà confirmé, vous pouvez vous connecter directement.
                </p>
              </>
            ) : (
              <Button asChild className="w-full">
                <Link href="/auth/login">Retour à la connexion</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
