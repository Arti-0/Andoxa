/**
 * Configuration centralisée des plans et limites
 *
 * Ce fichier centralise toutes les informations sur les plans :
 * - Limites (utilisateurs, prospects, campagnes, crédits, imports)
 * - Fonctionnalités (routes, features)
 * - Pricing (défini dans stripe-config.ts mais référencé ici)
 *
 * Pour ajouter une fonctionnalité à un plan, ajoutez-la dans features[planId]
 * Pour modifier une limite, changez la valeur dans limits[planId]
 */

export type PlanId = "trial" | "essential" | "pro" | "business" | "demo";

export interface PlanLimits {
  users: number; // -1 pour illimité
  prospects: number; // -1 pour illimité
  campaigns: number; // -1 pour illimité
  enrichment_credits: number; // -1 pour illimité
  import_csv_xlsx_max_rows: number; // Limite de lignes pour import CSV/XLSX (-1 pour illimité)
  organizations: number; // -1 pour illimité (nombre d'organizations qu'un utilisateur peut créer)
}

export interface PlanFeatures {
  // Routes de navigation (pour contrôler l'accès dans la sidebar)
  routes: string[];
  // Fonctionnalités textuelles (pour affichage dans pricing/step2)
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

/**
 * Limites par plan
 */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  trial: {
    // Trial = Essential avec 14 jours gratuits, mêmes limites que Essential
    users: 2,
    prospects: 1000,
    campaigns: 5,
    enrichment_credits: 0,
    import_csv_xlsx_max_rows: -1, // Pas de limite sur les lignes, mais limité par prospects totaux
    organizations: 1,
  },
  essential: {
    users: 2,
    prospects: -1,
    campaigns: -1,
    enrichment_credits: 0,
    import_csv_xlsx_max_rows: -1, // Pas de limite sur les lignes, mais limité par prospects totaux
    organizations: 1,
  },
  pro: {
    users: 10,
    prospects: -1,
    campaigns: -1,
    enrichment_credits: 500,
    import_csv_xlsx_max_rows: -1, // Pas de limite sur les lignes, mais limité par prospects totaux (5000)
    organizations: 3,
  },
  business: {
    users: 30,
    prospects: -1, // Illimité
    campaigns: -1,
    enrichment_credits: 1000,
    import_csv_xlsx_max_rows: -1, // Pas de limite sur les lignes (prospects illimités)
    organizations: 5,
  },
  demo: {
    users: -1, // Illimité pendant la démo
    prospects: -1,
    campaigns: -1,
    enrichment_credits: -1, // Basé sur les crédits réels disponibles
    import_csv_xlsx_max_rows: -1,
    organizations: -1,
  },
};

/**
 * Routes de l’app (protected) accessibles selon le plan.
 * Pro / Business : messagerie centralisée + modèles (onglet Templates dans /messagerie).
 */
const CORE_APP_ROUTES: string[] = [
  "/dashboard",
  "/crm",
  "/prospect",
  "/campaigns",
  "/call-sessions",
  "/calendar",
  "/calendar-2",
  "/settings",
  "/whatsapp",
  "/design-1",
  "/design-2",
  "/design-3",
];

const PRO_PLUS_EXTRA = ["/messagerie"];

export const PLAN_ROUTES: Record<PlanId, string[]> = {
  trial: [...CORE_APP_ROUTES],
  essential: [...CORE_APP_ROUTES],
  pro: [...CORE_APP_ROUTES, ...PRO_PLUS_EXTRA],
  business: [...CORE_APP_ROUTES, ...PRO_PLUS_EXTRA],
  demo: [...CORE_APP_ROUTES, ...PRO_PLUS_EXTRA],
};

/**
 * Fonctionnalités textuelles par plan (pour affichage dans pricing/step2)
 */
export const PLAN_FEATURES_TEXT: Record<PlanId, string[]> = {
  trial: [
    "14 jours d'essai Stripe sur le plan Essential",
    "CRM, import et listes",
    "Campagnes et sessions d'appels",
    "Calendrier",
    "Jusqu'à 1 000 prospects",
    "2 utilisateurs",
  ],
  essential: [
    "CRM, import et listes",
    "Campagnes (LinkedIn / multicanal)",
    "Sessions d'appels",
    "Calendrier",
    "Prospects illimités (hors période d'essai)",
    "2 utilisateurs · 1 organisation",
  ],
  pro: [
    "Tout Essential",
    "Messagerie centralisée LinkedIn et WhatsApp",
    "500 crédits d'enrichissement / mois",
    "Enrichissement automatique à l'import (opt-in)",
    "Modèles de messages pour campagnes",
    "Jusqu'à 10 utilisateurs · 3 organisations",
  ],
  business: [
    "Tout Pro",
    "1 000 crédits d'enrichissement / mois",
    "Limites étendues : 30 utilisateurs · 5 organisations",
    "Support prioritaire",
  ],
  demo: [
    "Accès démo aux fonctionnalités Pro / Business",
    "Durée limitée",
  ],
};

