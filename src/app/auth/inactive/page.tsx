import { AuthLayout } from "@/lib/auth/components/auth-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function InactiveAccountPage() {
  return (
    <AuthLayout
      title="Compte désactivé"
      subtitle="Merci d’avoir utilisé Andoxa. Votre compte est actuellement inactif."
      showBackToLogin={true}
    >
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-red-100 dark:bg-red-900/30 p-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Votre tenant a été désactivé. Si vous souhaitez continuer
              d’utiliser nos services, contactez-nous et nous vous aiderons à
              réactiver l’accès pour votre équipe.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/contact">Nous contacter</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/login">Retour à la connexion</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
