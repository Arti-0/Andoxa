/**
 * Color Utilities
 *
 * Helper functions to map hardcoded colors to semantic Shadcn tokens.
 * This ensures consistent color usage across the application.
 */

/**
 * Status color mapping
 *
 * Maps status values to semantic color variants
 */
export type StatusType = 'new' | 'contacted' | 'qualified' | 'lost' | 'won';

export const STATUS_COLOR_MAP: Record<StatusType, {
  bg: string;
  text: string;
  variant: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}> = {
  new: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    variant: 'primary',
  },
  contacted: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
    variant: 'warning',
  },
  qualified: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    variant: 'success',
  },
  lost: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    variant: 'destructive',
  },
  won: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    variant: 'success',
  },
};

/**
 * Get status color classes
 *
 * Returns the appropriate color classes for a given status
 */
export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase() as StatusType;
  const colorMap = STATUS_COLOR_MAP[statusLower];

  if (colorMap) {
    return `${colorMap.bg} ${colorMap.text}`;
  }

  // Fallback to muted for unknown statuses
  return 'bg-muted text-muted-foreground';
}

/**
 * Semantic text color variants
 */
export function getSemanticTextColor(
  variant: 'default' | 'muted' | 'primary' | 'destructive' | 'accent'
): string {
  const map = {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
    destructive: 'text-destructive',
    accent: 'text-accent-foreground',
  };

  return map[variant];
}

/**
 * Semantic background color variants
 */
export function getSemanticBgColor(
  variant: 'default' | 'muted' | 'accent' | 'card' | 'primary' | 'destructive'
): string {
  const map = {
    default: 'bg-background',
    muted: 'bg-muted',
    accent: 'bg-accent',
    card: 'bg-card',
    primary: 'bg-primary',
    destructive: 'bg-destructive',
  };

  return map[variant];
}

/**
 * Semantic border color variants
 */
export function getSemanticBorderColor(
  variant: 'default' | 'muted' | 'primary' | 'destructive'
): string {
  const map = {
    default: 'border-border',
    muted: 'border-muted',
    primary: 'border-primary',
    destructive: 'border-destructive',
  };

  return map[variant];
}

/**
 * Color replacement mappings
 *
 * Maps hardcoded color classes to semantic equivalents
 */
export const COLOR_REPLACEMENTS = {
  // Slate colors → Semantic tokens
  'text-slate-900': 'text-foreground',
  'text-slate-800': 'text-foreground',
  'text-slate-700': 'text-foreground',
  'text-slate-600': 'text-muted-foreground',
  'text-slate-500': 'text-muted-foreground',
  'text-slate-400': 'text-muted-foreground/60',
  'text-slate-300': 'text-muted-foreground',

  'bg-slate-900': 'bg-card',
  'bg-slate-800': 'bg-card',
  'bg-slate-700': 'bg-muted',
  'bg-slate-100': 'bg-muted',
  'bg-slate-50': 'bg-muted',

  'border-slate-700': 'border-border',
  'border-slate-600': 'border-border',
  'border-slate-300': 'border-border',
  'border-slate-200': 'border-border',
  'border-slate-100': 'border-border',

  // Orange colors → Primary (orange is the primary color)
  'text-orange-500': 'text-primary',
  'text-orange-400': 'text-primary',
  'bg-orange-400': 'bg-primary',
  'bg-orange-500': 'bg-primary',

  // Blue colors → Primary or accent (depending on context)
  'text-blue-600': 'text-primary',
  'text-blue-400': 'text-primary',
  'bg-blue-600': 'bg-primary',
  'bg-blue-50': 'bg-primary/10',
  'bg-blue-100': 'bg-primary/10',
  'border-blue-600': 'border-primary',
  'border-blue-400': 'border-primary',
  'border-blue-200': 'border-primary/20',
  'border-blue-800': 'border-primary',

  // Green colors → Success (for status indicators)
  'text-green-500': 'text-green-600 dark:text-green-400', // Keep green for success
  'text-green-400': 'text-green-600 dark:text-green-400',
  'bg-green-100': 'bg-green-100 dark:bg-green-900/30', // Keep for status badges
  'bg-green-50': 'bg-green-50 dark:bg-green-900/20',

  // Red colors → Destructive
  'text-red-600': 'text-destructive',
  'text-red-400': 'text-destructive',
  'bg-red-50': 'bg-destructive/10',
  'bg-red-100': 'bg-destructive/10',
  'border-red-200': 'border-destructive/20',
  'border-red-800': 'border-destructive',

  // Yellow colors → Warning (keep for status)
  'text-yellow-800': 'text-yellow-800 dark:text-yellow-300',
  'bg-yellow-100': 'bg-yellow-100 dark:bg-yellow-900/30',

  // White/Black → Background/Card
  'bg-white': 'bg-background',
  'bg-black': 'bg-background',
  'text-black': 'text-foreground',
} as const;
