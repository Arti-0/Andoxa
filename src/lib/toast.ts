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
