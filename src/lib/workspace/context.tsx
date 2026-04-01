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

type OrgRowForWorkspace = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  plan: string | null;
  status: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  credits: number | null;
  owner_id: string;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  metadata: unknown;
};

type MemberApiRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
  joined_at: string | null;
  created_at?: string | null;
  profiles?: Profile | Profile[] | null;
};

function normalizeWorkspaceFromApi(workspaceData: OrgRowForWorkspace): Workspace {
  const subscriptionStatus =
    workspaceData.subscription_status as Workspace["subscription_status"] | null;
  return {
    id: workspaceData.id,
    name: workspaceData.name,
    slug: workspaceData.slug || workspaceData.id,
    type: "team",
    logo_url: workspaceData.logo_url,
    plan: (workspaceData.plan ?? "free") as Workspace["plan"],
    subscription_status: subscriptionStatus ?? null,
    trial_ends_at: workspaceData.trial_ends_at,
    credits: workspaceData.credits ?? 0,
    owner_id: workspaceData.owner_id,
    created_at: workspaceData.created_at ?? new Date().toISOString(),
    updated_at: workspaceData.updated_at ?? new Date().toISOString(),
    metadata: workspaceData.metadata as Workspace["metadata"],
    status: workspaceData.status,
    deleted_at: workspaceData.deleted_at,
  };
}

function mapMembersFromApi(rows: MemberApiRow[] | null | undefined): WorkspaceMember[] {
  return (rows ?? []).map((m) => {
    const p = m.profiles;
    const profileNested =
      p == null ? undefined : Array.isArray(p) ? p[0] : p;
    return {
      id: m.id,
      workspace_id: m.organization_id,
      user_id: m.user_id,
      role: (m.role ?? "member") as MemberRole,
      joined_at: m.joined_at ?? m.created_at ?? "",
      profile: profileNested,
    };
  });
}

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

  const fetchWorkspaceMe = useCallback(async (isRefresh = false) => {
    if (isRefresh && mountedRef.current) {
      setIsSyncing(true);
    }

    try {
      const res = await fetch("/api/workspace/me", {
        credentials: "include",
      });

      if (!mountedRef.current) {
        return null;
      }

      if (res.status === 401) {
        setUser(null);
        setProfile(null);
        setWorkspace(null);
        setMembers([]);
        setSubscription(null);
        return null;
      }

      if (!res.ok) {
        console.error("[Workspace] /api/workspace/me HTTP", res.status);
        return null;
      }

      const data = (await res.json()) as {
        user: { id: string; email?: string | null; created_at: string } | null;
        profile: Profile | null;
        workspace: OrgRowForWorkspace | null;
        members: MemberApiRow[];
        subscription: unknown | null;
      };

      if (!mountedRef.current) {
        return null;
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
          created_at: data.user.created_at,
        });
      }

      setProfile(data.profile);

      if (data.workspace) {
        setWorkspace(normalizeWorkspaceFromApi(data.workspace));
      } else {
        setWorkspace(null);
      }

      setMembers(mapMembersFromApi(data.members));
      setSubscription(
        data.subscription
          ? (data.subscription as unknown as Subscription)
          : null
      );

      return data;
    } catch (error) {
      console.error("[Workspace] Init error:", error);
      return null;
    } finally {
      if (isRefresh && mountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      if (isInitializing.current) return;

      isInitializing.current = true;

      try {
        if (mountedRef.current) {
          setIsLoading(true);
        }

        // Fetch brut vers route API serveur — évite AbortError du SDK browser (getSession)
        await fetchWorkspaceMe(false);
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
        if (mountedRef.current) {
          setIsLoading(true);
        }
        await fetchWorkspaceMe(false);
        if (mountedRef.current) {
          setIsLoading(false);
          setIsInitialized(true);
        }
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
  }, [supabase, fetchWorkspaceMe]);

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

      const { data: memberRow, error: memberErr } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberErr) {
        console.error("[Workspace] Role lookup error during switch:", memberErr);
        throw memberErr;
      }

      const role = memberRow?.role ?? "member";
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const currentMeta = (authUser?.user_metadata ?? {}) as Record<string, unknown>;
      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          ...currentMeta,
          active_organization_id: workspaceId,
          active_organization_role: role,
        },
      });

      if (metaErr) {
        console.error("[Workspace] JWT metadata sync error during switch:", metaErr);
        throw metaErr;
      }

      await fetchWorkspaceMe(true);
    },
    [user, supabase, fetchWorkspaceMe]
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    await fetchWorkspaceMe(true);
  }, [user, fetchWorkspaceMe]);

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
