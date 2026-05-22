"use client";

import { useEffect, useRef, useState } from "react";
import { X, Info, Loader2, ArrowRight } from "lucide-react";
import { toast } from "@/lib/toast";

import {
  PLAN_LIMITS,
  PLAN_PRESENTATION,
  type PlanId,
} from "@/lib/config/plans-config";

interface Props {
  open: boolean;
  /** Current org plan (must outrank target). */
  currentPlan: "team" | "custom";
  /** Target plan the user picked. */
  targetPlan: "solo" | "team";
  /** Active member count today — drives the "excess to deactivate" wording. */
  currentMembers: number;
  /** Active organization id, needed for the schedule endpoint. */
  organizationId: string;
  onClose: () => void;
  /** Called after a successful schedule — router push happens upstream. */
  onScheduled: (effectiveAt: string) => void;
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Screen 1 of the downgrade UX. Owner has chosen a strictly-lower plan in
 * the upgrade prompt; this modal explains what will happen at period end
 * and writes the schedule. The CTA is intentionally zinc-not-red — the
 * action is consequential but reversible by hitting `cancel-downgrade`.
 */
export function ConfirmDowngradeModal({
  open,
  currentPlan,
  targetPlan,
  currentMembers,
  organizationId,
  onClose,
  onScheduled,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    setTimeout(() => modalRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const currentPres = PLAN_PRESENTATION[currentPlan];
  const targetPres = PLAN_PRESENTATION[targetPlan];
  const currentPrice = currentPres.price?.annual ?? null;
  const targetPrice = targetPres.price?.annual ?? null;
  const currentMonthly =
    currentPrice !== null
      ? currentPrice * Math.max(currentMembers, 1)
      : null;
  const targetMonthly = targetPrice !== null ? targetPrice : null;
  const savings =
    currentMonthly !== null && targetMonthly !== null
      ? Math.max(0, currentMonthly - targetMonthly)
      : null;

  const targetCap = PLAN_LIMITS[targetPlan].users;
  const excess = Math.max(0, currentMembers - targetCap);

  const onOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && !submitting) onClose();
  };

  const onConfirm = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/schedule-downgrade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ targetPlan }),
        }
      );
      const json = (await res.json()) as {
        success?: boolean;
        data?: { effectiveAt?: string };
        effectiveAt?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(
          json.error?.message ?? "Impossible de programmer le changement"
        );
      }
      const effectiveAt =
        json.data?.effectiveAt ?? json.effectiveAt ?? new Date().toISOString();
      toast.success("Changement programmé");
      onScheduled(effectiveAt);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="pm-overlay"
      onMouseDown={onOverlayMouseDown}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="pm-modal dw-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dw-confirm-title"
        tabIndex={-1}
      >
        <button
          type="button"
          className="pm-close"
          onClick={onClose}
          disabled={submitting}
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        <div className="dw-confirm-header">
          <div className="eyebrow">CHANGEMENT DE PLAN</div>
          <h2 id="dw-confirm-title" className="dw-confirm-title font-display">
            Passer au plan {targetPres.tag}
          </h2>
          <p className="dw-confirm-subtitle">
            Votre nouveau tarif s&apos;appliquera à la fin du cycle.
          </p>
        </div>

        <div className="dw-confirm-body">
          {/* ── Récapitulatif ──────────────────────────────────────────── */}
          <section className="dw-card">
            <h3 className="dw-card-title">Récapitulatif</h3>
            <div className="dw-recap-grid">
              <div className="dw-recap-mini dw-recap-mini--from">
                <div className="dw-recap-mini-label">Plan actuel</div>
                <div className="dw-recap-mini-name font-display">
                  {currentPres.tag}
                </div>
                {currentMonthly !== null ? (
                  <div className="dw-recap-mini-price tabular">
                    {fmtPrice(currentMonthly)} € / mois
                  </div>
                ) : null}
                <div className="dw-recap-mini-seats">
                  {currentMembers}{" "}
                  {pluralize(currentMembers, "siège", "sièges")}
                </div>
              </div>

              <ArrowRight className="dw-recap-arrow" aria-hidden />

              <div className="dw-recap-mini dw-recap-mini--to">
                <div className="dw-recap-mini-label">Nouveau plan</div>
                <div className="dw-recap-mini-name font-display">
                  {targetPres.tag}
                </div>
                {targetMonthly !== null ? (
                  <div className="dw-recap-mini-price tabular">
                    {fmtPrice(targetMonthly)} € / mois
                  </div>
                ) : null}
                <div className="dw-recap-mini-seats">
                  {targetCap === -1
                    ? "Sièges illimités"
                    : `${targetCap} ${pluralize(targetCap, "siège", "sièges")}`}
                </div>
              </div>
            </div>

            <dl className="dw-recap-kv">
              <div className="dw-recap-kv-row">
                <dt>Date d&apos;effet</dt>
                <dd className="tabular">À la fin du cycle</dd>
              </div>
              {savings !== null ? (
                <div className="dw-recap-kv-row">
                  <dt>Économie / mois</dt>
                  <dd className="tabular">{fmtPrice(savings)} €</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/* ── Membres à désactiver ───────────────────────────────────── */}
          {excess > 0 ? (
            <section className="dw-card">
              <h3 className="dw-card-title">Membres à désactiver</h3>
              <p className="dw-card-body">
                Le plan {targetPres.tag} permet{" "}
                <strong className="dw-emph">
                  {targetCap} {pluralize(targetCap, "utilisateur")}
                </strong>
                . Vous devrez désactiver{" "}
                <strong className="dw-emph">
                  {excess} {pluralize(excess, "membre")}
                </strong>{" "}
                avant la fin du cycle.
              </p>
              <p className="dw-card-body">
                Une fois la rétrogradation effective, leurs données (prospects,
                listes, campagnes, workflows) deviendront en lecture seule —
                jamais supprimées.
              </p>
            </section>
          ) : null}

          {/* ── Amber callout ──────────────────────────────────────────── */}
          {excess > 0 ? (
            <aside className="dw-callout dw-callout--info">
              <Info className="dw-callout-icon" aria-hidden />
              <div>
                <div className="dw-callout-title">Sans action de votre part</div>
                <div className="dw-callout-body">
                  Si {excess} {pluralize(excess, "membre")}{" "}
                  {pluralize(excess, "n'est", "ne sont")} pas{" "}
                  {pluralize(excess, "désactivé")} d&apos;ici la fin du cycle,
                  nous suspendrons automatiquement les membres les plus
                  récemment ajoutés. Vous resterez actif en tant que
                  propriétaire.
                </div>
              </div>
            </aside>
          ) : null}

          {error ? <div className="dw-error">{error}</div> : null}
        </div>

        <div className="dw-confirm-footer">
          <button
            type="button"
            className="pm-cta pm-cta--outline"
            onClick={onClose}
            disabled={submitting}
          >
            Annuler
          </button>
          <button
            type="button"
            className="pm-cta dw-cta--commit"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="dw-spinner" aria-hidden />
                Programmation…
              </>
            ) : (
              "Programmer le changement"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
