"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-12">
      <div className="w-full max-w-[460px]">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground dark:text-[#f7f7f8]">
            Configurez votre compte
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground dark:text-[#8a8a8e]">
            Choisissez votre parcours: créer une organisation ou rejoindre une
            organisation existante.
          </p>
        </div>

        <div className="mt-8 rounded-[10px] border border-border/80 bg-card p-5 shadow-sm sm:p-6 dark:border-white/8 dark:bg-[#151516] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
          <div className="grid gap-3">
            <Button
              className="h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-[#5e6ad2] dark:text-white dark:hover:bg-[#5369d0]"
              onClick={() => router.push("/onboarding/new")}
            >
              Créer une organisation
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-full border-border bg-transparent text-foreground hover:bg-muted/40 dark:border-white/12 dark:text-[#c9c9cf] dark:hover:bg-white/6"
              onClick={() => router.push("/onboarding/join")}
            >
              Rejoindre une organisation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
