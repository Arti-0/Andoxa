/**
 * Best-effort client IP for rate-limiting unauthenticated routes. Mirrors the
 * identifier `createApiHandler` falls back to (`lib/api/handlers.ts`). Vercel
 * sets `x-forwarded-for` (client first, proxies after); we take the leftmost.
 * Returns "unknown" when absent so callers always get a usable bucket key.
 */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}
