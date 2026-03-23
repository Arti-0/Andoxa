/**
 * Configuration d'environnement centralisée
 * Gère la différence entre dev et prod de manière claire
 */

export type Environment = "development" | "production" | "test";

export interface EnvironmentConfig {
  // Environnement
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;

  // Debug
  debugMode: boolean;
  logLevel: "debug" | "info" | "warn" | "error";

  // URLs
  appUrl: string;
  apiUrl: string;

  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;

  // Stripe
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
  stripeMode: "test" | "live";

  // SendGrid
  sendgridApiKey: string;
  sendgridFromEmail: string;
  sendgridFromName: string;

  // Redis
  redisUrl: string;
  redisToken: string;

  // Sentry
  sentryDsn: string;

  // APIs externes
  openrouterApiKey: string;
  dropcontactApiKey: string;
}

function getStripeMode(): "test" | "live" {
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  return secretKey.startsWith("sk_live_") ? "live" : "test";
  }

function loadConfig(): EnvironmentConfig {
  const environment =
    (process.env.NODE_ENV as Environment) || "development";
  const isDevelopment = environment === "development";
  const isProduction = environment === "production";
  const isTest = environment === "test";

    return {
      // Environnement
      environment,
      isDevelopment,
      isProduction,
      isTest,

      // Debug
      debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === "true",
      logLevel:
        (process.env.NEXT_PUBLIC_LOG_LEVEL as
          | "debug"
          | "info"
          | "warn"
          | "error") || "error",

      // URLs
      appUrl:
        process.env.NEXT_PUBLIC_APP_URL ||
        (isDevelopment ? "http://localhost:3000" : "https://andoxa.fr"),
      apiUrl:
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        (isDevelopment ? "http://localhost:3000" : "https://andoxa.fr"),

      // Supabase
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "",

      // Stripe
      stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
      stripePublishableKey:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
      stripeMode: getStripeMode(),

      // SendGrid
      sendgridApiKey: process.env.SENDGRID_API_KEY || "",
      sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@andoxa.fr",
      sendgridFromName: process.env.SENDGRID_FROM_NAME || "Andoxa",

      // Redis
      redisUrl: process.env.UPSTASH_REDIS_REST_URL || "",
      redisToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",

      // Sentry
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

      // APIs externes
      openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
      dropcontactApiKey: process.env.DROPCONTACT_API_KEY || "",
    };
  }

// Singleton config instance
let configInstance: EnvironmentConfig | null = null;

function getConfig(): EnvironmentConfig {
  if (!configInstance) {
    configInstance = loadConfig();
    }
  return configInstance;
    }

// Environment manager with utility methods
export const env = {
  getConfig,

  getSupabaseConfig() {
    const config = getConfig();
    return {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      supabaseServiceRoleKey: config.supabaseServiceRoleKey,
    };
  },

  getStripeConfig() {
    const config = getConfig();
    return {
      secretKey: config.stripeSecretKey,
      publishableKey: config.stripePublishableKey,
      webhookSecret: config.stripeWebhookSecret,
      mode: config.stripeMode,
    };
  },

  getSendGridConfig() {
    const config = getConfig();
    return {
      apiKey: config.sendgridApiKey,
      fromEmail: config.sendgridFromEmail,
      fromName: config.sendgridFromName,
    };
  },

  getRedisConfig() {
    const config = getConfig();
    return {
      url: config.redisUrl,
      token: config.redisToken,
    };
  },

  isFeatureEnabled(feature: string): boolean {
    const config = getConfig();
    const featureFlag =
      process.env[`NEXT_PUBLIC_FEATURE_${feature.toUpperCase()}`];
    return (
      featureFlag === "true" ||
      (config.isDevelopment && featureFlag !== "false")
    );
  },

  getApiEndpoint(endpoint: string): string {
    const config = getConfig();
    return `${config.apiUrl}/api${endpoint}`;
  },
};

// Export config for direct access
export const config = getConfig();

// Utility functions
export const isDevelopment = () => config.isDevelopment;
export const isProduction = () => config.isProduction;
export const isTest = () => config.isTest;
export const isDebugMode = () => config.debugMode;
