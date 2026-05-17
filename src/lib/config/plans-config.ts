/**
 * Centralized plan configuration (Solo / Team / Custom — the marketing model).
 *
 * Going forward there are five plan IDs in the DB column `organizations.plan`:
 *
 *   - `trial`  : 14-day Stripe trial on Solo — same feature set + caps below.
 *   - `solo`   : single-user paid plan. Everything in the product, 1 seat.
 *   - `team`   : 3-20 paid seats. Adds collab features + manager dashboard.
 *   - `custom` : 20+ seats, SSO, SLA — contact-sales, no Stripe checkout.
 *   - `demo`   : internal demo accounts, unlimited everything.
 *
 * Feature gating in the new model is intentionally simple: every paid plan
 * (solo|team|custom) gets every feature. Plans differentiate on
 * **seats + support**, not on feature flags. The few helpers below (`isPaidPlan`,
 * `isMultiSeatPlan`) capture that semantic so callers stop hard-coding plan IDs.
 *
 * Stripe price IDs are NOT stored here — see `lib/config/stripe-plans.ts`,
 * which reads them from env vars (`STRIPE_PRICE_SOLO_MONTHLY` etc.) so you
 * can create the products in the Stripe dashboard and ship without a code
 * change.
 */

export type PlanId = 'trial' | 'solo' | 'team' | 'custom' | 'demo';

export interface PlanLimits {
    /** Max paying seats (-1 = unlimited). */
    users: number;
    /** Max prospects in the workspace (-1 = unlimited). */
    prospects: number;
    /** Max simultaneous campaigns (-1 = unlimited). */
    campaigns: number;
    /** Enrichment credits per calendar month (-1 = unlimited, 0 = none). */
    enrichment_credits: number;
    /** Max rows accepted in a single CSV/XLSX import (-1 = unlimited). */
    import_csv_xlsx_max_rows: number;
    /** Max organizations a single owner can create (-1 = unlimited). */
    organizations: number;
}

export interface PlanFeatures {
    /** Sidebar / route gating allow-list. */
    routes: string[];
    /** Marketing-style bullet list (used in pricing UI). */
    features: string[];
}

