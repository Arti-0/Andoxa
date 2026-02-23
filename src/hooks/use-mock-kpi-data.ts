import { useMemo } from "react";
import type { KpiValue } from "@/lib/types/dashboard";

/**
 * Mock KPI Data Hook
 * 
 * Generates realistic mock data for KPI cards with CRM-specific values.
 * Used as fallback when real data is not available.
 * 
 * Features:
 * - Realistic ranges for CRM metrics
 * - Proper data structures per component type
 * - Consistent seeded randomness
 * - Andoxa-specific mock data
 */
export function useMockKpiData(kpiId: string, componentType: string): KpiValue {
  return useMemo(() => {
    const base: KpiValue = {
      id: kpiId,
      value: 0,
      previousValue: 0,
      percentage: 0,
      trend: "stable",
    };

    // Série de base à 0 pour les charts (stacked possible via value / value2)
    if (componentType === "chart") {
      return {
        ...base,
        data: [
          { name: "Jan", value: 0, value2: 0 },
          { name: "Fév", value: 0, value2: 0 },
          { name: "Mar", value: 0, value2: 0 },
          { name: "Avr", value: 0, value2: 0 },
          { name: "Mai", value: 0, value2: 0 },
          { name: "Jun", value: 0, value2: 0 },
        ],
      };
    }

    if (componentType === "list") {
      return {
        ...base,
        items: [],
      };
    }

    // value, gauge, donut, map → simple valeur à 0
    return base;
  }, [kpiId, componentType]);
}

/**
 * Generate mock donut chart data
 */
function generateDonutData(
  kpiId: string,
  random: (min: number, max: number) => number
): KpiValue {
  let data: Array<{ name: string; value: number }> = [];

  switch (kpiId) {
    case "prospects-par-statut":
      data = [
        { name: "Nouveau", value: Math.floor(random(800, 1500)) },
        { name: "Qualifié", value: Math.floor(random(600, 1200)) },
        { name: "En cours", value: Math.floor(random(400, 800)) },
        { name: "Gagné", value: Math.floor(random(300, 600)) },
        { name: "Perdu", value: Math.floor(random(100, 300)) },
      ];
      break;

    case "distribution-scores":
      data = [
        { name: "Faible", value: Math.floor(random(300, 600)) },
        { name: "Moyen", value: Math.floor(random(800, 1500)) },
        { name: "Élevé", value: Math.floor(random(600, 1200)) },
      ];
      break;

    case "types-enrichissement":
      data = [
        { name: "Email", value: Math.floor(random(600, 1200)) },
        { name: "Phone", value: Math.floor(random(300, 800)) },
        { name: "Email + Phone", value: Math.floor(random(500, 1000)) },
      ];
      break;

    default:
      data = [
        { name: "Catégorie A", value: Math.floor(random(50, 150)) },
        { name: "Catégorie B", value: Math.floor(random(30, 120)) },
        { name: "Catégorie C", value: Math.floor(random(20, 100)) },
        { name: "Autres", value: Math.floor(random(10, 50)) },
      ];
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return {
    id: kpiId,
    value: total,
    data,
  };
}

/**
 * Generate mock chart data (time series)
 */
function generateChartData(
  kpiId: string,
  random: (min: number, max: number) => number
): KpiValue {
  // Generate 6 periods of historical data
  const periods = ["Il y a 5 mois", "Il y a 4 mois", "Il y a 3 mois", "Il y a 2 mois", "Il y a 1 mois", "Mois actuel"];

  if (kpiId === "performance-campagnes") {
    // Courbe réaliste avec vos valeurs exactes
    const data = [
      { name: "Il y a 5 mois", value: 65, "Taux d'ouverture": 65, "Taux de clic": 8.2 },
      { name: "Il y a 4 mois", value: 48, "Taux d'ouverture": 48, "Taux de clic": 6.1 },
      { name: "Il y a 3 mois", value: 72, "Taux d'ouverture": 72, "Taux de clic": 9.8 },
      { name: "Il y a 2 mois", value: 58, "Taux d'ouverture": 58, "Taux de clic": 7.5 },
      { name: "Il y a 1 mois", value: 85, "Taux d'ouverture": 85, "Taux de clic": 12.2 },
      { name: "Mois actuel", value: 94, "Taux d'ouverture": 94, "Taux de clic": 14.8 },
    ];

    return {
      id: kpiId,
      value: data[data.length - 1].value,
      trend: "up",
      data,
    };
  } else {
    // Generate historical data with trend
    const baseValue = Math.floor(random(200, 800));
    const data = periods.map((period, index) => {
      // Create a trend: values increase slightly over time
      const trendFactor = 1 + (index * 0.1);
      const variation = random(0.85, 1.15);
      return {
        name: period,
        value: Math.floor(baseValue * trendFactor * variation),
      };
    });

    return {
      id: kpiId,
      value: data[data.length - 1].value,
      trend: data[data.length - 1].value > data[0].value ? "up" : "down",
      data,
    };
  }
}
