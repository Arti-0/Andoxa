"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

interface CandidateMember {
  user_id: string;
  name: string;
  role: "owner" | "admin" | "member";
  active: boolean;
  avatar_url: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  organizationId: string;
  callerId: string;
  callerName: string;
  /** All active members of the org, used to populate Step 1. */
  members: CandidateMember[];
  /**
   * Adjusts the Step-1 copy to mention "you're about to leave this org —
   * pick a new owner first". Use it from the pre-downgrade flow when the
   * current owner is also about to be deactivated by a Solo downgrade.
   */
  intent?: "standalone" | "pre-downgrade";
  onClose: () => void;
  /** Called once the transfer endpoint returns ok. */
  onTransferred: (toUser: CandidateMember) => void;
}

function initial(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function tenure(iso: string | null | undefined): string {
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
  if (months === 1) return "il y a 1 mois";
  return `il y a ${months} mois`;
}

/**
 * Screen 3 — Owner transfer modal. Two steps: pick a recipient, then a
 * type-`TRANSFER` confirmation. Reusable from Settings → Danger zone
 * (`intent='standalone'`) or from the pre-downgrade flow
 * (`intent='pre-downgrade'`).
 */
export function TransferOwnershipModal({
  open,
  organizationId,
  callerId,
  callerName,
  members,
  intent = "standalone",
  onClose,
  onTransferred,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CandidateMember | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setQuery("");
      setSelected(null);
      setConfirmText("");
      setSubmitting(false);
      setError(null);
      return;
    }
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

  const candidates = useMemo(() => {
    // Only active members other than the caller (no self-transfer, no
    // transferring to a deactivated seat). RPC validates the same.
    const filtered = members
      .filter((m) => m.user_id !== callerId && m.active)
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!query.trim()) return filtered;
    const q = query.toLowerCase();
    return filtered.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, callerId, query]);

  if (!open) return null;

  const onOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && !submitting) onClose();
  };

  const submit = async () => {
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/transfer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            toUserId: selected.user_id,
            confirm: confirmText,
          }),
        }
      );
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message ?? "Échec du transfert"
        );
      }
      toast.success(`Propriété transférée à ${selected.name}.`);
      onTransferred(selected);
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
        className="pm-modal dw-transfer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dw-transfer-title"
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

        {step === 1 ? (
          <>
            <div className="dw-confirm-header">
              <div className="eyebrow">TRANSFÉRER LA PROPRIÉTÉ</div>
              <h2
                id="dw-transfer-title"
                className="dw-confirm-title font-display"
              >
                Choisissez le nouveau propriétaire
              </h2>
              <p className="dw-confirm-subtitle">
                L&apos;organisation ne peut avoir qu&apos;un seul propriétaire.
              </p>
              {intent === "pre-downgrade" ? (
                <p className="dw-transfer-context">
                  Vous êtes sur le point de quitter cette organisation.
                  Choisissez d&apos;abord son nouveau propriétaire.
                </p>
              ) : null}
            </div>

            <div className="dw-confirm-body">
              <div className="dw-transfer-search">
                <Search size={16} color="var(--muted-foreground)" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un membre"
                  autoFocus
                />
              </div>
              <div className="dw-transfer-list">
                {candidates.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      fontSize: 13,
                      color: "var(--muted-foreground)",
                      textAlign: "center",
                    }}
                  >
                    {members.filter((m) => m.user_id !== callerId).length === 0
                      ? "Invitez d'abord un membre pour pouvoir lui transférer la propriété."
                      : `Aucun membre trouvé pour « ${query} ».`}
                  </div>
                ) : (
                  candidates.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      className="dw-transfer-row"
                      onClick={() => setSelected(m)}
                    >
                      <span
                        className="dw-transfer-radio"
                        data-selected={
                          selected?.user_id === m.user_id ? "true" : "false"
                        }
                        aria-hidden
                      />
                      <span className="dw-member-avatar" style={{ width: 32, height: 32 }}>
                        {m.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.avatar_url} alt="" />
                        ) : (
                          initial(m.name)
                        )}
                      </span>
                      <span className="dw-member-info">
                        <span className="dw-member-name">{m.name}</span>
                        <span className="dw-member-role">
                          {m.role === "admin" ? "Admin" : "Membre"}
                        </span>
                      </span>
                      <span className="dw-member-tenure">
                        {tenure(m.created_at)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="dw-confirm-footer">
              <button
                type="button"
                className="pm-cta pm-cta--outline"
                onClick={onClose}
              >
                Annuler
              </button>
              <button
                type="button"
                className="pm-cta pm-cta--primary"
                onClick={() => setStep(2)}
                disabled={!selected}
              >
                Continuer
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="dw-confirm-header">
              <div className="eyebrow">CONFIRMATION</div>
              <h2
                id="dw-transfer-title"
                className="dw-confirm-title font-display"
              >
                Transférer à {selected?.name} ?
              </h2>
            </div>

            <div className="dw-confirm-body">
              <section className="dw-card">
                <h3 className="dw-card-title">Ce qui changera</h3>
                <div className="dw-transfer-diff">
                  <div className="dw-transfer-diff-row">
                    <span className="dw-transfer-diff-name">
                      {selected?.name}
                    </span>
                    <span className="dw-transfer-diff-role-from">
                      {selected?.role === "admin" ? "Admin" : "Membre"}
                    </span>
                    <ArrowRight className="dw-transfer-diff-arrow" />
                    <span className="dw-transfer-diff-role-to">
                      Propriétaire
                    </span>
                  </div>
                  <div className="dw-transfer-diff-row">
                    <span className="dw-transfer-diff-name">
                      {callerName}{" "}
                      <span className="dw-transfer-diff-self">(vous)</span>
                    </span>
                    <span className="dw-transfer-diff-role-from">
                      Propriétaire
                    </span>
                    <ArrowRight className="dw-transfer-diff-arrow" />
                    <span className="dw-transfer-diff-role-to">Admin</span>
                  </div>
                </div>
              </section>

              <div>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px" }}>
                  Après le transfert :
                </p>
                <ul className="dw-transfer-bullets">
                  <li>
                    {selected?.name.split(" ")[0] ?? "Le nouveau propriétaire"}{" "}
                    pourra modifier les paramètres de facturation et supprimer
                    l&apos;organisation.
                  </li>
                  <li>Vous resterez admin, sans accès à la facturation.</li>
                  <li>
                    Vous pourrez quitter l&apos;organisation à tout moment.
                  </li>
                </ul>
              </div>

              <div className="dw-transfer-guard">
                <label>
                  Pour confirmer, tapez <code>TRANSFER</code>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {error ? <div className="dw-error">{error}</div> : null}
            </div>

            <div className="dw-confirm-footer">
              <button
                type="button"
                className="pm-cta pm-cta--outline"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                ← Retour
              </button>
              <button
                type="button"
                className="pm-cta dw-cta--destructive"
                onClick={() => void submit()}
                disabled={confirmText !== "TRANSFER" || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="dw-spinner" aria-hidden />
                    Transfert…
                  </>
                ) : (
                  "Transférer maintenant"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
