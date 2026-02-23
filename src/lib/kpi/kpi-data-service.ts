import { createClient } from "@/lib/supabase/client";
import type { KpiValue } from "@/lib/types/dashboard";

/** Default stub KPI value for unimplemented methods */
function defaultKpi(id: string, withData = false): KpiValue {
  return {
    id,
    value: 0,
    trend: "stable",
    ...(withData && { data: [] }),
  };
}

/**
 * Minimal stub for KPI data service.
 * Each method returns default values until real Supabase queries are implemented.
 */
export class KpiDataService {
  private supabase = createClient();

  async getNouveauxProspects(): Promise<KpiValue> {
    return defaultKpi("nouveaux-prospects");
  }

  async getNombreRdv(): Promise<KpiValue> {
    return defaultKpi("nombre-rdv");
  }

  async getNombrePropositions(): Promise<KpiValue> {
    return defaultKpi("nombre-propositions");
  }

  async getNombreSignatures(): Promise<KpiValue> {
    return defaultKpi("nombre-signatures");
  }

  async getTauxConversionProspectsRdv(): Promise<KpiValue> {
    return defaultKpi("taux-conversion-prospects-rdv");
  }

  async getTauxConversionRdvProposition(): Promise<KpiValue> {
    return defaultKpi("taux-conversion-rdv-proposition");
  }

  async getTauxConversionPropositionSignature(): Promise<KpiValue> {
    return defaultKpi("taux-conversion-proposition-signature");
  }

  async getMontantMoyenSignatures(): Promise<KpiValue> {
    return defaultKpi("montant-moyen-signatures");
  }

  async getProspectsEnrichisSeries(): Promise<KpiValue> {
    return defaultKpi("prospects-enrichis", true);
  }

  async getProspectsScores(): Promise<KpiValue> {
    return defaultKpi("prospects-scores", true);
  }

  async getChiffreAffaires(): Promise<KpiValue> {
    return defaultKpi("chiffre-affaires");
  }

  async getTauxFidelisation(): Promise<KpiValue> {
    return defaultKpi("taux-fidelisation");
  }

  async getLeadsGenere(): Promise<KpiValue> {
    return defaultKpi("leads-genere");
  }

  async getProspectsByStatus(): Promise<KpiValue> {
    return defaultKpi("prospects-par-statut", true);
  }

  async getValeurPipeline(): Promise<KpiValue> {
    return defaultKpi("valeur-pipeline");
  }

  async getCampaignesActives(): Promise<KpiValue> {
    return defaultKpi("campagnes-actives");
  }

  async getCampagnesActivesMois(): Promise<KpiValue> {
    return defaultKpi("campagnes-actives-mois", true);
  }

  async getTauxOuverture(): Promise<KpiValue> {
    return defaultKpi("taux-ouverture");
  }

  async getTauxClic(): Promise<KpiValue> {
    return defaultKpi("taux-clic");
  }

  async getCreditsEnrichissement(): Promise<KpiValue> {
    return defaultKpi("credits-enrichissement");
  }

  async getProspectsScoreEleve(): Promise<KpiValue> {
    return defaultKpi("prospects-score-eleve");
  }

  async getRdvCommerciaux(): Promise<KpiValue> {
    return defaultKpi("rdv-commerciaux");
  }

  async getReponsesNonLues(): Promise<KpiValue> {
    return defaultKpi("reponses-non-lues");
  }

  async getPerformanceCampagnes(): Promise<KpiValue> {
    return defaultKpi("performance-campagnes", true);
  }

  async getTypesEnrichissement(): Promise<KpiValue> {
    return defaultKpi("types-enrichissement", true);
  }

  async getDistributionScores(): Promise<KpiValue> {
    return defaultKpi("distribution-scores", true);
  }
}
