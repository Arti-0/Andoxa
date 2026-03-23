// Types pour les prospects et scores
export interface Prospect {
  id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  linkedin: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  employees: string | null;
  location: string | null;
  budget: string | null;
  organization_id: string;
  bdd_id: string | null;
  source: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  linked_chat_id?: string | null;
  enriched_at?: string | null;
  enrichment_source?: string | null;
  enrichment_metadata?: {
    profile_picture_url?: string | null;
    work_experience?: unknown;
    education?: unknown;
    skills?: unknown;
    summary?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
}

export interface ProspectScore {
  prospect_id: string;
  organization_id: string;
  score_total: number;
  niveau_final: "Faible" | "Moyen" | "Élevé";
  score_entreprise: number;
  score_contact: number;
  score_digital: number;
  score_alignement: number;
  criteres_detail: string;
  scored_at: string;
}

export interface ProspectWithScore extends Prospect {
  prospect_scores?: ProspectScore[];
  _score?: {
    score_total: number;
    niveau_final: "Faible" | "Moyen" | "Élevé";
  };
}

export interface ScoreResult {
  prospect_id: string;
  success: boolean;
  score?: number;
  level?: "Faible" | "Moyen" | "Élevé";
  error?: string;
}

export interface ScoreProspectInput {
  fullName: string;
  company: string;
  jobTitle: string | null;
  linkedin: string | null;
  email: string | null;
  phone: string | null;
}

// Canonical prospect statuses (DB keys)
export const PROSPECT_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "rdv",
  "proposal",
  "won",
  "lost",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  rdv: "RDV",
  proposal: "Proposition",
  won: "Signé",
  lost: "Perdu",
};

export const PROSPECT_STATUS_COLORS: Record<ProspectStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rdv: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  proposal: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export const PROSPECT_STATUS_DOT_COLORS: Record<ProspectStatus, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  qualified: "bg-green-500",
  rdv: "bg-purple-500",
  proposal: "bg-indigo-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

// Legacy alias
export type PipelineStatusType = ProspectStatus;

export interface ExtendedProspect extends Prospect {
  // Champs pipeline (override parent status with narrower type)
  status: PipelineStatusType | null;
  column?: PipelineStatusType;
  priority?: "low" | "medium" | "high";
  estimated_value?: number | null;
  last_contact?: string | null;

  // Champs UI
  proprietaire_name?: string | null;
  proprietaire_avatar?: string | null;
  bdd_name?: string | null;

  // Champs propriétaire
  proprietaire?: string;
  metadata?: Record<string, unknown> | null;

  // Score IA
  _score?: {
    score_total: number;
    niveau_final: "Faible" | "Moyen" | "Élevé";
  };
}

// Interface pour les données CSV dynamiques
export interface CSVRowData {
  [key: string]: string | number | boolean | null | undefined | object;
}

// Interface pour les colonnes dynamiques
export interface DynamicColumnData extends CSVRowData {
  select?: boolean;
  enrichment_status?: string;
  enrichment?: {
    email_verified?: boolean;
    confidence?: number;
    enriched_at?: string;
  };
  prospect_scores?: {
    score_total: number;
    niveau_final: "Faible" | "Moyen" | "Élevé";
  };
}
