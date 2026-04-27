/**
 * Workspace Types - Core data structures
 *
 * Workspace = concept unifié remplaçant organization/profile/tenant
 * - Freelance: workspace personnel (1 user)
 * - Team: workspace équipe (multiple users)
 */

import type { Json } from "@/lib/types/supabase";

export type WorkspaceType = 'freelance' | 'team';

export type WorkspacePlan = 'free' | 'essential' | 'pro' | 'business' | 'demo';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export type MemberRole = 'owner' | 'admin' | 'member';

export type Permission =
  | 'manage_team'
  | 'manage_billing'
  | 'manage_settings'
  | 'manage_campaigns'
  | 'manage_prospects'
  | 'view_analytics';

// ─────────────────────────────────────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface CalendarPreferences {
  hidden_calendar_ids?: string[];
  hidden_member_ids?: string[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  linkedin_url?: string | null;
  linkedin_auto_enrich?: boolean;
  active_organization_id: string | null;
  metadata?: Record<string, unknown> | null;
  calendar_preferences?: CalendarPreferences | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: WorkspaceType;
  logo_url: string | null;

  // Plan & Subscription
  plan: WorkspacePlan;
  subscription_status: SubscriptionStatus | null;
  trial_ends_at: string | null;

  // Credits (for enrichment)
  credits: number;

  // Metadata
  owner_id: string;
  created_at: string;
  updated_at: string;
  /** Org settings JSON (e.g. auto_enrich_on_import) */
  metadata?: Json | null;

  // Soft delete (30-day retention for export)
  status?: string | null;
  deleted_at?: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;

  // Denormalized for convenience
  profile?: Profile;
}

export interface Subscription {
  id: string;
  workspace_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan_id: WorkspacePlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Types (what useWorkspace returns)
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceContextData {
  // Auth state
  user: User | null;
  profile: Profile | null;

  // Current workspace
  workspace: Workspace | null;
  subscription: Subscription | null;
  members: WorkspaceMember[];

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  isSyncing: boolean;

  // Computed states
  hasActivePlan: boolean;
  isTrialing: boolean;
  daysUntilTrialEnd: number | null;

  // Permissions (computed from role)
  permissions: Permission[];

  // Actions
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper type for workspace with computed fields
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceWithMeta extends Workspace {
  hasActivePlan: boolean;
  isOwner: boolean;
  memberCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Response types
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
