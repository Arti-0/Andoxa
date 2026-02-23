/**
 * Type definitions for the simple KPI dashboard
 * These types define the structure of KPI data and configuration
 */

export interface KpiData {
  id: string;
  Statut: "Principal" | "Secondaire";
  KPI: string;
  Objectif: string;
  Représentation: string;
  Fréquence: string;
  defaultSize: {
    w: number; // Grid width units (1-12)
    h: number; // Grid height units
  };
  component: "value" | "gauge" | "chart" | "donut" | "list" | "map";
  hasRealData?: boolean; // Flag to enable real data instead of mock
  dataSource?: string; // Database table source for real data
}

/**
 * Mock data structure for KPI values
 * In a real app, this would come from an API
 */
export interface KpiValue {
  id: string;
  value: number | string;
  previousValue?: number | string;
  percentage?: number;
  trend?: "up" | "down" | "stable";
  data?: Array<{
    name: string;
    value: number;
    [key: string]: string | number;
  }>;
  items?: string[];
}

/**
 * Component props for individual KPI cards
 */
export interface KpiCardProps {
  kpi: KpiData;
  value?: KpiValue;
  className?: string;
}

/**
 * Props for the main dashboard grid
 */
export interface DashboardGridProps {
  kpis: KpiData[];
  className?: string;
}
