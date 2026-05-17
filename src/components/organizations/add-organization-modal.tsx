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

const PLAN_SOLO_FEATURES = [
    "Extension Chrome LinkedIn",
    "CRM complet (listes, pipeline, kanban)",
    "Inbox unifiée LinkedIn et WhatsApp",
    "Calendrier avec lien de booking",
    "Séquences WhatsApp pré et post-RDV",
    "Workflows custom illimités + 3 templates",
    "800 invitations LinkedIn / mois (200/sem.)",
    "1 utilisateur",
];

const PLAN_TEAM_FEATURES = [
    "Multi-utilisateurs (3 à 20)",
    "Pipeline kanban partagé",
    "Listes de prospects partagées",
    "Sessions d'appels collaboratives",
    "Dashboard manager équipe",
    "Rôles et permissions granulaires",
    "Support prioritaire (réponse < 24 h)",
];

const PLAN_CUSTOM_FEATURES = [
    "Au-delà de 20 utilisateurs",
    "SSO (Google, Okta, Microsoft)",
    "SLA contractuel + DPA",
    "Intégrations sur-mesure (HubSpot, Salesforce…)",
    "Onboarding accompagné par un CSM",
    "Formation équipe sur site",
    "Facturation virement annuel",
];

const PRICING = {
    solo: { monthly: 49, yearly: 39 },
    team: { monthly: 45, yearly: 36 },
};

type Billing = "monthly" | "yearly";

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

export function AddOrganizationModal({
    open,
    onClose,
    onSelectPlan,
}: {
    open: boolean;
    onClose: () => void;
    onSelectPlan?: (
        plan: "solo" | "team" | "custom",
        opts: { billing: Billing; teamUsers: number }
    ) => void;
}) {
    const [billing, setBilling] = useState<Billing>("yearly");
    const [teamUsers, setTeamUsers] = useState(5);
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

    const teamMonthlyRate = PRICING.team[billing];
    const teamTotal = teamMonthlyRate * teamUsers;
    const teamYearlySaving = useMemo(
        () => (PRICING.team.monthly - PRICING.team.yearly) * teamUsers * 12,
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
                        Ajoutez une nouvelle organisation
                    </h2>
                    <p className="pm-subtitle">
                        Choisissez un plan adapté à votre équipe.
                    </p>
                    <BillingToggle value={billing} onChange={setBilling} />
                </div>

                <div className="pm-cards">
                    <PricingCard
                        eyebrow="Solo"
                        title="Pour les commerciaux indépendants."
                        sub="Freelances, consultants, sales en solo."
                        billing={billing}
                        priceMonthly={PRICING.solo.monthly}
                        priceYearly={PRICING.solo.yearly}
                        ctaLabel="Choisir Solo"
                        ctaVariant="secondary"
                        onCta={() => handleSelect("solo")}
                        features={PLAN_SOLO_FEATURES}
                    />

                    <PricingCard
                        eyebrow="Team"
                        title="Pour les équipes commerciales."
                        sub="Sales teams, agences, cabinets de conseil."
                        billing={billing}
                        priceMonthly={PRICING.team.monthly}
                        priceYearly={PRICING.team.yearly}
                        badge="Recommandé"
                        featured
                        ctaLabel="Choisir Team"
                        ctaVariant="primary"
                        onCta={() => handleSelect("team")}
                        featuresHeader="Tout du plan Solo, plus :"
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
                        eyebrow="Custom"
                        title="Pour les équipes au-delà de 20."
                        sub="Sales orgs, scale-ups, grands groupes."
                        billing={billing}
                        priceMonthly={null}
                        priceYearly={null}
                        customPriceLabel="Sur-mesure"
                        customPriceNote="Tarification volume + intégrations dédiées"
                        ctaLabel="Demander un devis"
                        ctaVariant="outline"
                        onCta={() => handleSelect("custom")}
                        featuresHeader="Tout du plan Team, plus :"
                        features={PLAN_CUSTOM_FEATURES}
                    />
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

