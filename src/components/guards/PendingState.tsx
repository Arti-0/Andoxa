import { LoadingSpinner } from "@/components/loading-spinner";

/**
 * PendingState - Displayed when organization is in "pending" status
 *
 * This is a blocking state - user cannot proceed until organization is activated.
 * The organization status will be updated by Stripe webhook after payment.
 */
export function PendingState() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-6">
        <LoadingSpinner text="Activation en cours..." />
        <p className="mt-4 text-sm text-muted-foreground">
          Votre organisation est en cours d'activation. Cette opération peut prendre quelques instants.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Vous serez automatiquement redirigé une fois l'activation terminée.
        </p>
      </div>
    </div>
  );
}
