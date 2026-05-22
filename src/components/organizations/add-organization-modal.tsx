"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { X, Sparkles } from "lucide-react";
import {
    PLAN_FEATURES_TEXT,
    PLAN_PRESENTATION,
    annualSavingsForTeam,
} from "@/lib/config/plans-config";

// The Solo / Team / Custom bullets shown in the add-org modal mirror the
// marketing pricing page. The "Tout du plan Solo, plus :" header that's first
// in PLAN_FEATURES_TEXT.team / .custom is rendered separately by this modal's
// `featuresHeader` prop, so we strip it off the bullet list here.
const PLAN_SOLO_FEATURES = PLAN_FEATURES_TEXT.solo;
const PLAN_TEAM_FEATURES = PLAN_FEATURES_TEXT.team.slice(1);
const PLAN_CUSTOM_FEATURES = PLAN_FEATURES_TEXT.custom.slice(1);

const SOLO_PRICE = PLAN_PRESENTATION.solo.price!;
const TEAM_PRICE = PLAN_PRESENTATION.team.price!;

type Billing = "monthly" | "yearly";

function priceFor(price: { monthly: number; annual: number }, b: Billing): number {
    return b === "monthly" ? price.monthly : price.annual;
}

function fmtPrice(n: number): string {
    return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function CheckIcon() {
    return (
        <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pm-feature-check"
            aria-hidden="true"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function FeatureList({ items }: { items: string[] }) {
    return (
        <ul className="pm-features">
            {items.map((f) => (
                <li key={f} className="pm-feature">
                    <CheckIcon />
                    <span>{f}</span>
                </li>
            ))}
        </ul>
    );
}

function BillingToggle({
    value,
    onChange,
}: {
    value: Billing;
    onChange: (v: Billing) => void;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [thumb, setThumb] = useState({ left: 4, width: 0 });

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const measure = () => {
            const target = wrap.querySelector<HTMLElement>(`[data-val="${value}"]`);
            if (!target) return;
            const r = target.getBoundingClientRect();
            const pr = wrap.getBoundingClientRect();
            setThumb({ left: r.left - pr.left, width: r.width });
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(wrap);
        return () => ro.disconnect();
    }, [value]);

    return (
        <div
            ref={wrapRef}
            className="pm-billing"
            role="tablist"
            aria-label="Cycle de facturation"
        >
            <div
                className="pm-billing-thumb"
                style={{ left: thumb.left, width: thumb.width }}
            />
            <button
                type="button"
                role="tab"
                aria-selected={value === "monthly"}
                data-val="monthly"
                className={`pm-billing-btn ${value === "monthly" ? "pm-billing-btn--active" : ""}`}
                onClick={() => onChange("monthly")}
            >
                Mensuel
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={value === "yearly"}
                data-val="yearly"
                className={`pm-billing-btn ${value === "yearly" ? "pm-billing-btn--active" : ""}`}
                onClick={() => onChange("yearly")}
            >
                Annuel
                {value === "yearly" && (
                    <span className="pm-save-badge">Économisez 20%</span>
                )}
            </button>
        </div>
    );
}

function TeamUserSlider({
    value,
    onChange,
}: {
    value: number;
    onChange: (n: number) => void;
}) {
    const min = 3;
    const max = 20;
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="pm-slider-wrap">
            <div className="pm-slider-row">
                <span className="pm-slider-label">Combien d&apos;utilisateurs ?</span>
                <span className="pm-slider-users">
                    {value >= max ? `${max}+` : value} utilisateurs
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={1}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="pm-slider"
                aria-label="Nombre d'utilisateurs"
                style={{ backgroundSize: `${pct}% 100%` }}
            />
            <div className="pm-slider-marks">
                <span>3</span>
                <span>20+</span>
            </div>
        </div>
    );
}

interface PricingCardProps {
    eyebrow: string;
    title: string;
    sub: string;
    billing: Billing;
    priceMonthly: number | null;
    priceYearly: number | null;
    badge?: string;
    featured?: boolean;
    ctaLabel: string;
    ctaVariant: "primary" | "secondary" | "outline";
    onCta: () => void;
    ctaDisabled?: boolean;
    featuresHeader?: string;
    features: string[];
    customPriceLabel?: string;
    customPriceNote?: string;
    extraSlot?: ReactNode;
}

function PricingCard({
    eyebrow,
    title,
    sub,
    billing,
    priceMonthly,
    priceYearly,
    badge,
    featured,
    ctaLabel,
    ctaVariant,
    onCta,
    ctaDisabled,
    featuresHeader,
    features,
    customPriceLabel,
    customPriceNote,
    extraSlot,
}: PricingCardProps) {
    const isCustom = priceMonthly == null && priceYearly == null;
    const price = billing === "yearly" ? priceYearly : priceMonthly;

    return (
        <div className={`pm-card ${featured ? "pm-card--featured" : ""}`}>
            {badge && (
                <div className="pm-badge">
                    <Sparkles size={11} aria-hidden="true" />
                    {badge}
                </div>
            )}
            <div className="pm-eyebrow">{eyebrow}</div>
            <div className="pm-card-title">{title}</div>
            <div className="pm-card-sub">{sub}</div>

            {!isCustom && price != null && (
                <>
                    <div className="pm-price">
                        <span className="pm-price-amount">{fmtPrice(price)} €</span>
                        <span className="pm-price-unit">/mois</span>
                    </div>
                    <div className="pm-price-note">
                        {billing === "yearly"
                            ? "Par utilisateur · facturation annuelle"
                            : "Par utilisateur · facturation mensuelle"}
                    </div>
                </>
            )}
            {isCustom && (
                <>
                    <div className="pm-custom">{customPriceLabel}</div>
                    <div className="pm-price-note">{customPriceNote}</div>
                </>
            )}

            {extraSlot}

            <button
                type="button"
                className={`pm-cta pm-cta--${ctaVariant}`}
                onClick={onCta}
                disabled={ctaDisabled}
                aria-disabled={ctaDisabled}
            >
                {ctaLabel}
            </button>

            {featuresHeader && (
                <div className="pm-features-h">{featuresHeader}</div>
            )}
            <FeatureList items={features} />
        </div>
    );
}

export type PlanPickerMode = "add-org" | "upgrade";

export interface PlanPickerModalProps {
    open: boolean;
    onClose: () => void;
    onSelectPlan?: (
        plan: "solo" | "team" | "custom",
        opts: { billing: Billing; teamUsers: number }
    ) => void;
    /**
     * Which scenario we're presenting:
     *   - "add-org" (default): user is creating a new organization that needs
     *     its own subscription. Picking a plan opens Stripe checkout.
     *   - "upgrade": user is upgrading the active org. Picking a plan opens
     *     the Stripe billing portal or the in-app change-plan flow.
     */
    mode?: PlanPickerMode;
    /**
     * In `upgrade` mode, the plan the workspace is currently on. The matching
     * card gets a "Plan actuel" CTA and is disabled so the user can only pick
     * a different plan.
     */
    currentPlan?: "solo" | "team" | "custom";
    /** Override the modal headline. Defaults adapt to `mode`. */
    headline?: string;
    /** Override the modal subheadline. Defaults adapt to `mode`. */
    subheadline?: string;
}

/**
 * Generic plan picker modal. Backwards-compatible alias `AddOrganizationModal`
 * (below) defaults to `mode='add-org'` so the existing sidebar call site keeps
 * working unchanged.
 */
export function PlanPickerModal({
    open,
    onClose,
    onSelectPlan,
    mode = "add-org",
    currentPlan,
    headline,
    subheadline,
}: PlanPickerModalProps) {
    const [billing, setBilling] = useState<Billing>("yearly");
    const [teamUsers, setTeamUsers] = useState(5);

    const defaultHeadline =
        mode === "upgrade"
            ? "Changez de plan"
            : "Ajoutez une nouvelle organisation";
    const defaultSubheadline =
        mode === "upgrade"
            ? "Le nouveau plan s'applique à votre organisation active."
            : "Choisissez un plan adapté à votre équipe.";
    const resolvedHeadline = headline ?? defaultHeadline;
    const resolvedSubheadline = subheadline ?? defaultSubheadline;

    function ctaFor(
        plan: "solo" | "team" | "custom",
        fallback: string
    ): { label: string; disabled: boolean } {
        if (mode === "upgrade" && currentPlan === plan) {
            return { label: "Plan actuel", disabled: true };
        }
        return { label: fallback, disabled: false };
    }
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Tab") {
                const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusables || !focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        const t = setTimeout(() => modalRef.current?.focus(), 0);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
            clearTimeout(t);
        };
    }, [open, onClose]);

    const teamMonthlyRate = priceFor(TEAM_PRICE, billing);
    const teamTotal = teamMonthlyRate * teamUsers;
    const teamYearlySaving = useMemo(
        () => annualSavingsForTeam(teamUsers),
        [teamUsers]
    );

    const handleSelect = useCallback(
        (plan: "solo" | "team" | "custom") => {
            onSelectPlan?.(plan, { billing, teamUsers });
            onClose();
        },
        [billing, teamUsers, onClose, onSelectPlan]
    );

    if (!open) return null;

    const onOverlayMouseDown = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
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
                className="pm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pm-title"
                tabIndex={-1}
            >
                <button
                    type="button"
                    className="pm-close"
                    onClick={onClose}
                    aria-label="Fermer"
                >
                    <X size={18} />
                </button>

                <div className="pm-header">
                    <h2 id="pm-title" className="pm-title">
                        {resolvedHeadline}
                    </h2>
                    <p className="pm-subtitle">{resolvedSubheadline}</p>
                    <BillingToggle value={billing} onChange={setBilling} />
                </div>

                <div className="pm-cards">
                    {(() => {
                        const soloCta = ctaFor(
                            "solo",
                            PLAN_PRESENTATION.solo.cta.modal
                        );
                        const teamCta = ctaFor(
                            "team",
                            PLAN_PRESENTATION.team.cta.modal
                        );
                        const customCta = ctaFor(
                            "custom",
                            PLAN_PRESENTATION.custom.cta.modal
                        );
                        return (
                            <>
                    <PricingCard
                        eyebrow={PLAN_PRESENTATION.solo.tag}
                        title={PLAN_PRESENTATION.solo.title}
                        sub={PLAN_PRESENTATION.solo.subtitle}
                        billing={billing}
                        priceMonthly={SOLO_PRICE.monthly}
                        priceYearly={SOLO_PRICE.annual}
                        ctaLabel={soloCta.label}
                        ctaDisabled={soloCta.disabled}
                        ctaVariant="secondary"
                        onCta={() => handleSelect("solo")}
                        features={PLAN_SOLO_FEATURES}
                    />

                    <PricingCard
                        eyebrow={PLAN_PRESENTATION.team.tag}
                        title={PLAN_PRESENTATION.team.title}
                        sub={PLAN_PRESENTATION.team.subtitle}
                        billing={billing}
                        priceMonthly={TEAM_PRICE.monthly}
                        priceYearly={TEAM_PRICE.annual}
                        badge="Recommandé"
                        featured
                        ctaLabel={teamCta.label}
                        ctaDisabled={teamCta.disabled}
                        ctaVariant="primary"
                        onCta={() => handleSelect("team")}
                        featuresHeader={PLAN_PRESENTATION.team.featuresHeader}
                        features={PLAN_TEAM_FEATURES}
                        extraSlot={
                            <>
                                <TeamUserSlider
                                    value={teamUsers}
                                    onChange={setTeamUsers}
                                />
                                <div
                                    className="pm-total"
                                    style={{
                                        marginBottom: 16,
                                        marginTop: 0,
                                        borderTop: "none",
                                        paddingTop: 0,
                                    }}
                                >
                                    <div className="pm-total-row">
                                        <span className="pm-total-label">Total</span>
                                        <span className="pm-total-amount">
                                            {fmtPrice(teamTotal)} € /mois
                                        </span>
                                    </div>
                                    {billing === "yearly" && (
                                        <div className="pm-total-save">
                                            Économisez {fmtPrice(teamYearlySaving)}{" "}
                                            €/an vs mensuel
                                        </div>
                                    )}
                                </div>
                            </>
                        }
                    />

                    <PricingCard
                        eyebrow={PLAN_PRESENTATION.custom.tag}
                        title={PLAN_PRESENTATION.custom.title}
                        sub={PLAN_PRESENTATION.custom.subtitle}
                        billing={billing}
                        priceMonthly={null}
                        priceYearly={null}
                        customPriceLabel={PLAN_PRESENTATION.custom.customPriceLabel}
                        customPriceNote={
                            "custom" in PLAN_PRESENTATION.custom.priceNote
                                ? PLAN_PRESENTATION.custom.priceNote.custom
                                : ""
                        }
                        ctaLabel={customCta.label}
                        ctaDisabled={customCta.disabled}
                        ctaVariant="outline"
                        onCta={() => handleSelect("custom")}
                        featuresHeader={PLAN_PRESENTATION.custom.featuresHeader}
                        features={PLAN_CUSTOM_FEATURES}
                    />
                            </>
                        );
                    })()}
                </div>

                <div className="pm-footer">
                    <div>
                        Vous pouvez changer de plan à tout moment depuis les
                        paramètres de votre organisation.
                    </div>
                    <div className="pm-footer-links">
                        <a
                            href="/legal/cgu"
                            className="pm-footer-link"
                            onClick={(e) => e.preventDefault()}
                        >
                            Conditions Générales
                        </a>
                        <a
                            href="/legal/privacy"
                            className="pm-footer-link"
                            onClick={(e) => e.preventDefault()}
                        >
                            Politique de confidentialité
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Backwards-compatible alias for the sidebar's "Ajouter une organisation"
 * flow. New call sites should import {@link PlanPickerModal} directly and
 * pass `mode='add-org' | 'upgrade'` explicitly.
 */
export function AddOrganizationModal(
    props: Omit<PlanPickerModalProps, "mode">
) {
    return <PlanPickerModal {...props} mode="add-org" />;
}

