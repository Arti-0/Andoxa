/**
 * Unipile API client – proxy for messaging (LinkedIn, etc.)
 *
 * Env:
 * - UNIPILE_API_URL: base URL (e.g. https://api1.unipile.com:13111) – DSN from dashboard
 * - UNIPILE_API_KEY: access token
 *
 * Auth: X-API-KEY header
 */

import {
  UNIPILE_ERROR_MESSAGES,
  type UnipileError,
} from "./types";

const rawBase = process.env.UNIPILE_API_URL || "https://api1.unipile.com:13111";
const UNIPILE_BASE = rawBase.startsWith("http")
  ? rawBase
  : `https://${rawBase.replace(/^\/+/, "")}`;
const UNIPILE_API_PATH = "/api/v1";

function getBaseUrl(): string {
  const base = UNIPILE_BASE.replace(/\/$/, "");
  return `${base}${UNIPILE_API_PATH}`;
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

export function getUnipileHeaders(): Record<string, string> {
  const key = process.env.UNIPILE_API_KEY;
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
  const baseUrl = getBaseUrl();
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const headers = getUnipileHeaders();

  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  const text = await res.text();

  if (!res.ok) {
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
