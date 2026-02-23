/**
 * Workspace Module - Single source of truth for user/workspace data
 * 
 * Usage:
 * ```tsx
 * import { useWorkspace, WorkspaceProvider } from '@/lib/workspace';
 * 
 * // In app layout
 * <WorkspaceProvider>
 *   {children}
 * </WorkspaceProvider>
 * 
 * // In any component
 * const { workspace, user, hasActivePlan } = useWorkspace();
 * ```
 */

// Context & Provider
export { WorkspaceProvider, WorkspaceContext } from './context';

// Main hook
export { 
  useWorkspace,
  useWorkspaceId,
  useWorkspacePlan,
  useWorkspaceMembers,
} from './hooks';

// Types
export type {
  User,
  Profile,
  Workspace,
  WorkspaceMember,
  Subscription,
  WorkspaceType,
  WorkspacePlan,
  SubscriptionStatus,
  MemberRole,
  Permission,
  WorkspaceContextData,
  WorkspaceWithMeta,
  ApiResponse,
  PaginatedResponse,
} from './types';
