/**
 * Standardized API Error Handler
 * 
 * Provides consistent error handling for all API routes.
 * Logs errors and returns standardized error responses.
 */

import { NextResponse } from "next/server";

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiErrorOptions {
  /** HTTP status code (default: 500) */
  status?: number;
  /** Error code for client identification */
  code?: string;
  /** Additional details for debugging (only in development) */
  details?: unknown;
  /** Whether to log the error (default: true) */
  log?: boolean;
}

/**
 * Handles an error and returns a standardized NextResponse
 * 
 * @param error - The error that occurred
 * @param context - A string describing where the error occurred (e.g., "POST /api/users")
 * @param options - Additional options for error handling
 * @returns NextResponse with error payload
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   try {
 *     // ... your code
 *   } catch (error) {
 *     return handleApiError(error, "POST /api/users");
 *   }
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  context: string,
  options: ApiErrorOptions = {}
): NextResponse<ApiError> {
  const { 
    status = 500, 
    code, 
    details,
    log = true 
  } = options;

  // Extract error message
  let message = "An unexpected error occurred";
  let errorStack: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    errorStack = error.stack;
  } else if (typeof error === "string") {
    message = error;
  }

  // Log the error (Vercel will capture this)
  if (log) {
    console.error(`[API Error] ${context}:`, {
      message,
      code,
      status,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });
  }

  // Build response payload
  const payload: ApiError = {
    error: message,
  };

  if (code) {
    payload.code = code;
  }

  // Only include details in development
  if (details && process.env.NODE_ENV === "development") {
    payload.details = details;
  }

  return NextResponse.json(payload, { status });
}

/**
 * Creates a standardized validation error response
 */
export function validationError(
  message: string,
  field?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: message,
      code: "VALIDATION_ERROR",
      details: field ? { field } : undefined,
    },
    { status: 400 }
  );
}

/**
 * Creates a standardized unauthorized error response
 */
export function unauthorizedError(
  message = "Unauthorized"
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: message,
      code: "UNAUTHORIZED",
    },
    { status: 401 }
  );
}

/**
 * Creates a standardized forbidden error response
 */
export function forbiddenError(
  message = "Forbidden"
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: message,
      code: "FORBIDDEN",
    },
    { status: 403 }
  );
}

/**
 * Creates a standardized not found error response
 */
export function notFoundError(
  resource = "Resource"
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: `${resource} not found`,
      code: "NOT_FOUND",
    },
    { status: 404 }
  );
}

/**
 * Creates a standardized rate limit error response
 */
export function rateLimitError(
  retryAfter?: number
): NextResponse<ApiError> {
  const headers: HeadersInit = {};
  if (retryAfter) {
    headers["Retry-After"] = String(retryAfter);
  }

  return NextResponse.json(
    {
      error: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
    },
    { status: 429, headers }
  );
}

/**
 * Wraps an async handler with automatic error handling
 * 
 * @example
 * ```typescript
 * export const POST = withErrorHandling(
 *   "POST /api/users",
 *   async (request: NextRequest) => {
 *     // Your code here - errors are automatically caught
 *     return NextResponse.json({ success: true });
 *   }
 * );
 * ```
 */
export function withErrorHandling<T extends unknown[]>(
  context: string,
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}

