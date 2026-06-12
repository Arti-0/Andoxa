"use client";

import { useEffect, useRef } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOnboardingRuntime,
  type OnboardingTeamSize,
} from "../../_components/OnboardingContext";
import { StepHeading } from "./owner-ui";
import type { StepProps } from "../types";

const TEAM_SIZE_OPTIONS: {
  id: OnboardingTeamSize;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}[] = [
  {
    id: "solo",
    icon: User,
    title: "Moi uniquement",
    description: "Freelance, consultant ou commercial indépendant.",
  },
  {
    id: "team",
    icon: Users,
    title: "2 à 20 utilisateurs",
    description: "Sales team, agence ou cabinet de conseil.",
  },
  {
    id: "large",
    icon: Building2,
    title: "Plus de 20 utilisateurs",
    description: "Organisation commerciale, scale-up, grand groupe.",
  },
];

/** Qualification: seat count drives the plan recommendation on owner.trial. */
export function QualifyStep({ onNext }: StepProps) {
  const { fullName, teamSize, setTeamSize } = useOnboardingRuntime();
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const select = (id: OnboardingTeamSize) => {
    setTeamSize(id);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(onNext, 280);
  };

  const firstName = fullName.trim().split(" ")[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain py-8">
      <div className="flex w-full max-w-sm flex-col gap-8 sm:max-w-md">
        <StepHeading
          title="Combien serez-vous à utiliser Andoxa ?"
          subtitle={`${firstName ? `${firstName}, c` : "C"}omptez toutes les personnes de votre équipe qui prospecteront avec l’outil — on vous recommande la formule adaptée.`}
        />
        <div className="flex flex-col gap-3">
          {TEAM_SIZE_OPTIONS.map((opt) => {
            const active = teamSize === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => select(opt.id)}
                aria-pressed={active}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition-all",
                  active
                    ? "border-primary ring-2 ring-primary/15"
                    : "border-border hover:border-muted-foreground/30 hover:shadow-md"
                )}
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                  )}
                >
                  <opt.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {opt.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {opt.description}
                  </span>
                </span>
                {active ? (
                  <Check className="size-4 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
