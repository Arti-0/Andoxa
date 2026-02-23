/**
 * Hook for fetching real KPI data from Supabase
 *
 * This hook replaces useMockKpiData when real data is available
 * Falls back to mock data if real data fails or is not available
 */
import { useState, useEffect, useMemo } from "react";
import { KpiDataService } from "@/lib/kpi/kpi-data-service";
import { useMockKpiData } from "./use-mock-kpi-data";
import type { KpiValue } from "@/lib/types/dashboard";

interface UseRealKpiDataOptions {
  kpiId: string;
  componentType: string;
  useRealData?: boolean; // Flag to enable/disable real data
}

export function useRealKpiData({
  kpiId,
  componentType,
  useRealData = true,
}: UseRealKpiDataOptions): KpiValue {
  // Get mock data first (always available, no side effects)
  const mockData = useMockKpiData(kpiId, componentType);
  
  const [realData, setRealData] = useState<KpiValue | null>(null);
  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);

  // Only run useEffect if useRealData is true
  useEffect(() => {
    // If useRealData is false, don't fetch and use mock data
    // This check prevents any API calls when using mock data
    if (!useRealData) {
      return;
    }

    // Abort controller to cancel requests if component unmounts or useRealData changes
    const abortController = new AbortController();

    const fetchRealData = async () => {
      // setIsLoading(true);
      // setError(null);

      try {
        const service = new KpiDataService();
        let data: KpiValue;

        // Map KPI IDs to service methods
        switch (kpiId) {
          case "nouveaux-prospects":
            data = await service.getNouveauxProspects();
            break;
          case "nombre-rdv":
            data = await service.getNombreRdv();
            break;
          case "nombre-propositions":
            data = await service.getNombrePropositions();
            break;
          case "nombre-signatures":
            data = await service.getNombreSignatures();
            break;
          case "taux-conversion-prospects-rdv":
            data = await service.getTauxConversionProspectsRdv();
            break;
          case "taux-conversion-rdv-proposition":
            data = await service.getTauxConversionRdvProposition();
            break;
          case "taux-conversion-proposition-signature":
            data = await service.getTauxConversionPropositionSignature();
            break;
          case "montant-moyen-signatures":
            data = await service.getMontantMoyenSignatures();
            break;
          case "prospects-enrichis":
            data = await service.getProspectsEnrichisSeries();
            break;
          case "prospects-scores":
            data = await service.getProspectsScores();
            break;
          case "chiffre-affaires":
            data = await service.getChiffreAffaires();
            break;
          case "taux-fidelisation":
            data = await service.getTauxFidelisation();
            break;
          // Legacy KPIs (kept for backwards compatibility)
          case "leads-genere":
            data = await service.getLeadsGenere();
            break;
          case "prospects-par-statut":
            data = await service.getProspectsByStatus();
            break;
          case "valeur-pipeline":
            data = await service.getValeurPipeline();
            break;
          case "campagnes-actives":
            data = await service.getCampaignesActives();
            break;
          case "campagnes-actives-mois":
            data = await service.getCampagnesActivesMois();
            break;
          case "taux-ouverture":
            data = await service.getTauxOuverture();
            break;
          case "taux-clic":
            data = await service.getTauxClic();
            break;
          case "performance-campagnes":
            data = await service.getPerformanceCampagnes();
            break;
          case "credits-enrichissement":
            data = await service.getCreditsEnrichissement();
            break;
          case "prospects-score-eleve":
            data = await service.getProspectsScoreEleve();
            break;
          case "rdv-commerciaux":
            data = await service.getRdvCommerciaux();
            break;
          case "reponses-non-lues":
            data = await service.getReponsesNonLues();
            break;
          case "types-enrichissement":
            data = await service.getTypesEnrichissement();
            break;
          case "distribution-scores":
            data = await service.getDistributionScores();
            break;
          default:
            // Unknown KPI - use mock data
            setRealData(null);
            return;
        }

        // Only set data if not aborted
        if (!abortController.signal.aborted) {
          setRealData(data);
        }
      } catch (err) {
        // Only log error if not aborted
        if (!abortController.signal.aborted) {
          console.error(`Error fetching real data for ${kpiId}:`, err);
          // setError(err instanceof Error ? err.message : "Unknown error");
          setRealData(null);
        }
      } finally {
        // setIsLoading(false);
      }
    };

    fetchRealData();

    // Cleanup: abort any pending requests when effect re-runs or component unmounts
    return () => {
      abortController.abort();
    };
  }, [kpiId, useRealData]);

  // Return real data if available and useRealData is true, otherwise use mock data
  // Use useMemo to ensure we always return mock data when useRealData is false
  return useMemo(() => {
    if (!useRealData) {
      return mockData;
    }
    return realData || mockData;
  }, [useRealData, realData, mockData]);
}

/**
 * Hook to check if real data is available for a KPI
 */
export function useKpiDataAvailability(kpiId: string): {
  hasRealData: boolean;
  isLoading: boolean;
  error: string | null;
} {
  const [hasRealData, setHasRealData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAvailability = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // const service = new KpiDataService();

        // Check if the service method exists for this KPI
        // const availableMethods = [
        //   "getLeadsGenere",
        //   "getProspectsByStatus",
        //   "getValeurPipeline",
        //   "getCampaignesActives",
        //   "getTauxOuverture",
        //   "getTauxClic",
        //   "getProspectsEnrichis",
        //   "getCreditsEnrichissement",
        //   "getProspectsScoreEleve",
        //   "getRdvCommerciaux",
        //   "getReponsesNonLues",
        //   "getTypesEnrichissement",
        //   "getDistributionScores"
        // ];

        // For now, assume all KPIs have real data available
        // In the future, we could add a method to check data availability
        setHasRealData(true);
      } catch (err) {
        console.error(`Error checking data availability for ${kpiId}:`, err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setHasRealData(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, [kpiId]);

  return { hasRealData, isLoading, error };
}
