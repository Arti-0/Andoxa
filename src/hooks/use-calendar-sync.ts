import { useCallback, useState } from "react";

import {
  disconnectCalendar as apiDisconnectCalendar,
  getCalendarStatus,
  requestCalendarConnect,
  triggerCalendarSync,
  type CalendarConnectResponse,
  type CalendarProvider,
  type CalendarStatusResponse,
} from "@/lib/api/calendar";

interface UseCalendarSyncReturn {
  status: CalendarStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  isConnecting: boolean;
  availableProviders: CalendarProvider[];
  connectCalendar: (provider: CalendarProvider) => Promise<void>;
  disconnectCalendar: () => Promise<void>;
  syncCalendar: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useCalendarSync(): UseCalendarSyncReturn {
  const [status, setStatus] = useState<CalendarStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshStatus = useCallback(async () => {
      setIsLoading(true);
      setError(null);
    try {
      const data = await getCalendarStatus();
      setStatus(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Impossible de récupérer l'état du calendrier.");
      }
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectCalendar = useCallback(
    async (provider: CalendarProvider) => {
      setIsConnecting(true);
      setError(null);

      try {
        const result: CalendarConnectResponse = await requestCalendarConnect(
          provider,
          { redirectTo: "/calendar" }
        );

        if (result.requiresSetup) {
          throw new Error(
            result.message ??
              "L'intégration calendrier n'est pas encore configurée."
          );
        }

        if (result.authorizationUrl) {
          window.location.assign(result.authorizationUrl);
          return;
        }

        throw new Error("Réponse inattendue du service de calendrier.");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Impossible d'initialiser la connexion calendrier.";

        if (message.includes("access_denied")) {
          setError(
            "Google a refusé l'accès à Andoxa. Ajoutez l'utilisateur comme testeur OAuth ou finalisez la validation Google avant de réessayer."
          );
        } else {
          setError(message);
        }

        await refreshStatus();
      } finally {
        setIsConnecting(false);
      }
    },
    [refreshStatus]
  );

  const disconnectCalendar = useCallback(async () => {
    setError(null);
    try {
      await apiDisconnectCalendar();
      await refreshStatus();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Impossible de déconnecter le calendrier.");
      }
    }
  }, [refreshStatus]);

  const syncCalendar = useCallback(async () => {
      setError(null);
    try {
      const response = await triggerCalendarSync();
      if (response.requiresSetup) {
        throw new Error(
          response.message ??
            "Le service de synchronisation n'est pas encore configuré."
        );
      }
      await refreshStatus();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Impossible de lancer la synchronisation.");
      }
    }
  }, [refreshStatus]);

  return {
    status,
    isLoading,
    error,
    isConnecting,
    availableProviders: (status?.availableProviders ?? []).filter(
      (provider): provider is CalendarProvider =>
        provider === "google" || provider === "microsoft"
    ),
    connectCalendar,
    disconnectCalendar,
    syncCalendar,
    refreshStatus,
  };
}
