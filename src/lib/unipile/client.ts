/**
 * Unipile API client – proxy for messaging (LinkedIn, etc.)
 *
 * Env (required in production):
 * - UNIPILE_API_URL: base URL from Unipile dashboard DSN (e.g. https://api2.unipile.com:13219)
 * - UNIPILE_API_KEY: access token
 *
 * Auth: X-API-KEY header
 */

import {
  UNIPILE_ERROR_MESSAGES,
  type UnipileError,
} from "./types";

const UNIPILE_API_PATH = "/api/v1";

let cachedApiRoot: string | null = null;

/**
 * Unipile host root without path (no trailing slash), e.g. https://api2.unipile.com:13219
 */
export function getUnipileApiRoot(): string {
  if (cachedApiRoot) return cachedApiRoot;
  const raw = process.env.UNIPILE_API_URL?.trim();
  if (!raw) {
    throw new Error(
      "UNIPILE_API_URL is not configured. Set it to your Unipile DSN from the dashboard (e.g. https://api2.unipile.com:13219)."
    );
  }
  const withScheme = raw.startsWith("http")
    ? raw
    : `https://${raw.replace(/^\/+/, "")}`;
  cachedApiRoot = withScheme.replace(/\/$/, "");
  return cachedApiRoot;
}

/** Base URL including `/api/v1` (no trailing slash). */
export function getUnipileV1BaseUrl(): string {
  return `${getUnipileApiRoot()}${UNIPILE_API_PATH}`;
}

function getV1BaseUrl(): string {
  return getUnipileV1BaseUrl();
}

export class UnipileApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public unipileType?: string
  ) {
    super(message);
    this.name = "UnipileApiError";
  }
}

/** HTTP 429 from Unipile — batch runners should abort and release lock without marking prospects as hard errors. */
export class UnipileRateLimitError extends UnipileApiError {
  constructor(
    message: string,
    status: number,
    public retryAfterSec?: number
  ) {
    super(message, status);
    this.name = "UnipileRateLimitError";
  }
}

export function getUnipileHeaders(): Record<string, string> {
  const key = process.env.UNIPILE_API_KEY?.trim();
  if (!key) {
    throw new Error("UNIPILE_API_KEY is not configured");
  }
  return {
    "X-API-KEY": key,
    "Content-Type": "application/json",
  };
}

function parseUnipileError(res: Response, text: string): UnipileApiError {
  try {
    const json = JSON.parse(text) as UnipileError;
    const type = json.type ?? "";
    const userMsg =
      UNIPILE_ERROR_MESSAGES[type] ??
      json.detail ??
      json.title ??
      (text || res.statusText);
    return new UnipileApiError(userMsg, res.status, type);
  } catch {
    return new UnipileApiError(
      text || res.statusText || `Unipile API ${res.status}`,
      res.status
    );
  }
}

export async function unipileFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getV1BaseUrl();
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const headers = getUnipileHeaders();

  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  const text = await res.text();

  if (!res.ok) {
    if (res.status === 429) {
      const retryRaw = res.headers.get("Retry-After");
      const retryAfterSec = retryRaw ? Number.parseInt(retryRaw, 10) : undefined;
      const parsed = parseUnipileError(res, text);
      throw new UnipileRateLimitError(
        parsed.message,
        429,
        Number.isFinite(retryAfterSec) ? retryAfterSec : undefined
      );
    }
    throw parseUnipileError(res, text);
  }

  if (res.status === 204 || !text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new UnipileApiError("Invalid JSON response", res.status);
  }
}
