/**
 * Formatting utilities for charts and KPI displays
 */

/**
 * Format number with French locale (spaces for thousands)
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

/**
 * Format currency in euros
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with K, M suffixes
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return formatNumber(value);
}

/**
 * Format large currency with K, M suffixes
 */
export function formatCompactCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M€`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K€`;
  }
  return formatCurrency(value);
}

/**
 * Format date in French format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format month name in French
 */
export function formatMonth(month: number): string {
  const months = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
  ];
  return months[month] || '';
}

/**
 * Get value formatter based on KPI type
 */
export function getKPIFormatter(kpiId: string): (value: number) => string {
  // Currency KPIs
  if (kpiId.includes('valeur') || kpiId.includes('ca-') || kpiId.includes('cout')) {
    return formatCompactCurrency;
  }

  // Percentage/Rate KPIs
  if (kpiId.includes('taux') || kpiId.includes('rate') || kpiId.includes('score-moyen')) {
    return (value) => formatPercentage(value, 1);
  }

  // Default: formatted number
  return formatNumber;
}

