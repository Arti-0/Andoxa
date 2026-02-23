/**
 * Centralized Logger - Security-focused logging utility
 * Automatically redacts sensitive information and respects environment settings
 * Uses console logging - Vercel captures these logs automatically
 */

export interface LogContext {
  [key: string]: unknown;
}

// Fields that should be redacted from logs
const SENSITIVE_FIELDS = [
  "password",
  "token",
  "secret",
  "key",
  "authorization",
  "auth",
  "phone",
  "ssn",
  "credit",
  "card",
];

function redactSensitive(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  const redacted = { ...(data as Record<string, unknown>) };

  for (const key in redacted) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      redacted[key] = "***REDACTED***";
    } else if (typeof redacted[key] === "object" && redacted[key] !== null) {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }

  return redacted;
}

function formatMessage(level: string, message: string): string {
  const timestamp = new Date().toISOString();
  const env = process.env.NODE_ENV === "development" ? "DEV" : "PROD";
  return `[${timestamp}] [${env}] [${level.toUpperCase()}] ${message}`;
}

function shouldLog(level: string): boolean {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) return true;

  const priority: Record<string, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  const logLevel = process.env.NEXT_PUBLIC_LOG_LEVEL || "error";
  const currentPriority = priority[logLevel] || 3;
  const logPriority = priority[level] || 3;

  return logPriority >= currentPriority;
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!shouldLog("debug")) return;

    const formatted = formatMessage("debug", message);
    const redactedContext = context ? redactSensitive(context) : undefined;

    console.debug(formatted, redactedContext ?? "");
  },

  info(message: string, context?: LogContext): void {
    if (!shouldLog("info")) return;

    const formatted = formatMessage("info", message);
    const redactedContext = context ? redactSensitive(context) : undefined;

    console.info(formatted, redactedContext ?? "");
  },

  warn(message: string, context?: LogContext): void {
    if (!shouldLog("warn")) return;

    const formatted = formatMessage("warn", message);
    const redactedContext = context ? redactSensitive(context) : undefined;

    console.warn(formatted, redactedContext ?? "");
  },

  error(message: string, error?: unknown, context?: LogContext): void {
    if (!shouldLog("error")) return;

    const formatted = formatMessage("error", message);
    const redactedContext = context ? redactSensitive(context) : undefined;

    console.error(formatted, error ?? "", redactedContext ?? "");
  },
};

// Utility functions for convenience
export const logDebug = (message: string, context?: LogContext) =>
  logger.debug(message, context);

export const logInfo = (message: string, context?: LogContext) =>
  logger.info(message, context);

export const logWarn = (message: string, context?: LogContext) =>
  logger.warn(message, context);

export const logError = (
  message: string,
  error?: unknown,
  context?: LogContext
) => logger.error(message, error, context);
