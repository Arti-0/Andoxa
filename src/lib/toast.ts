/**
 * Toast utility - Unified interface for toast notifications
 *
 * Usage:
 *   import { toast } from '@/lib/toast';
 *   toast.success('Message');
 */

type ToastType = "success" | "error" | "info" | "warning";
type ToastListener = (message: string, type: ToastType, duration?: number) => void;

let toastListeners: ToastListener[] = [];

export function subscribeToToastEvents(listener: ToastListener) {
  toastListeners.push(listener);
  return () => {
    toastListeners = toastListeners.filter((l) => l !== listener);
  };
}

function emitToast(message: string, type: ToastType, duration?: number) {
  toastListeners.forEach((listener) => listener(message, type, duration));
}

type ApiErrorEnvelope = {
  success?: false;
  error?: { message?: string; details?: unknown };
};

function extractApiErrorMessage(err: unknown): string | null {
  if (err == null) return null;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const env = err as ApiErrorEnvelope;
    if (env.error?.message && typeof env.error.message === "string") {
      return env.error.message;
    }
  }
  return null;
}

/**
 * Show an error toast from any thrown value or API error envelope.
 * Falls back to a generic French message if nothing usable is found.
 */
export function toastFromApiError(
  err: unknown,
  fallback = "Une erreur est survenue"
): void {
  const msg = extractApiErrorMessage(err) ?? fallback;
  toast.error(msg);
}

/**
 * Inspect a fetch Response; if not ok, surface a French error toast and
 * return false. Returns true when the response is ok.
 */
export async function toastIfNotOk(
  res: Response,
  fallback = "Une erreur est survenue"
): Promise<boolean> {
  if (res.ok) return true;
  let msg: string | null = null;
  try {
    const json = (await res.json()) as ApiErrorEnvelope;
    msg = json?.error?.message ?? null;
  } catch {
    msg = null;
  }
  toast.error(msg ?? fallback);
  return false;
}

export const toast = {
  success: (message: string, options?: { duration?: number }) => {
    emitToast(message, "success", options?.duration);
    if (toastListeners.length === 0) {
      try {
        const { toast: sonnerToast } = require("sonner");
        sonnerToast.success(message, { duration: options?.duration || 7000 });
      } catch {
        console.log("[Toast]", message);
      }
    }
  },
  error: (message: string, options?: { duration?: number }) => {
    emitToast(message, "error", options?.duration);
    if (toastListeners.length === 0) {
      try {
        const { toast: sonnerToast } = require("sonner");
        sonnerToast.error(message, { duration: options?.duration || 7000 });
      } catch {
        console.error("[Toast]", message);
      }
    }
  },
  info: (message: string, options?: { duration?: number }) => {
    emitToast(message, "info", options?.duration);
    if (toastListeners.length === 0) {
      try {
        const { toast: sonnerToast } = require("sonner");
        sonnerToast.info(message, { duration: options?.duration || 7000 });
      } catch {
        console.log("[Toast]", message);
      }
    }
  },
  warning: (message: string, options?: { duration?: number }) => {
    emitToast(message, "warning", options?.duration);
    if (toastListeners.length === 0) {
      try {
        const { toast: sonnerToast } = require("sonner");
        sonnerToast.warning(message, { duration: options?.duration || 7000 });
      } catch {
        console.warn("[Toast]", message);
      }
    }
  },
};
