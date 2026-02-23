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

// Types pour le pipeline
export type PipelineStatusType =
  | "nouveau"
  | "rdv"
  | "proposition"
  | "signe"
  | "perdu"
  | "supprime";

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
