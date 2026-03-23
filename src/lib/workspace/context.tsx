"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "../supabase/client";
import type {
  User,
  Profile,
  Workspace,
  Subscription,
  WorkspaceMember,
  WorkspaceContextData,
  Permission,
  MemberRole,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextData | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Permission mapping
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: [
    "manage_team",
    "manage_billing",
    "manage_settings",
    "manage_campaigns",
    "manage_prospects",
    "view_analytics",
  ],
  admin: [
    "manage_team",
    "manage_settings",
    "manage_campaigns",
    "manage_prospects",
    "view_analytics",
  ],
  member: ["manage_campaigns", "manage_prospects", "view_analytics"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

interface WorkspaceProviderProps {
  children: ReactNode;
  initialData?: Partial<WorkspaceContextData>;
}

export function WorkspaceProvider({
  children,
  initialData,
}: WorkspaceProviderProps) {
  const [user, setUser] = useState<User | null>(initialData?.user ?? null);
  const [profile, setProfile] = useState<Profile | null>(
    initialData?.profile ?? null
  );
  const [workspace, setWorkspace] = useState<Workspace | null>(
    initialData?.workspace ?? null
  );
  const [subscription, setSubscription] = useState<Subscription | null>(
    initialData?.subscription ?? null
  );
  const [members, setMembers] = useState<WorkspaceMember[]>(
    initialData?.members ?? []
  );
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isInitialized, setIsInitialized] = useState(!!initialData);
  const [isSyncing, setIsSyncing] = useState(false);

  // Create supabase client once and memoize it
  const supabase = useMemo(() => createClient(), []);

  // Verrous pour éviter les race conditions
  const isInitializing = useRef(false);
  const mountedRef = useRef(true);

  // ─────────────────────────────────────────────────────────────────────────
  // Load workspace data (single optimized query)
  // ─────────────────────────────────────────────────────────────────────────

  const loadWorkspaceData = useCallback(
    async (userId: string, isRefresh = false) => {
      // Si c'est un refresh (pas l'initialisation), déclencher la barre de synchro
      if (isRefresh && mountedRef.current) {
        setIsSyncing(true);
      }

      try {
        // Single query to get profile with active organization
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            `
          id,
          email,
          full_name,
          avatar_url,
          linkedin_url,
          active_organization_id,
          created_at,
          updated_at
        `
          )
          .eq("id", userId)
          .single();

        if (profileError || !profileData) {
          console.error("[Workspace] Profile not found:", profileError);
          return null;
        }

        // Protéger tous les setState avec mountedRef
        if (!mountedRef.current) return null;
        setProfile(profileData as Profile);

        // If no active organization, return early
        if (!profileData.active_organization_id) {
          return { profile: profileData, workspace: null };
        }

        // Load workspace with subscription in single query
        // Note: Using separate queries for clarity, could be optimized with a view
        const { data: workspaceData, error: workspaceError } = await supabase
        .from("organizations") // Keep using organizations table for now
        .select(
          `
          id,
          name,
          slug,
          logo_url,
          plan,
          status,
          subscription_status,
          trial_ends_at,
          credits,
          owner_id,
          deleted_at,
          created_at,
          updated_at,
          metadata
        `
        )
        .eq("id", profileData.active_organization_id)
        .single();

        if (workspaceError || !workspaceData) {
          console.error("[Workspace] Workspace not found:", workspaceError);
          return { profile: profileData, workspace: null };
        }

        // Transform to Workspace type (override Supabase nullables)
        const subscriptionStatus = workspaceData.subscription_status as Workspace["subscription_status"] | null;
        const workspaceTransformed: Workspace = {
          ...workspaceData,
          type: "team",
          slug: workspaceData.slug || workspaceData.id,
          plan: (workspaceData.plan ?? "free") as Workspace["plan"],
          subscription_status: subscriptionStatus ?? null,
          credits: workspaceData.credits ?? 0,
          created_at: workspaceData.created_at ?? new Date().toISOString(),
          updated_at: workspaceData.updated_at ?? new Date().toISOString(),
          metadata: workspaceData.metadata as Workspace["metadata"],
        };

        if (!mountedRef.current) return null;
        setWorkspace(workspaceTransformed);

        // Check pending invitations (by email or LinkedIn URL)
        try {
          const res = await fetch("/api/invitations/check", {
            method: "POST",
            credentials: "include",
          });
          const data = await res.json();
          if (data?.joined && data?.organizationId) {
            await loadWorkspaceData(userId, true);
          }
        } catch {
          // Non-blocking
        }

        // Load subscription
        const { data: subscriptionData } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", workspaceData.owner_id)
          .in("status", ["active", "trialing"])
          .maybeSingle();

        if (subscriptionData && mountedRef.current) {
          setSubscription(subscriptionData as unknown as Subscription);
        }

        // Load members (optional, only if needed)
        const { data: membersData } = await supabase
          .from("organization_members")
          .select(
            `
          id,
          organization_id,
          user_id,
          role,
          joined_at,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `
          )
          .eq("organization_id", profileData.active_organization_id);

        if (membersData && mountedRef.current) {
          setMembers(
            membersData.map((m: any) => ({
              id: m.id,
              workspace_id: m.organization_id,
              user_id: m.user_id,
              role: m.role,
              joined_at: m.joined_at,
              profile: m.profiles,
            }))
          );
        }

        return {
          profile: profileData,
          workspace: workspaceTransformed,
          subscription: subscriptionData,
          members: membersData,
        };
      } finally {
        // Toujours remettre isSyncing à false après le chargement
        if (isRefresh && mountedRef.current) {
          setIsSyncing(false);
        }
      }
    },
    [supabase]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      // Verrou : si déjà en train d'initialiser, on sort
      if (isInitializing.current) return;

      isInitializing.current = true;

      try {
        if (mountedRef.current) {
          setIsLoading(true);
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mountedRef.current) {
          isInitializing.current = false;
          return;
        }

        if (error || !session?.user) {
          setUser(null);
          setProfile(null);
          setWorkspace(null);
          setIsInitialized(true);
          setIsLoading(false);
          isInitializing.current = false;
          return;
        }

        setUser({
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at,
        });

        await loadWorkspaceData(session.user.id);
      } catch (error) {
        console.error("[Workspace] Init error:", error);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          setIsInitialized(true);
        }
        isInitializing.current = false;
      }
    };

    initialize();

    // Listen for auth changes - ne recharger QUE sur SIGNED_IN (pas sur TOKEN_REFRESHED)
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      // Ne recharger QUE sur SIGNED_IN (pas sur TOKEN_REFRESHED ou INITIAL_SESSION)
      if (event === "SIGNED_IN" && session?.user && !isInitializing.current) {
        isInitializing.current = true;
        setUser({
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at,
        });
        setIsLoading(true);
        await loadWorkspaceData(session.user.id);
        setIsLoading(false);
        setIsInitialized(true);
        isInitializing.current = false;
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setWorkspace(null);
        setSubscription(null);
        setIsLoading(false);
        setIsInitialized(false);
        setMembers([]);
        isInitializing.current = false;
      }
    });

    return () => {
      mountedRef.current = false;
      authSubscription.unsubscribe();
    };
  }, [supabase, loadWorkspaceData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return;

      // Update profile's active organization
      const { error } = await supabase
        .from("profiles")
        .update({ active_organization_id: workspaceId })
        .eq("id", user.id);

      if (error) {
        console.error("[Workspace] Switch error:", error);
        throw error;
      }

      // Reload workspace data
      await loadWorkspaceData(user.id, true); // Passer isRefresh=true pour déclencher la barre
    },
    [user, supabase, loadWorkspaceData]
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    await loadWorkspaceData(user.id, true); // Passer isRefresh=true pour déclencher la barre
  }, [user, loadWorkspaceData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setWorkspace(null);
    setSubscription(null);
    setMembers([]);
  }, [supabase]);

  // ─────────────────────────────────────────────────────────────────────────
  // Computed values
  // ─────────────────────────────────────────────────────────────────────────

  const hasActivePlan =
    workspace?.plan !== "free" &&
    (workspace?.subscription_status === "active" ||
      workspace?.subscription_status === "trialing" ||
      workspace?.plan === "demo");

  const isTrialing = workspace?.subscription_status === "trialing";

  const daysUntilTrialEnd = workspace?.trial_ends_at
    ? Math.ceil(
        (new Date(workspace.trial_ends_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Get user's role in current workspace
  const currentMember = members.find((m) => m.user_id === user?.id);
  const userRole: MemberRole =
    currentMember?.role || (workspace?.owner_id === user?.id ? "owner" : "member");
  const permissions = ROLE_PERMISSIONS[userRole] || [];

  // ─────────────────────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────────────────────

  const value: WorkspaceContextData = {
    user,
    profile,
    workspace,
    subscription,
    members,
    isLoading,
    isInitialized,
    isSyncing,
    hasActivePlan,
    isTrialing,
    daysUntilTrialEnd,
    permissions,
    switchWorkspace,
    refresh,
    signOut,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook export (main hook is in hooks.ts for cleaner imports)
// ─────────────────────────────────────────────────────────────────────────────

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
  }
  return context;
}

export { WorkspaceContext };
