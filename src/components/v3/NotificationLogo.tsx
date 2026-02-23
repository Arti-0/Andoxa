"use client";

import { useReducer, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { subscribeToToastEvents } from "@/lib/toast";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

// Global toast queue - simple implementation
let toastQueue: Toast[] = [];
let toastListeners: Array<(toasts: Toast[]) => void> = [];

function addToast(toast: Omit<Toast, "id">) {
  const id = Math.random().toString(36).substring(7);
  const newToast: Toast = { ...toast, id };
  toastQueue = [...toastQueue, newToast];
  toastListeners.forEach((listener) => listener([...toastQueue]));

  // Auto remove after duration
  const duration = toast.duration || 7000;
  setTimeout(() => {
    removeToast(id);
  }, duration);
}

function removeToast(id: string) {
  toastQueue = toastQueue.filter((t) => t.id !== id);
  toastListeners.forEach((listener) => listener([...toastQueue]));
}

function subscribeToToasts(listener: (toasts: Toast[]) => void) {
  toastListeners.push(listener);
  return () => {
    toastListeners = toastListeners.filter((l) => l !== listener);
  };
}

// Lerp pour animation fluide
const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

// 1. Définition de la structure de l'état
interface HubState {
  isExpanded: boolean;
  toasts: Toast[];
}

// 2. Définition des actions possibles
type HubAction =
  | { type: "SET_TOASTS"; payload: Toast[] }
  | { type: "TOGGLE_EXPANDED" }
  | { type: "FORCE_EXPAND" };

// 3. Le Reducer (Logique pure centralisée)
function hubReducer(state: HubState, action: HubAction): HubState {
  switch (action.type) {
    case "SET_TOASTS":
      return { ...state, toasts: action.payload };
    case "TOGGLE_EXPANDED":
      return { ...state, isExpanded: !state.isExpanded };
    case "FORCE_EXPAND":
      return { ...state, isExpanded: true };
    default:
      return state;
  }
}

const initialState: HubState = {
  isExpanded: false,
  toasts: [],
};

interface NotificationLogoProps {
  /**
   * Position du logo sur l'écran
   * Par défaut: bottom-right
   */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /**
   * Si true, désactive le drag (pour usage dans le header)
   */
  disableDrag?: boolean;
}

export function NotificationLogo({ position = "bottom-right", disableDrag = true }: NotificationLogoProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Centralisation de l'état UI avec useReducer
  const [state, dispatch] = useReducer(hubReducer, initialState);
  const [currentCorner, setCurrentCorner] = useState(position);
  const [isMounted, setIsMounted] = useState(false);

  // Refs pour performance (pas de re-renders)
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  // Initialiser les positions avec la position du coin dès le début pour éviter le flash
  const getInitialPosition = useCallback(() => {
    const buttonSize = 40;
    const padding = 16;
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    switch (position) {
      case "top-left":
        return { x: padding, y: padding };
      case "top-right":
        return { x: viewportWidth - buttonSize - padding, y: padding };
      case "bottom-left":
        return { x: padding, y: viewportHeight - buttonSize - padding };
      case "bottom-right":
        return { x: viewportWidth - buttonSize - padding, y: viewportHeight - buttonSize - padding };
    }
  }, [position]);

  const initialPos = getInitialPosition();
  const positionRef = useRef(initialPos);
  const targetRef = useRef(initialPos);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const snapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const DRAG_DELAY = 0.2; // Facteur de lerp (0.1 = lent, 0.3 = réactif)

  // Hide on /auth routes
  const shouldHide = pathname?.startsWith("/auth") ?? false;

  // Subscribe to toast events from the toast utility
  useEffect(() => {
    console.log("[NotificationLogo] Subscribing to toast events");
    const unsubscribe = subscribeToToastEvents((message, type, duration) => {
      console.log("[NotificationLogo] Toast received:", { message, type, duration });
      addToast({ message, type, duration });
    });
    return unsubscribe;
  }, []);

  // Subscribe to toast queue updates - sync avec le reducer
  useEffect(() => {
    let previousLength = state.toasts.length;

    const unsubscribe = subscribeToToasts((newToasts) => {
      // Si une nouvelle notif arrive, on update et on force l'ouverture
      if (newToasts.length > previousLength) {
        dispatch({ type: "FORCE_EXPAND" });
      }
      dispatch({ type: "SET_TOASTS", payload: newToasts });
      previousLength = newToasts.length;
    });
    return unsubscribe;
  }, [state.toasts.length]);

  // Get corner position
  const getCornerPosition = useCallback((corner: typeof position) => {
    const buttonSize = 40; // w-10 h-10 = 40px
    const padding = 16; // 4 * 4px = 16px (top-4 left-4)

    if (typeof window === "undefined") return { x: 0, y: 0 };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    switch (corner) {
      case "top-left":
        return { x: padding, y: padding };
      case "top-right":
        return { x: viewportWidth - buttonSize - padding, y: padding };
      case "bottom-left":
        return { x: padding, y: viewportHeight - buttonSize - padding };
      case "bottom-right":
        return { x: viewportWidth - buttonSize - padding, y: viewportHeight - buttonSize - padding };
    }
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!containerRef.current) return;

    // Lerp vers la cible
    positionRef.current.x = lerp(positionRef.current.x, targetRef.current.x, DRAG_DELAY);
    positionRef.current.y = lerp(positionRef.current.y, targetRef.current.y, DRAG_DELAY);

    // Appliquer la transformation
    containerRef.current.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`;

    // Continuer l'animation si on est proche de la cible ou si on drag
    const dx = Math.abs(targetRef.current.x - positionRef.current.x);
    const dy = Math.abs(targetRef.current.y - positionRef.current.y);

    if (isDraggingRef.current || dx > 0.1 || dy > 0.1) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, []);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disableDrag) return; // Désactiver le drag si disableDrag est true
    if (!buttonRef.current || !containerRef.current) return;

    isDraggingRef.current = true;
    hasDraggedRef.current = false;

    // Annuler le snap en cours
    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }

    // Capturer la position initiale relative
    const rect = containerRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // Initialiser les positions
    positionRef.current = { x: rect.left, y: rect.top };
    targetRef.current = { x: rect.left, y: rect.top };

    // Désactiver la transition CSS
    containerRef.current.style.transition = "none";

    // Handler pour pointer move
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;

      // Marquer comme drag si mouvement significatif
      if (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2) {
        hasDraggedRef.current = true;
      }

      // Mettre à jour la cible (position absolue de la souris moins l'offset)
      targetRef.current = {
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      };
    };

    // Handler pour pointer up
    const handlePointerUp = () => {
      isDraggingRef.current = false;

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      // Calculer le coin le plus proche
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const distances = {
      "top-left": Math.sqrt(centerX ** 2 + centerY ** 2),
      "top-right": Math.sqrt((viewportWidth - centerX) ** 2 + centerY ** 2),
      "bottom-left": Math.sqrt(centerX ** 2 + (viewportHeight - centerY) ** 2),
      "bottom-right": Math.sqrt(
        (viewportWidth - centerX) ** 2 + (viewportHeight - centerY) ** 2
      ),
    };

    const closestCorner = Object.entries(distances).reduce((a, b) =>
      distances[a[0] as keyof typeof distances] < distances[b[0] as keyof typeof distances]
        ? a
        : b
    )[0] as typeof position;

        setCurrentCorner(closestCorner);

        // Après 1 seconde, snap vers le coin avec ease-in
        snapTimeoutRef.current = setTimeout(() => {
          const cornerPos = getCornerPosition(closestCorner);

          // Réactiver la transition CSS pour le snap
          if (containerRef.current) {
            containerRef.current.style.transition = "transform 0.8s ease-in";
            targetRef.current = cornerPos;
            requestRef.current = requestAnimationFrame(animate);
          }
        }, 1000);
      }
    };

    // Écouteurs sur window
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    // Démarrer l'animation
    requestRef.current = requestAnimationFrame(animate);
  }, [animate, getCornerPosition]);

  // Handle click
  const handleClick = useCallback(() => {
    if (!hasDraggedRef.current && !state.isExpanded) {
      router.push("/v3");
    }
    hasDraggedRef.current = false;
  }, [router, state.isExpanded]);

  // Position classes - toujours utiliser top-0 left-0, le transform gère la position
  const positionClasses = "top-0 left-0";

  // Get toast icon
  const getToastIcon = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  // Get toast bg color
  const getToastBgColor = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800";
      case "error":
        return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "info":
        return "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800";
    }
  };

  // Initialiser la position après le montage côté client uniquement (évite le mismatch d'hydratation)
  useEffect(() => {
    setIsMounted(true);
    if (containerRef.current && !isDraggingRef.current) {
      const cornerPos = getCornerPosition(currentCorner);
      positionRef.current = cornerPos;
      targetRef.current = cornerPos;
      containerRef.current.style.transition = "none";
      containerRef.current.style.transform = `translate3d(${cornerPos.x}px, ${cornerPos.y}px, 0)`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // S'exécute une seule fois au montage

  // Initialize position when corner changes (après le montage)
  useEffect(() => {
    if (isMounted && containerRef.current && !isDraggingRef.current) {
      const cornerPos = getCornerPosition(currentCorner);
      positionRef.current = cornerPos;
      targetRef.current = cornerPos;
      containerRef.current.style.transition = "none";
      containerRef.current.style.transform = `translate3d(${cornerPos.x}px, ${cornerPos.y}px, 0)`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCorner, isMounted]); // getCornerPosition est stable (useCallback)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current) {
        clearTimeout(snapTimeoutRef.current);
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Always show the button (feature flag check removed for visibility)
  if (shouldHide) {
    return null;
  }

  // Si disableDrag, utiliser un style inline simple pour le header
  if (disableDrag) {
    const handleHeaderClick = () => {
      if (state.toasts.length > 0) {
        dispatch({ type: "TOGGLE_EXPANDED" });
      }
    };

    return (
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleHeaderClick}
          className="relative w-10 h-10 rounded-full border border-blue-500/60 dark:border-blue-400/60 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          style={{ borderWidth: "1px" }}
        >
          <Image
            src="/assets/logofiles/logo_mark 2 copie.jpg"
            alt="Andoxa Logo"
            width={40}
            height={40}
            className="rounded-full object-cover"
            unoptimized
          />
          {state.toasts.length > 0 && !state.isExpanded && (
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {state.toasts.length > 9 ? "9+" : state.toasts.length}
            </div>
          )}
        </button>
        <AnimatePresence>
          {state.isExpanded && state.toasts.length > 0 && (
            <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto space-y-2 z-50">
              {state.toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`rounded-lg border p-4 shadow-lg ${getToastBgColor(toast.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getToastIcon(toast.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {toast.message}
                      </p>
                    </div>
                    <button
                      onClick={() => removeToast(toast.id)}
                      className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label="Fermer la notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed ${positionClasses} z-notification pointer-events-none`}
    >
      <div className="relative pointer-events-auto">
        {/* Logo Button */}
        <button
          ref={buttonRef}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          className="relative w-10 h-10 rounded-full border border-blue-500/60 dark:border-blue-400/60 flex items-center justify-center cursor-pointer btn-neumorphism hover:scale-105 active:scale-95 transition-transform"
          style={{ borderWidth: "1px" }}
        >
          {/* Logo Image */}
          <Image
            src="/assets/logofiles/logo_mark 2 copie.jpg"
            alt="Andoxa Logo"
            width={40}
            height={40}
            className="rounded-full object-cover"
            unoptimized
          />
        </button>

        {/* Expanded Toast Container */}
        <AnimatePresence>
          {state.isExpanded && state.toasts.length > 0 && (
            <div
              className={`absolute mb-2 w-80 max-h-96 overflow-y-auto space-y-2 ${
                currentCorner.includes("bottom") ? "bottom-full mb-2" : "top-full mt-2"
              } ${
                currentCorner.includes("right") ? "right-0" : "left-0"
              }`}
            >
              {state.toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`rounded-lg border p-4 shadow-lg ${getToastBgColor(toast.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getToastIcon(toast.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {toast.message}
                      </p>
                    </div>
                    <button
                      onClick={() => removeToast(toast.id)}
                      className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label="Fermer la notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Badge for unread count */}
        {state.toasts.length > 0 && !state.isExpanded && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {state.toasts.length > 9 ? "9+" : state.toasts.length}
          </div>
        )}
      </div>
    </div>
  );
}
