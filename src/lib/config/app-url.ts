/**
 * Resolve the app origin for redirects and OAuth callbacks.
 *
 * In local development we must never send users to a production
 * NEXT_PUBLIC_APP_URL (e.g. https://andoxa.fr) — always prefer the
 * incoming request / browser origin instead.
 */

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isLocalAppUrl(url: string): boolean {
  try {
    return isLocalHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

type RequestLike = {
  nextUrl?: { origin: string };
  url?: string;
  headers?: { get(name: string): string | null };
};

/** Server-side origin for redirects (proxy, auth callbacks, etc.). */
export function resolveAppOrigin(request?: RequestLike): string {
  const requestOrigin =
    request?.nextUrl?.origin ??
    (request?.url ? new URL(request.url).origin : undefined);

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (process.env.NODE_ENV === "development") {
    if (requestOrigin) return requestOrigin;
    if (envUrl && isLocalAppUrl(envUrl)) return envUrl;
    return "http://localhost:3000";
  }

  if (envUrl) return envUrl;

  if (request?.headers) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost) {
      return `${forwardedProto === "https" ? "https" : "http"}://${forwardedHost}`;
    }
  }

  return requestOrigin ?? "https://andoxa.fr";
}

/** Client-side origin for OAuth redirectTo and similar. */
export function resolveClientAppOrigin(): string {
  if (typeof window !== "undefined") {
    // Always stay on the origin the user is actually on: localhost → localhost,
    // andoxa.fr → andoxa.fr, preview → preview. Preferring NEXT_PUBLIC_APP_URL
    // here is what bounced signup-confirm / OAuth callbacks across domains and
    // left the browser extension (configured for one origin) unable to connect.
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}
