/**
 * Error Logger - Re-exports from centralized logger
 * 
 * This file exists for backwards compatibility.
 * New code should import directly from '@/lib/utils/logger'
 */

import { logger, logError, logInfo, logWarn, logDebug, type LogContext } from "@/lib/utils/logger";

// Type alias for backwards compatibility
type ErrorContext = LogContext;

// Re-export the logger as errorLogger for backwards compatibility
export const errorLogger = {
  debug: (message: string, context?: ErrorContext) => logger.debug(message, context),
  info: (message: string, context?: ErrorContext) => logger.info(message, context),
  warn: (message: string, context?: ErrorContext) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: ErrorContext) => logger.error(message, error, context),

  // Specialized methods for backwards compatibility
  apiError: (endpoint: string, status: number, message: string, context?: ErrorContext) => {
    logger.error(`API Error: ${endpoint} returned ${status}`, undefined, {
      ...context,
      action: "api_call",
      metadata: { endpoint, status },
    });
  },

  databaseError: (operation: string, message: string, context?: ErrorContext) => {
    logger.error(`Database Error: ${operation} failed`, undefined, {
      ...context,
      action: "database_operation",
      metadata: { operation },
    });
  },

  authError: (message: string, context?: ErrorContext) => {
    logger.error(`Auth Error: ${message}`, undefined, {
      ...context,
      action: "authentication",
    });
  },

  stripeError: (operation: string, message: string, context?: ErrorContext) => {
    logger.error(`Stripe Error: ${operation} failed`, undefined, {
      ...context,
      action: "stripe_operation",
      metadata: { operation },
    });
  },

  enrichmentError: (prospectId: string, message: string, context?: ErrorContext) => {
    logger.error(`Enrichment Error: ${message}`, undefined, {
      ...context,
      action: "enrichment",
      metadata: { prospectId },
    });
  },
};

// Re-export utility functions
export { logError, logInfo, logWarn, logDebug };
