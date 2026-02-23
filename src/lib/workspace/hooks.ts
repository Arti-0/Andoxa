"use client";

import { useWorkspaceContext } from "./context";

/**
 * useWorkspace - THE single hook for all workspace data
 *
 * Philosophy: "Besoin de données utilisateur ? → useWorkspace()" point final.
 *
 * Ce hook remplace:
 * - useUser()
 * - useProfile()
 * - useOrganization()
 * - useSubscription()
 * - useMembership()
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     user,           // Auth user
 *     profile,        // User profile
 *     workspace,      // Current workspace (ex: organization)
 *     isLoading,      // Loading state
 *     hasActivePlan,  // Plan status
 *     canManageTeam,  // Permission check
 *   } = useWorkspace();
 *
 *   if (isLoading) return <Loading />;
 *   if (!workspace) return <SetupWorkspace />;
 *
 *   return <Dashboard workspace={workspace} />;
 * }
 * ```
 */
export function useWorkspace() {
  const context = useWorkspaceContext();

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Core Data
    // ─────────────────────────────────────────────────────────────────────

    /** Current authenticated user (from Supabase Auth) */
    user: context.user,

    /** User's profile (from profiles table) */
    profile: context.profile,

    /** Current active workspace */
    workspace: context.workspace,

    /** Workspace ID shorthand (for convenience) */
    workspaceId: context.workspace?.id ?? null,

    /** Current subscription details */
    subscription: context.subscription,

    /** All members of current workspace */
    members: context.members,

    // ─────────────────────────────────────────────────────────────────────
    // Loading States
    // ─────────────────────────────────────────────────────────────────────

    /** True while loading initial data */
    isLoading: context.isLoading,

    /** True once initial load is complete (even if no data) */
    isInitialized: context.isInitialized,

    /** True while syncing/refreshing data (after initialization) */
    isSyncing: context.isSyncing,

    // ─────────────────────────────────────────────────────────────────────
    // Computed States (shortcuts for common checks)
    // ─────────────────────────────────────────────────────────────────────

    /** User is authenticated */
    isAuthenticated: !!context.user,

    /** User has a complete profile */
    hasProfile: !!context.profile?.full_name,

    /** User has a workspace */
    hasWorkspace: !!context.workspace,

    /** User has an active paid plan */
    hasActivePlan: context.hasActivePlan,

    /** User is in trial period */
    isTrialing: context.isTrialing,

    /** Days until trial expires (null if not in trial) */
    daysUntilTrialEnd: context.daysUntilTrialEnd,

    /** Workspace is freelance (single user) */
    isFreelance: context.workspace?.type === 'freelance',

    /** Workspace is team (multiple users) */
    isTeam: context.workspace?.type === 'team',

    /** Current user is workspace owner */
    isOwner: context.workspace?.owner_id === context.user?.id,

    // ─────────────────────────────────────────────────────────────────────
    // Permissions (role-based)
    // ─────────────────────────────────────────────────────────────────────

    /** All permissions for current user */
    permissions: context.permissions,

    /** Can manage team members */
    canManageTeam: context.permissions.includes('manage_team'),

    /** Can manage billing/subscription */
    canManageBilling: context.permissions.includes('manage_billing'),

    /** Can manage workspace settings */
    canManageSettings: context.permissions.includes('manage_settings'),

    /** Can manage campaigns */
    canManageCampaigns: context.permissions.includes('manage_campaigns'),

    /** Can manage prospects */
    canManageProspects: context.permissions.includes('manage_prospects'),

    /** Can view analytics */
    canViewAnalytics: context.permissions.includes('view_analytics'),

    // ─────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────

    /** Switch to a different workspace */
    switchWorkspace: context.switchWorkspace,

    /** Refresh workspace data */
    refresh: context.refresh,

    /** Sign out user */
    signOut: context.signOut,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience hooks (for specific use cases)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useWorkspaceId - Just the workspace ID
 * Useful for API calls where you only need the ID
 */
export function useWorkspaceId() {
  const { workspace } = useWorkspace();
  return workspace?.id ?? null;
}

/**
 * useWorkspacePlan - Plan information only
 * Useful for feature gating
 */
export function useWorkspacePlan() {
  const { workspace, subscription, hasActivePlan, isTrialing, daysUntilTrialEnd } = useWorkspace();

  return {
    plan: workspace?.plan ?? 'free',
    status: subscription?.status ?? null,
    hasActivePlan,
    isTrialing,
    daysUntilTrialEnd,
    credits: workspace?.credits ?? 0,
  };
}

/**
 * useWorkspaceMembers - Team members only
 * Useful for team management features
 */
export function useWorkspaceMembers() {
  const { members, canManageTeam, isOwner } = useWorkspace();

  return {
    members,
    memberCount: members.length,
    canManageTeam,
    isOwner,
  };
}