/**
 * Configuration complète des plans
 */
export const PLANS_CONFIG: Record<PlanId, PlanConfig> = {
  trial: {
    id: "trial",
    name: "Essai Gratuit",
    description: "14 jours sur le périmètre Essential (limites d'essai)",
    limits: PLAN_LIMITS.trial,
    features: {
      routes: PLAN_ROUTES.trial,
      features: PLAN_FEATURES_TEXT.trial,
    },
  },
  essential: {
    id: "essential",
    name: "Essential",
    description: "CRM, campagnes et appels — sans messagerie centralisée.",
    limits: PLAN_LIMITS.essential,
    features: {
      routes: PLAN_ROUTES.essential,
      features: PLAN_FEATURES_TEXT.essential,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Messagerie centralisée, enrichissement et modèles — pour équipes qui scalent.",
    limits: PLAN_LIMITS.pro,
    features: {
      routes: PLAN_ROUTES.pro,
      features: PLAN_FEATURES_TEXT.pro,
    },
    isRecommended: true,
  },
  business: {
    id: "business",
    name: "Business",
    description: "Tout Pro, plus de crédits et de sièges pour les grandes équipes.",
    limits: PLAN_LIMITS.business,
    features: {
      routes: PLAN_ROUTES.business,
      features: PLAN_FEATURES_TEXT.business,
    },
  },
  demo: {
    id: "demo",
    name: "Démo",
    description: "Période d'essai démo avec toutes les fonctionnalités",
    limits: PLAN_LIMITS.demo,
    features: {
      routes: PLAN_ROUTES.demo,
      features: PLAN_FEATURES_TEXT.demo,
    },
  },
};

/**
 * Helper functions
 */

/**
 * Obtenir les limites d'un plan
 */
export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLAN_LIMITS[planId] || PLAN_LIMITS.trial;
}

/**
 * Obtenir les routes disponibles pour un plan
 */
export function getPlanRoutes(planId: PlanId): string[] {
  return PLAN_ROUTES[planId] || PLAN_ROUTES.trial;
}

/**
 * Vérifier si une route est accessible pour un plan
 */
export function canAccessRoute(planId: PlanId, route: string): boolean {
  const normalized = (route.split("?")[0] || "").replace(/\/$/, "") || "/";
  const routes = getPlanRoutes(planId);
  return routes.some(
    (r) => normalized === r || normalized.startsWith(`${r}/`)
  );
}

/**
 * Obtenir les fonctionnalités textuelles d'un plan
 */
export function getPlanFeatures(planId: PlanId): string[] {
  return PLAN_FEATURES_TEXT[planId] || PLAN_FEATURES_TEXT.trial;
}

/**
 * Obtenir la configuration complète d'un plan
 */
export function getPlanConfig(planId: PlanId): PlanConfig {
  return PLANS_CONFIG[planId] || PLANS_CONFIG.trial;
}

/**
 * Vérifier si un plan peut utiliser une limite
 * @param planId Plan ID
 * @param resource Type de ressource (users, prospects, campaigns, enrichment_credits)
 * @param currentUsage Utilisation actuelle
 * @returns Object avec used, limit, canUse
 */
export function checkPlanLimit(
  planId: PlanId,
  resource: keyof PlanLimits,
  currentUsage: number
): { used: number; limit: number; canUse: boolean } {
  const limits = getPlanLimits(planId);
  const limit = limits[resource];

  // -1 signifie illimité
  if (limit === -1) {
    return {
      used: currentUsage,
      limit: -1,
      canUse: true,
    };
  }

  return {
    used: currentUsage,
    limit,
    canUse: currentUsage < limit,
  };
}

/**
 * Obtenir le nombre maximum de lignes qu'on peut importer pour un plan
 * Note: Cette limite s'applique AVANT la vérification de la limite de prospects
 */
export function getImportMaxRows(planId: PlanId): number {
  const limits = getPlanLimits(planId);
  return limits.import_csv_xlsx_max_rows;
}

/**
 * Vérifier si on peut importer un nombre de lignes donné
 */
export function canImportRows(planId: PlanId, numberOfRows: number): boolean {
  const maxRows = getImportMaxRows(planId);
  // -1 signifie pas de limite sur les lignes
  if (maxRows === -1) {
    return true;
  }
  return numberOfRows <= maxRows;
}