export interface PlanConfig {
    id: PlanId;
    name: string;
    description: string;
    limits: PlanLimits;
    features: PlanFeatures;
    isRecommended?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Limits
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
    trial: {
        // Same surface as Solo, capped for tire-kickers.
        users: 1,
        prospects: 1000,
        campaigns: 5,
        enrichment_credits: 0,
        import_csv_xlsx_max_rows: -1,
        organizations: 1,
    },
    solo: {
        users: 1,
        prospects: -1,
        campaigns: -1,
        enrichment_credits: 0,
        import_csv_xlsx_max_rows: -1,
        organizations: 1,
    },
    team: {
        // Team is sold from 3 seats; per-seat billing handles the upper bound.
        // Marketing cap is 20 seats; above that → custom.
        users: 20,
        prospects: -1,
        campaigns: -1,
        enrichment_credits: 0,
        import_csv_xlsx_max_rows: -1,
        organizations: 1,
    },
    custom: {
        users: -1,
        prospects: -1,
        campaigns: -1,
        enrichment_credits: -1,
        import_csv_xlsx_max_rows: -1,
        organizations: -1,
    },
    demo: {
        users: -1,
        prospects: -1,
        campaigns: -1,
        enrichment_credits: -1,
        import_csv_xlsx_max_rows: -1,
        organizations: -1,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

const CORE_APP_ROUTES: string[] = [
    '/dashboard',
    '/crm',
    '/prospect',
    '/campaigns',
    '/campaigns',
    '/call-sessions',
    '/calendar',
    '/settings',
    '/workflows',
    '/design-1',
    '/design-2',
    '/design-3',
    '/messagerie',
];

export const PLAN_ROUTES: Record<PlanId, string[]> = {
    trial: [...CORE_APP_ROUTES],
    solo: [...CORE_APP_ROUTES],
    team: [...CORE_APP_ROUTES],
    custom: [...CORE_APP_ROUTES],
    demo: [...CORE_APP_ROUTES],
};

// ─────────────────────────────────────────────────────────────────────────────
// Marketing feature bullets (mirrors `marketing/sections/pricing.tsx` — keep in sync)
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_FEATURES_TEXT: Record<PlanId, string[]> = {
    trial: [
        '14 jours offerts sur le plan Solo',
        'Extension Chrome LinkedIn',
        'CRM complet (listes, pipeline, kanban)',
        'Inbox unifiée LinkedIn et WhatsApp',
        'Calendrier avec lien de booking',
        'Jusqu’à 1 000 prospects',
    ],
    solo: [
        'Extension Chrome LinkedIn',
        'CRM complet (listes, pipeline, kanban)',
        'Inbox unifiée LinkedIn et WhatsApp',
        'Calendrier avec lien de booking',
        'Séquences WhatsApp pré et post-RDV',
        'Workflows custom illimités + 3 templates',
        '800 invitations LinkedIn / mois (200/sem.)',
        '1 utilisateur',
    ],
    team: [
        'Tout du plan Solo, plus :',
        'Multi-utilisateurs (3 à 20)',
        'Pipeline kanban partagé',
        'Listes de prospects partagées',
        'Sessions d’appels collaboratives',
        'Dashboard manager équipe',
        'Rôles et permissions granulaires',
        'Support prioritaire (réponse < 24 h)',
    ],
    custom: [
        'Tout du plan Team, plus :',
        'Au-delà de 20 utilisateurs',
        'SSO (Google, Okta, Microsoft)',
        'SLA contractuel + DPA',
        'Intégrations sur-mesure (HubSpot, Salesforce…)',
        'Onboarding accompagné par un CSM',
        'Formation équipe sur site',
        'Facturation virement annuel',
    ],
    demo: ['Accès démo à toutes les fonctionnalités', 'Durée limitée'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Full config
// ─────────────────────────────────────────────────────────────────────────────

export const PLANS_CONFIG: Record<PlanId, PlanConfig> = {
    trial: {
        id: 'trial',
        name: 'Essai gratuit',
        description: '14 jours sur le périmètre Solo (caps essai).',
        limits: PLAN_LIMITS.trial,
        features: { routes: PLAN_ROUTES.trial, features: PLAN_FEATURES_TEXT.trial },
    },
    solo: {
        id: 'solo',
        name: 'Solo',
        description: 'Pour les commerciaux indépendants — 1 utilisateur, tout inclus.',
        limits: PLAN_LIMITS.solo,
        features: { routes: PLAN_ROUTES.solo, features: PLAN_FEATURES_TEXT.solo },
    },
    team: {
        id: 'team',
        name: 'Team',
        description: 'Pour les équipes commerciales — multi-utilisateurs, collab et manager dashboard.',
        limits: PLAN_LIMITS.team,
        features: { routes: PLAN_ROUTES.team, features: PLAN_FEATURES_TEXT.team },
        isRecommended: true,
    },
    custom: {
        id: 'custom',
        name: 'Custom',
        description: 'Pour les équipes au-delà de 20 — SSO, SLA, intégrations sur-mesure.',
        limits: PLAN_LIMITS.custom,
        features: { routes: PLAN_ROUTES.custom, features: PLAN_FEATURES_TEXT.custom },
    },
    demo: {
        id: 'demo',
        name: 'Démo',
        description: 'Compte de démonstration interne (non facturé).',
        limits: PLAN_LIMITS.demo,
        features: { routes: PLAN_ROUTES.demo, features: PLAN_FEATURES_TEXT.demo },
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const VALID_PLAN_IDS: ReadonlySet<PlanId> = new Set<PlanId>([
    'trial',
    'solo',
    'team',
    'custom',
    'demo',
]);

/** Type-guard: narrows an arbitrary string to a known PlanId. */
export function isPlanId(value: string | null | undefined): value is PlanId {
    return typeof value === 'string' && VALID_PLAN_IDS.has(value as PlanId);
}

/** Coerce any value to a PlanId, defaulting to `trial`. */
export function toPlanId(value: string | null | undefined): PlanId {
    return isPlanId(value) ? value : 'trial';
}

/** True for any plan that's actively being paid for (solo|team|custom|demo). */
export function isPaidPlan(value: string | null | undefined): boolean {
    const p = toPlanId(value);
    return p === 'solo' || p === 'team' || p === 'custom' || p === 'demo';
}

/** True for plans where the workspace can hold more than one paying seat. */
export function isMultiSeatPlan(value: string | null | undefined): boolean {
    const p = toPlanId(value);
    return p === 'team' || p === 'custom' || p === 'demo';
}

/** True for plans that should NOT hit Stripe checkout (custom is contact-sales). */
export function isStripeCheckoutPlan(value: string | null | undefined): boolean {
    const p = toPlanId(value);
    return p === 'solo' || p === 'team';
}

export function getPlanLimits(planId: PlanId): PlanLimits {
    return PLAN_LIMITS[planId] || PLAN_LIMITS.trial;
}

export function getPlanRoutes(planId: PlanId): string[] {
    return PLAN_ROUTES[planId] || PLAN_ROUTES.trial;
}

export function canAccessRoute(planId: PlanId, route: string): boolean {
    const normalized = (route.split('?')[0] || '').replace(/\/$/, '') || '/';
    const routes = getPlanRoutes(planId);
    return routes.some(
        (r) => normalized === r || normalized.startsWith(`${r}/`)
    );
}

export function getPlanFeatures(planId: PlanId): string[] {
    return PLAN_FEATURES_TEXT[planId] || PLAN_FEATURES_TEXT.trial;
}

export function getPlanConfig(planId: PlanId): PlanConfig {
    return PLANS_CONFIG[planId] || PLANS_CONFIG.trial;
}

export function checkPlanLimit(
    planId: PlanId,
    resource: keyof PlanLimits,
    currentUsage: number
): { used: number; limit: number; canUse: boolean } {
    const limits = getPlanLimits(planId);
    const limit = limits[resource];

    if (limit === -1) {
        return { used: currentUsage, limit: -1, canUse: true };
    }

    return {
        used: currentUsage,
        limit,
        canUse: currentUsage < limit,
    };
}

export function getImportMaxRows(planId: PlanId): number {
    const limits = getPlanLimits(planId);
    return limits.import_csv_xlsx_max_rows;
}

export function canImportRows(planId: PlanId, numberOfRows: number): boolean {
    const maxRows = getImportMaxRows(planId);
    if (maxRows === -1) {
        return true;
    }
    return numberOfRows <= maxRows;
}
