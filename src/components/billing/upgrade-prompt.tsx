"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { PlanPickerModal } from "@/components/organizations/add-organization-modal";
import { ConfirmDowngradeModal } from "@/components/billing/confirm-downgrade-modal";
import { useWorkspace } from "@/lib/workspace";
import type { PlanId } from "@/lib/config/plans-config";

const PLAN_RANK: Record<"trial" | "solo" | "team" | "custom" | "demo", number> = {
  trial: 0,
  solo: 1,
  team: 2,
  custom: 3,
  demo: 99,
};

function isStrictDowngrade(
  from: string | null | undefined,
  to: "solo" | "team" | "custom"
): from is "team" | "custom" {
  if (from !== "team" && from !== "custom") return false;
  return PLAN_RANK[to] < PLAN_RANK[from];
}

/**
 * Reason the upgrade prompt was opened — drives the headline + subheadline
 * shown in the picker so the user understands why they're seeing it.
 */
export type UpgradeReason =
  | "seat_limit"
  | "prospect_limit"
  | "campaign_limit"
  | "manual";

export interface OpenUpgradeOptions {
  reason?: UpgradeReason;
  /** Override the headline. Falls back to a reason-specific default. */
  headline?: string;
  /** Override the subheadline. Falls back to a reason-specific default. */
  subheadline?: string;
}

interface UpgradePromptApi {
  openUpgrade: (opts?: OpenUpgradeOptions) => void;
  closeUpgrade: () => void;
}

const UpgradePromptContext = createContext<UpgradePromptApi | null>(null);

const DEFAULTS: Record<
  UpgradeReason,
  { headline: string; subheadline: string }
> = {
  seat_limit: {
    headline: "Invitez votre équipe",
    subheadline:
      "Votre plan actuel ne permet pas plus d'utilisateurs. Passez à un plan supérieur pour ajouter des membres.",
  },
  prospect_limit: {
    headline: "Plus de prospects, plus d'opportunités",
    subheadline:
      "Vous avez atteint la limite de prospects de votre plan. Choisissez un plan adapté à votre volume.",
  },
  campaign_limit: {
    headline: "Lancez plus de campagnes",
    subheadline:
      "Votre plan actuel limite le nombre de campagnes simultanées. Passez à un plan supérieur pour continuer.",
  },
  manual: {
    headline: "Changez de plan",
    subheadline: "Le nouveau plan s'applique à votre organisation active.",
  },
};

/**
 * Mounts a single in-app upgrade picker that any descendant can trigger via
 * `useUpgradePrompt().openUpgrade(...)`. The picker is the same
 * `PlanPickerModal` used for "Ajouter une organisation", reused in
 * `mode='upgrade'` so the current plan card is marked "Plan actuel" and
 * the user can only pick a *different* plan.
 */
export function UpgradePromptProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<OpenUpgradeOptions | null>(null);
  const [pendingDowngrade, setPendingDowngrade] = useState<{
    currentPlan: "team" | "custom";
    targetPlan: "solo" | "team";
  } | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const { workspace } = useWorkspace();
  const router = useRouter();

  const openUpgrade = useCallback(
    (next?: OpenUpgradeOptions) => setOpts(next ?? { reason: "manual" }),
    []
  );
  const closeUpgrade = useCallback(() => setOpts(null), []);

  const api = useMemo<UpgradePromptApi>(
    () => ({ openUpgrade, closeUpgrade }),
    [openUpgrade, closeUpgrade]
  );

  const reason = opts?.reason ?? "manual";
  const defaults = DEFAULTS[reason];
  const currentPlan = normalizeForPicker(workspace?.plan ?? null);

  const handleSelectPlan = useCallback(
    async (plan: "solo" | "team" | "custom") => {
      closeUpgrade();

      // Strict downgrade → intercept and open the confirm-downgrade modal.
      // Anything that is *not* a strict downgrade (upgrade, custom contact)
      // falls through to the existing redirect.
      if (
        (plan === "solo" || plan === "team") &&
        isStrictDowngrade(workspace?.plan, plan) &&
        workspace?.id
      ) {
        // Read the current active-member count so the confirm modal can
        // display "X membres à désactiver" without a second prop hop.
        try {
          const res = await fetch("/api/usage/limits", {
            credentials: "include",
          });
          if (res.ok) {
            const json = await res.json();
            const data = json?.data ?? json;
            const used = Number(data?.users?.used ?? 0);
            setMemberCount(Number.isFinite(used) ? used : 0);
          }
        } catch {
          // Best-effort — falls back to 0, modal still renders.
        }
        setPendingDowngrade({
          currentPlan: workspace.plan as "team" | "custom",
          targetPlan: plan,
        });
        return;
      }

      if (plan === "custom") {
        window.location.assign("/contact?objet=custom");
        return;
      }
      window.location.assign(`/checkout?plan=${plan}&billing=annual`);
    },
    [closeUpgrade, workspace?.plan, workspace?.id]
  );

  return (
    <UpgradePromptContext.Provider value={api}>
      {children}
      <PlanPickerModal
        open={opts !== null}
        onClose={closeUpgrade}
        mode="upgrade"
        currentPlan={currentPlan}
        headline={opts?.headline ?? defaults.headline}
        subheadline={opts?.subheadline ?? defaults.subheadline}
        onSelectPlan={(plan) => {
          void handleSelectPlan(plan);
        }}
      />
      {pendingDowngrade && workspace?.id ? (
        <ConfirmDowngradeModal
          open={pendingDowngrade !== null}
          currentPlan={pendingDowngrade.currentPlan}
          targetPlan={pendingDowngrade.targetPlan}
          currentMembers={memberCount}
          organizationId={workspace.id}
          onClose={() => setPendingDowngrade(null)}
          onScheduled={() => {
            setPendingDowngrade(null);
            // Land the owner on the transition view so they can start
            // pruning members right away.
            router.push("/settings?tab=organization&transition=1");
            router.refresh();
          }}
        />
      ) : null}
    </UpgradePromptContext.Provider>
  );
}

function normalizeForPicker(
  plan: string | null
): "solo" | "team" | "custom" | undefined {
  if (plan === "solo" || plan === "team" || plan === "custom") return plan;
  // Trial and demo workspaces have no "current" card to highlight — leave
  // undefined so every card is selectable.
  return undefined;
}

/**
 * Returns the upgrade-prompt API. Throws if used outside of
 * `UpgradePromptProvider` so missing-mount bugs surface loudly in dev.
 */
export function useUpgradePrompt(): UpgradePromptApi {
  const ctx = useContext(UpgradePromptContext);
  if (!ctx) {
    throw new Error("useUpgradePrompt must be used inside UpgradePromptProvider");
  }
  return ctx;
}

// Re-export the `PlanId` type for consumers that want to type their reasons.
export type { PlanId };
