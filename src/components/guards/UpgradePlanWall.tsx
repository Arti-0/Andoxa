"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface UpgradePlanWallProps {
  /** Page demandée (pour contexte éventuel) */
  featurePath?: string;
}

export function UpgradePlanWall({ featurePath }: UpgradePlanWallProps) {
  const isMessagerie = featurePath?.startsWith("/messagerie");
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-6 w-6" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {isMessagerie ? "Messagerie — plan Pro" : "Fonctionnalité Pro ou Business"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isMessagerie
            ? "La messagerie centralisée LinkedIn et WhatsApp est incluse à partir du plan Pro."
            : "Cette page est réservée aux plans Pro et Business."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/onboarding/plan">Voir les plans</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/settings">Abonnement</Link>
        </Button>
      </div>
    </div>
  );
}
