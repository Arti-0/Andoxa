import Link from "next/link";
import { siteConfig } from "../siteConfig";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-5xl font-semibold text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold">Page introuvable</h1>
        <p className="text-sm text-muted-foreground">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
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
