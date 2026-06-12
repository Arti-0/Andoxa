"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOwnerWorkspace } from "@/lib/onboarding/create-workspace-client";
import { useOnboardingRuntime } from "../../_components/OnboardingContext";
import { PrimaryCta, StepHeading, TrialBadge } from "./owner-ui";
import type { StepProps } from "../types";

/**
 * First (and merged) owner step: name + company on one screen. The company
 * name creates the organization right away (plan `trial`, status `pending`);
 * the logo now lives in Réglages → Organisation, not in onboarding.
 */
export function OwnerWelcomeStep({ onNext, onError }: StepProps) {
  const router = useRouter();
  const {
    fullName,
    setFullName,
    orgId,
    setOrgId,
    orgName,
    setOrgName,
    refresh,
  } = useOnboardingRuntime();
  const [saving, setSaving] = useState(false);

  const canContinue =
    fullName.trim().length >= 2 && orgName.trim().length >= 2;

  // Escape hatch: a freshly-created account that lands here by mistake (wrong
  // email, switched plans, etc.) must be able to sign out instead of being
  // trapped in the wizard.
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const handleContinue = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || json.success !== true) {
        throw new Error(json.error?.message ?? "Échec de l’enregistrement");
      }

      if (orgId) {
        // Back-navigation: org already exists, just rename it.
        const orgRes = await fetch(`/api/organizations/${orgId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: orgName.trim() }),
        });
        const orgJson = (await orgRes.json()) as { error?: string };
        if (!orgRes.ok) {
          throw new Error(orgJson.error ?? "Mise à jour impossible");
        }
      } else {
        const created = await createOwnerWorkspace({
          orgName: orgName.trim(),
          fullNameForProfile: fullName.trim(),
        });
        if (!created.ok) {
          onError(created.error);
          return;
        }
        setOrgId(created.organizationId);
      }

      await refresh();
      onNext();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain py-8">
      <div className="flex w-full max-w-sm flex-col gap-8 sm:max-w-md">
        <TrialBadge />
        <StepHeading
          title="Bienvenue sur Andoxa"
          subtitle="Votre espace de prospection est prêt en moins de deux minutes."
        />
        <form
          className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7"
          onSubmit={(e) => {
            e.preventDefault();
            void handleContinue();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="owner-name">Votre nom</Label>
            <Input
              id="owner-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Marie Dupont"
              autoComplete="name"
              className="h-11 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-company">Votre entreprise</Label>
            <Input
              id="owner-company"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme"
              autoComplete="organization"
              className="h-11 rounded-lg"
            />
            <p className="text-xs text-muted-foreground">
              Servira de nom à votre espace de travail — modifiable à tout
              moment dans les réglages.
            </p>
          </div>
          <PrimaryCta type="submit" disabled={!canContinue} loading={saving}>
            Continuer
            <ArrowRight className="size-4" />
          </PrimaryCta>
        </form>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mx-auto text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Ce n’est pas vous ? Se déconnecter
        </button>
      </div>
    </div>
  );
}
