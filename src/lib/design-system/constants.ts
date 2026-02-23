/**
 * Design System Constants
 *
 * Centralized constants for the design system to eliminate "magic values"
 * and ensure consistency across the application.
 */

/**
 * Z-index scale
 *
 * Defines the layering system for the application:
 * - header: Fixed headers and navigation bars
 * - sidebar: Side navigation panels
 * - modal: Dialogs, modals, and overlays
 * - tooltip: Tooltips and popovers
 * - notification: Toast notifications and alerts
 */
export const Z_INDEX = {
  header: 30,
  sidebar: 40,
  modal: 50,
  tooltip: 60,
  notification: 70,
} as const;

/**
 * Spacing scale (in pixels, multiples of 4)
 *
 * Standard spacing values following Tailwind's scale
 */
export const SPACING = {
  xs: 4,   // 0.25rem
  sm: 6,   // 0.375rem (not standard Tailwind, but used in design)
  md: 8,   // 0.5rem
  lg: 12,  // 0.75rem
  xl: 16,  // 1rem
  '2xl': 24, // 1.5rem
} as const;

/**
 * Width constants
 *
 * Common width values used throughout the application
 */
export const WIDTHS = {
  header: 'calc(100% - 6rem)', // Header with 3rem margin on each side
  container: 'max-w-7xl',
  sidebar: 'w-64',
  sidebarCollapsed: 'w-16',
} as const;

/**
 * Height constants
 *
 * Common height values used throughout the application
 */
export const HEIGHTS = {
  screen: 'min-h-screen',
  viewport: 'min-h-svh',
  header: 'h-16',
  input: 'h-10',
  button: 'h-10',
} as const;

/**
 * Type exports for better TypeScript support
 */
export type ZIndexKey = keyof typeof Z_INDEX;
export type SpacingKey = keyof typeof SPACING;
export type WidthKey = keyof typeof WIDTHS;
export type HeightKey = keyof typeof HEIGHTS;
