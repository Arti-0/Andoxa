import * as Sentry from "@sentry/nextjs";

export type RouteErrorContext = {
  userId?: string | null;
  extra?: Record<string, unknown>;
};

/**
 * Logs to stderr and reports to Sentry with a stable route tag.
 * Use for API/cron handlers outside `createApiHandler` where errors would otherwise only hit the console.
 */
export function captureRouteError(
  route: string,
  error: unknown,
  context?: RouteErrorContext,
  log: "error" | "warn" = "error"
): void {
  if (log === "warn") console.warn(`[${route}]`, error);
  else console.error(`[${route}]`, error);
  Sentry.captureException(error, {
    tags: { route },
    ...(context?.userId
      ? { user: { id: context.userId } }
      : {}),
    ...(context?.extra && Object.keys(context.extra).length > 0
      ? { extra: context.extra }
      : {}),
  });
}
