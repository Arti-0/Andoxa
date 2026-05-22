/**
 * Toast utility - Unified interface for toast notifications.
 *
 * Wraps Sonner so every surface of the app gets the same rich-colored,
 * theme-adaptive styling (the look originally only seen on
 * "Événement créé avec succès"). The global <Toaster richColors /> in
 * src/app/layout.tsx handles light/dark adaptive text colors automatically.
 *
 * Usage:
 *   import { toast } from '@/lib/toast';
 *   toast.success('Message');
 *   toast.error('Oops', { description: 'Détails…' });
 *   toast.message('Titre neutre');
 */

import { toast as sonnerToast, type ExternalToast } from "sonner";

type ToastType = "success" | "error" | "info" | "warning" | "message";
type ToastListener = (message: string, type: ToastType, duration?: number) => void;

const DEFAULT_DURATION = 7000;

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

function withDefaults(options?: ExternalToast): ExternalToast {
  return { duration: DEFAULT_DURATION, ...(options ?? {}) };
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
  success: (message: string, options?: ExternalToast) => {
    emitToast(message, "success", options?.duration as number | undefined);
    return sonnerToast.success(message, withDefaults(options));
  },
  error: (message: string, options?: ExternalToast) => {
    emitToast(message, "error", options?.duration as number | undefined);
    return sonnerToast.error(message, withDefaults(options));
  },
  info: (message: string, options?: ExternalToast) => {
    emitToast(message, "info", options?.duration as number | undefined);
    return sonnerToast.info(message, withDefaults(options));
  },
  warning: (message: string, options?: ExternalToast) => {
    emitToast(message, "warning", options?.duration as number | undefined);
    return sonnerToast.warning(message, withDefaults(options));
  },
  message: (message: string, options?: ExternalToast) => {
    emitToast(message, "message", options?.duration as number | undefined);
    return sonnerToast.message(message, withDefaults(options));
  },
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};
