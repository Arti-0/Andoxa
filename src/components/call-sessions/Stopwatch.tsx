"use client";

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Play, Pause, Square } from "lucide-react";

export interface StopwatchHandle {
  start: () => void;
  pause: () => void;
  stop: () => number;
  reset: () => void;
}

interface StopwatchProps {
  onStop?: (durationSeconds: number) => void;
  onTick?: (durationSeconds: number) => void;
  autoStart?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const Stopwatch = forwardRef<StopwatchHandle, StopwatchProps>(function Stopwatch(
  { onStop, onTick, autoStart = false, size = "md", className = "" },
  ref
) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
    const total = elapsed;
    onStop?.(total);
    return total;
  }, [elapsed, onStop]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    startTimeRef.current = Date.now();
    accumulatedRef.current = elapsed;
    setRunning(true);

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const current =
        accumulatedRef.current +
        Math.floor((now - (startTimeRef.current ?? now)) / 1000);
      setElapsed(current);
      onTick?.(current);
    }, 1000);
  }, [elapsed, onTick]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    accumulatedRef.current = elapsed;
    setRunning(false);
  }, [elapsed]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsed(0);
    setRunning(false);
    accumulatedRef.current = 0;
    startTimeRef.current = null;
  }, []);

  useImperativeHandle(ref, () => ({ start, pause, stop, reset }), [start, pause, stop, reset]);

  useEffect(() => {
    if (autoStart) start();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sizeClasses = {
    sm: "text-lg",
    md: "text-3xl",
    lg: "text-5xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span
        className={`font-mono font-bold tabular-nums ${sizeClasses[size]} ${
          running ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {formatTime(elapsed)}
      </span>

      <div className="flex items-center gap-1">
        {!running ? (
          <button
            onClick={start}
            className="rounded-full bg-green-600 p-2 text-white hover:bg-green-700 transition-colors"
            title="Démarrer"
          >
            <Play className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={pause}
            className="rounded-full bg-amber-500 p-2 text-white hover:bg-amber-600 transition-colors"
            title="Pause"
          >
            <Pause className="h-4 w-4" />
          </button>
        )}

        {elapsed > 0 && (
          <button
            onClick={() => stop()}
            className="rounded-full bg-red-600 p-2 text-white hover:bg-red-700 transition-colors"
            title="Arrêter"
          >
            <Square className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
});

export { formatTime };
