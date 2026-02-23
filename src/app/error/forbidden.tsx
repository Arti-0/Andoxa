import Link from "next/link";
import { siteConfig } from "../siteConfig";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-5xl font-semibold text-muted-foreground">403</p>
        <h1 className="text-xl font-semibold">Accès refusé</h1>
        <p className="text-sm text-muted-foreground">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center mt-6">
          <Button asChild variant="default" size="sm">
            <Link href={siteConfig.baseLinks.home}>Retour à l&apos;accueil</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Tableau de bord</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

