"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, Lock } from "lucide-react";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";

import {
  PLAN_LIMITS,
  PLAN_PRESENTATION,
  toPlanId,
  type PlanId,
} from "@/lib/config/plans-config";

interface Member {
  id: string;
  user_id: string;
  name: string;
  role: "owner" | "admin" | "member";
  avatar_url: string | null;
  active: boolean;
  created_at: string;
}

interface Props {
  organizationId: string;
  callerId: string;
  callerIsAdmin: boolean;
  /** Already-loaded members list — we keep parity with the standard tab. */
  members: Member[];
  /** Target plan when the schedule fires. */
  scheduledTarget: string | null;
  /** Effective date, ISO string. */
  effectiveAt: string | null;
  /** Reload members + workspace after a mutation. */
  onMutated: () => void;
}

function frenchLongDate(iso: string | null): string {
  if (!iso) return "la fin du cycle";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "la fin du cycle";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function tenure(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const months = Math.max(
    0,
    Math.floor((Date.now() - d.getTime()) / (30 * 24 * 3600 * 1000))
  );
  if (months > 12) {
    return `rejoint le ${d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }
  if (months === 0) return "ajouté ce mois-ci";
  if (months === 1) return "ajouté il y a 1 mois";
  return `ajouté il y a ${months} mois`;
}

function initial(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase();
}

/**
 * Screen 2 — Manage team during downgrade transition.
 * Replaces the standard members card while `org.scheduled_downgrade_to` is set.
 */
export function TransitionMembersView({
  organizationId,
  callerId,
  callerIsAdmin,
  members,
  scheduledTarget,
  effectiveAt,
  onMutated,
}: Props) {
  const target = toPlanId(scheduledTarget) as PlanId;
  const targetCap = PLAN_LIMITS[target]?.users ?? 1;
  const targetName = PLAN_PRESENTATION[
    target === "team" || target === "custom" || target === "solo" ? target : "solo"
  ].tag;

  // Optimistic store for active toggles. Falls back to `members` props.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  useEffect(() => setOverrides({}), [members]);

  const queryClient = useQueryClient();

  const orderedMembers = useMemo(
    () => [...members].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [members]
  );

  const isActive = useCallback(
    (m: Member) => overrides[m.user_id] ?? m.active,
    [overrides]
  );

  const activeCount = orderedMembers.reduce(
    (acc, m) => (isActive(m) ? acc + 1 : acc),
    0
  );
  const excess = Math.max(0, activeCount - (targetCap === -1 ? 0 : targetCap));
  const atGoal = excess === 0;

  // Progress visual: bar drains as active count approaches the target.
  const startingMemberCount = orderedMembers.length;
  const targetForBar = targetCap === -1 ? 0 : targetCap;
  const denom = Math.max(1, startingMemberCount - targetForBar);
  const remaining = Math.max(0, activeCount - targetForBar);
  const fillPct = atGoal ? 100 : Math.max(8, (remaining / denom) * 100);

  const effectiveLabel = frenchLongDate(effectiveAt);

  const toggleMember = async (member: Member, next: boolean) => {
    // Optimistic flip + invalidate on success.
    setOverrides((prev) => ({ ...prev, [member.user_id]: next }));
    try {
      const res = await fetch(
        `/api/organization/members/${member.user_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ active: next }),
        }
      );
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message ?? "Impossible de modifier ce membre"
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["plan-limits"] });
      onMutated();
    } catch (err) {
      // Revert the optimistic flip.
      setOverrides((prev) => {
        const { [member.user_id]: _, ...rest } = prev;
        return rest;
      });
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const cancelDowngrade = async () => {
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/cancel-downgrade`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message ?? "Annulation impossible"
        );
      }
      toast.success("Rétrogradation annulée");
      onMutated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <div className="dw-transition">
      <div>
        <div className="eyebrow">
          TRANSITION VERS LE PLAN {targetName.toUpperCase()}
        </div>
        <h2 className="font-display" style={{ fontSize: 32, marginTop: 8 }}>
          Préparez votre équipe
        </h2>
      </div>

      <section className="dw-transition-banner">
        <div className="dw-transition-progress-wrap">
          <div className="dw-transition-progress">
            <div
              className={`dw-transition-progress-fill ${
                atGoal ? "dw-transition-progress-fill--done" : ""
              }`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          {atGoal ? (
            <span className="dw-transition-progress-badge">
              ✓ Objectif atteint
            </span>
          ) : null}
        </div>

        <div className="dw-transition-counter">
          <strong>{activeCount} actifs</strong> · cible :{" "}
          <strong>
            {targetCap === -1 ? "∞" : targetCap}
          </strong>{" "}
          d&apos;ici le {effectiveLabel}
        </div>

        <div className="dw-transition-explain">
          {excess > 0 ? (
            <>
              Désactivez <strong>{excess} membre{excess > 1 ? "s" : ""}</strong>{" "}
              avant le {effectiveLabel}. Leurs données seront conservées en
              lecture seule.
            </>
          ) : (
            <>
              Le changement s&apos;effectuera automatiquement le {effectiveLabel}.
              Vos données restent intactes.
            </>
          )}
        </div>

        {callerIsAdmin ? (
          <div className="dw-transition-actions">
            <button
              type="button"
              className="pm-cta pm-cta--outline"
              onClick={() => void cancelDowngrade()}
            >
              Annuler la rétrogradation
            </button>
          </div>
        ) : null}
      </section>

      <div>
        <div className="dw-gate-section-label" style={{ marginBottom: 10 }}>
          MEMBRES
        </div>
        <div className="dw-members-list">
          {orderedMembers.map((m) => {
            const active = isActive(m);
            const isSelf = m.user_id === callerId;
            const isOwner = m.role === "owner";
            const canToggle = callerIsAdmin && !isSelf && !isOwner;
            return (
              <div key={m.id} className="dw-member-row">
                <span
                  className={`dw-member-status-dot ${
                    active
                      ? "dw-member-status-dot--active"
                      : "dw-member-status-dot--inactive"
                  }`}
                  aria-hidden
                />
                <span className="dw-member-avatar">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" />
                  ) : (
                    initial(m.name)
                  )}
                </span>
                <div className="dw-member-info">
                  <div className="dw-member-name">
                    {m.name}
                    {isOwner ? (
                      <Crown
                        size={12}
                        style={{
                          display: "inline",
                          marginLeft: 6,
                          color: "#b45309",
                          verticalAlign: "middle",
                        }}
                        aria-label="Propriétaire"
                      />
                    ) : null}
                  </div>
                  <div className="dw-member-role">
                    {m.role === "owner"
                      ? "Propriétaire"
                      : m.role === "admin"
                      ? "Admin"
                      : "Membre"}
                  </div>
                </div>
                <span className="dw-member-tenure">{tenure(m.created_at)}</span>
                {isOwner ? (
                  <span className="dw-member-owner-badge">
                    Toujours actif
                  </span>
                ) : (
                  <button
                    type="button"
                    className="dw-toggle"
                    data-on={active ? "true" : "false"}
                    disabled={!canToggle}
                    onClick={() => void toggleMember(m, !active)}
                    aria-label={
                      active
                        ? `Désactiver ${m.name}`
                        : `Réactiver ${m.name}`
                    }
                    title={
                      isSelf
                        ? "Vous ne pouvez pas vous désactiver vous-même."
                        : undefined
                    }
                  >
                    <span className="dw-toggle-label dw-toggle-label--on">
                      Actif
                    </span>
                    <span className="dw-toggle-label dw-toggle-label--off">
                      {isSelf ? (
                        <Lock size={10} style={{ display: "inline" }} />
                      ) : (
                        "Inactif"
                      )}
                    </span>
                    <span className="dw-toggle-thumb" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
