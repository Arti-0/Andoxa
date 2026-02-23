export type CalendarStatusValue =
  | "disconnected"
  | "authorizing"
  | "connected"
  | "syncing"
  | "error";

export interface CalendarStatusResponse {
  status: CalendarStatusValue;
  isConnected: boolean;
  provider: string | null;
  accountEmail: string | null;
  lastSyncedAt: string | null;
  connectedAt: string | null;
  error: unknown;
  availableProviders: string[];
}

export interface CalendarConnectResponse {
  authorizationUrl?: string;
  provider?: string;
  state?: string;
  requiresSetup?: boolean;
  message?: string;
}

export interface CalendarSyncResponse {
  success?: boolean;
  requiresSetup?: boolean;
  message?: string;
  error?: string;
  details?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const payload = contentType?.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : (payload as { error?: string; message?: string })?.error ??
          (payload as { error?: string; message?: string })?.message ??
          `Erreur ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function getCalendarStatus(): Promise<CalendarStatusResponse> {
  const response = await fetch("/api/calendar/status", { method: "GET" });
  return handleResponse<CalendarStatusResponse>(response);
}

export type CalendarProvider = "google" | "microsoft";

type RequestCalendarConnectOptions = {
  redirectTo?: string;
};

export async function requestCalendarConnect(
  provider: CalendarProvider,
  options?: RequestCalendarConnectOptions
): Promise<CalendarConnectResponse> {
  const requestBody: Record<string, unknown> = { provider };
  if (options?.redirectTo) {
    requestBody.redirectTo = options.redirectTo;
  }

  const response = await fetch("/api/calendar/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const payload = await response
    .json()
    .catch(() => ({ error: `Erreur ${response.status}` }));

  if (response.status === 501 && "requiresSetup" in payload) {
    return payload as CalendarConnectResponse;
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string; message?: string })?.error ??
      (payload as { error?: string; message?: string })?.message ??
      `Erreur ${response.status}`;
    throw new Error(message);
  }

  return payload as CalendarConnectResponse;
}

export async function disconnectCalendar(): Promise<{ success?: boolean }> {
  const response = await fetch("/api/calendar/disconnect", {
    method: "POST",
  });
  return handleResponse<{ success?: boolean }>(response);
}

export async function triggerCalendarSync(): Promise<CalendarSyncResponse> {
  const response = await fetch("/api/calendar/sync", {
    method: "POST",
  });
  const payload = await response
    .json()
    .catch(() => ({ error: `Erreur ${response.status}` }));

  if (response.status === 501 && "requiresSetup" in payload) {
    return payload as CalendarSyncResponse;
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string; message?: string })?.error ??
      (payload as { error?: string; message?: string })?.message ??
      `Erreur ${response.status}`;
    throw new Error(message);
  }

  return payload as CalendarSyncResponse;
}
