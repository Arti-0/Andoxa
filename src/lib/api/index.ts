/**
 * API Module - Standardized API handlers and utilities
 * 
 * Usage:
 * ```ts
 * import { createApiHandler, Errors, parseBody } from '@/lib/api';
 * 
 * export const GET = createApiHandler(async (req, ctx) => {
 *   return await fetchData(ctx.workspaceId);
 * });
 * 
 * export const POST = createApiHandler(async (req, ctx) => {
 *   const body = await parseBody<CreateInput>(req);
 *   if (!body.name) throw Errors.validation({ name: 'Required' });
 *   return await createItem(body, ctx.workspaceId);
 * });
 * ```
 */

export {
  createApiHandler,
  ApiError,
  Errors,
  parseBody,
  getSearchParams,
  getPagination,
  type ApiContext,
  type HandlerOptions,
} from './handlers';
