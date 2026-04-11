"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { NotificationWithDetails } from "@/lib/types/notifications";

const NOTIFICATIONS_KEY = ["notifications"] as const;

async function fetchNotifications(): Promise<NotificationWithDetails[]> {
  const response = await fetch("/api/notifications");
  if (!response.ok) throw new Error("Failed to fetch notifications");
  const json = await response.json();
  return json.data?.notifications ?? json.notifications ?? [];
}

/**
 * Hook for managing notifications (React Query cache + Realtime invalidation).
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: notifications = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchNotifications,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const scheduleInvalidate = useCallback(() => {
    if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
    invalidateTimer.current = setTimeout(() => {
      invalidateTimer.current = null;
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    }, 500);
  }, [queryClient]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          scheduleInvalidate();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification_reads" },
        () => {
          scheduleInvalidate();
        }
      )
      .subscribe();

    return () => {
      if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
      supabase.removeChannel(channel);
    };
  }, [scheduleInvalidate]);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const prev = queryClient.getQueryData<NotificationWithDetails[]>(
        NOTIFICATIONS_KEY
      );
      queryClient.setQueryData<NotificationWithDetails[]>(
        NOTIFICATIONS_KEY,
        (old) =>
          old?.map((n) =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          ) ?? []
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(NOTIFICATIONS_KEY, context.prev);
      }
    },
  });

  const markAsUnreadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to mark as unread");
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const prev = queryClient.getQueryData<NotificationWithDetails[]>(
        NOTIFICATIONS_KEY
      );
      queryClient.setQueryData<NotificationWithDetails[]>(
        NOTIFICATIONS_KEY,
        (old) =>
          old?.map((n) =>
            n.id === notificationId
              ? { ...n, is_read: false, read_at: null }
              : n
          ) ?? []
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(NOTIFICATIONS_KEY, context.prev);
      }
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const prev = queryClient.getQueryData<NotificationWithDetails[]>(
        NOTIFICATIONS_KEY
      );
      queryClient.setQueryData<NotificationWithDetails[]>(
        NOTIFICATIONS_KEY,
        (old) =>
          old?.map((n) => ({
            ...n,
            is_read: true,
            read_at: new Date().toISOString(),
          })) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(NOTIFICATIONS_KEY, context.prev);
      }
    },
  });

  const markAsRead = useCallback(
    (id: string) => {
      markAsReadMutation.mutate(id);
    },
    [markAsReadMutation]
  );

  const markAsUnread = useCallback(
    (id: string) => {
      markAsUnreadMutation.mutate(id);
    },
    [markAsUnreadMutation]
  );

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const fetchUnreadCount = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  }, [queryClient]);

  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? String(queryError)
        : null;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch,
    fetchUnreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
  };
}
