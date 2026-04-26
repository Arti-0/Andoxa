"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

type WorkspaceMeData = {
  user: User | null;
  profile: Profile | null;
  workspace: Workspace | null;
  members: WorkspaceMember[];
  subscription: Subscription | null;
};

const WORKSPACE_ME_QUERY_KEY = ["workspace-me"] as const;
const EMPTY_WORKSPACE_ME: WorkspaceMeData = {
  user: null,
  profile: null,
  workspace: null,
  members: [],
  subscription: null,
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

async function fetchWorkspaceMe(): Promise<WorkspaceMeData> {
  const res = await fetch("/api/workspace/me", { credentials: "include" });

  if (res.status === 401) {
    return EMPTY_WORKSPACE_ME;
  }

  if (!res.ok) {
    throw new Error(`/api/workspace/me HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    user: { id: string; email?: string | null; created_at: string } | null;
    profile: Profile | null;
    workspace: OrgRowForWorkspace | null;
    members: MemberApiRow[];
    subscription: unknown | null;
  };

  return {
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email ?? "",
          created_at: data.user.created_at,
        }
      : null,
    profile: data.profile,
    workspace: data.workspace ? normalizeWorkspaceFromApi(data.workspace) : null,
    members: mapMembersFromApi(data.members),
    subscription: data.subscription
      ? (data.subscription as unknown as Subscription)
      : null,
  };
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
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const initialQueryData = useMemo<WorkspaceMeData | undefined>(() => {
    if (!initialData) return undefined;
    return {
      user: initialData.user ?? null,
      profile: initialData.profile ?? null,
      workspace: initialData.workspace ?? null,
      members: initialData.members ?? [],
      subscription: initialData.subscription ?? null,
    };
  }, [initialData]);

  const query = useQuery<WorkspaceMeData>({
    queryKey: WORKSPACE_ME_QUERY_KEY,
    queryFn: fetchWorkspaceMe,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: initialQueryData,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Auth listener — drive cache invalidation, not local state
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        queryClient.invalidateQueries({ queryKey: WORKSPACE_ME_QUERY_KEY });
      } else if (event === "SIGNED_OUT") {
        queryClient.removeQueries({ queryKey: WORKSPACE_ME_QUERY_KEY });
      }
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, [supabase, queryClient]);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived state from query.data
  // ─────────────────────────────────────────────────────────────────────────

  const user = query.data?.user ?? null;
  const profile = query.data?.profile ?? null;
  const workspace = query.data?.workspace ?? null;
  const members = query.data?.members ?? [];
  const subscription = query.data?.subscription ?? null;

  const isLoading = query.isPending;
  const isInitialized = query.isSuccess || query.isError;
  const isSyncing = query.isFetching && !query.isPending;

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return;

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

      await queryClient.invalidateQueries({ queryKey: WORKSPACE_ME_QUERY_KEY });
    },
    [user, supabase, queryClient]
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    await queryClient.invalidateQueries({ queryKey: WORKSPACE_ME_QUERY_KEY });
  }, [user, queryClient]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: WORKSPACE_ME_QUERY_KEY });
  }, [supabase, queryClient]);

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
