"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface CampaignReply {
  id: string;
  organization_id: string;
  received_at: string | null;
  is_read: boolean;
  is_archived: boolean;
  campaign_name: string;
}

export function useInbox() {
  const [replies, setReplies] = useState<CampaignReply[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReplies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      // Get current user and tenant
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("active_organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.active_organization_id) {
        console.log("No tenant found for user, skipping inbox fetch");
        setReplies([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Fetch campaign replies
      const { data, error } = await supabase
        .from("campaign_replies")
        .select(
          `
          *,
          campaign:campaigns(name)
        `
        )
        .eq("organization_id", profile.active_organization_id)
        .order("received_at", { ascending: false });

      if (error) {
        // Si la table n'existe pas encore, retourner un tableau vide
        if (
          error.code === "PGRST116" ||
          error.message?.includes('relation "campaign_replies" does not exist')
        ) {
          console.warn(
            "Table campaign_replies not found. Please run the database migration."
          );
          setReplies([]);
          setUnreadCount(0);
          return;
        }
        throw error;
      }

      const formattedReplies: CampaignReply[] =
        (data?.map((reply) => {
          const r = reply as {
            id: string;
            organization_id: string;
            received_at: string | null;
            is_read: boolean;
            is_archived: boolean;
            campaign?: { name?: string } | null;
          };
          return {
            id: r.id,
            organization_id: r.organization_id,
            received_at: r.received_at,
            is_read: r.is_read,
            is_archived: r.is_archived,
            campaign_name: r.campaign?.name || "Campagne supprimée",
          };
        }) as CampaignReply[]) || [];

      setReplies(formattedReplies);

      // Update unread count
      const unread = formattedReplies.filter(
        (reply) => !reply.is_read && !reply.is_archived
      ).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Error fetching replies:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("active_organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.active_organization_id) return;

      const { data, error } = await supabase
        .from("campaign_replies")
        .select("id")
        .eq("organization_id", profile.active_organization_id)
        .eq("is_read", false)
        .eq("is_archived", false);

      if (error) {
        // Si la table n'existe pas encore, retourner 0
        if (
          error.code === "PGRST116" ||
          error.message?.includes('relation "campaign_replies" does not exist')
        ) {
          setUnreadCount(0);
          return;
        }
        throw error;
      }
      setUnreadCount(data?.length || 0);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  }, []);

  const markAsRead = useCallback(async (replyId: string) => {
    try {
      const supabase = createClient();
      await supabase
        .from("campaign_replies")
        .update({ is_read: true })
        .eq("id", replyId);

      setReplies((prev) =>
        prev.map((reply) =>
          reply.id === replyId ? { ...reply, is_read: true } : reply
        )
      );

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }, []);

  const markAsArchived = useCallback(
    async (replyId: string) => {
      try {
        const supabase = createClient();
        await supabase
          .from("campaign_replies")
          .update({ is_archived: true })
          .eq("id", replyId);

        setReplies((prev) =>
          prev.map((reply) =>
            reply.id === replyId ? { ...reply, is_archived: true } : reply
          )
        );

        // Update unread count if it was unread
        const reply = replies.find((r) => r.id === replyId);
        if (reply && !reply.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Error archiving:", error);
      }
    },
    [replies]
  );

  const deleteReply = useCallback(
    async (replyId: string) => {
      try {
        const supabase = createClient();
        await supabase.from("campaign_replies").delete().eq("id", replyId);

        const reply = replies.find((r) => r.id === replyId);
        setReplies((prev) => prev.filter((reply) => reply.id !== replyId));

        // Update unread count if it was unread
        if (reply && !reply.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Error deleting:", error);
      }
    },
    [replies]
  );

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    fetchReplies();

    // Subscribe to new replies
    const channel = supabase
      .channel("campaign-replies-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "campaign_replies",
        },
        () => {
          // Refetch replies when a new one is created
          fetchReplies();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_replies",
        },
        () => {
          // Update read status in real-time
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReplies]);

  return {
    replies,
    unreadCount,
    loading,
    error,
    refetch: fetchReplies,
    fetchUnreadCount,
    markAsRead,
    markAsArchived,
    deleteReply,
  };
}
