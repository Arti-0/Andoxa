"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Beam = {
  initialX: number;
  translateX: number;
  duration: number;
  repeatDelay: number;
  delay: number;
  className?: string;
};

const BEAMS: (Beam & { warm?: boolean })[] = [
  { initialX: 10, translateX: 10, duration: 7, repeatDelay: 3, delay: 2 },
  { initialX: 600, translateX: 600, duration: 3, repeatDelay: 3, delay: 4, warm: true },
  { initialX: 100, translateX: 100, duration: 7, repeatDelay: 7, delay: 0 },
  { initialX: 400, translateX: 400, duration: 5, repeatDelay: 14, delay: 4 },
  { initialX: 800, translateX: 800, duration: 11, repeatDelay: 2, delay: 0, warm: true },
  { initialX: 1000, translateX: 1000, duration: 4, repeatDelay: 2, delay: 0 },
  { initialX: 1200, translateX: 1200, duration: 6, repeatDelay: 4, delay: 2 },
];

export function BackgroundBeamsWithCollision({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const parentRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={parentRef}
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden",
        "bg-gradient-to-b from-[var(--brand-blue-tint)] via-background to-background",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 -z-0 h-[640px] w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-blue-tint)] opacity-90 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[10%] right-[5%] -z-0 h-[400px] w-[600px] rounded-full bg-[var(--brand-orange-tint)] opacity-70 blur-3xl"
      />
      {BEAMS.map((beam) => (
        <CollisionMechanism
          key={`${beam.initialX}-${beam.duration}`}
          beam={beam}
          warm={beam.warm}
          containerRef={containerRef}
          parentRef={parentRef}
        />
      ))}

      {children}

      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full"
        style={{
          boxShadow: "0 0 24px rgba(0, 82, 217, 0.18), 0 0 8px rgba(255, 103, 0, 0.08)",
        }}
      />
    </div>
  );
}

function CollisionMechanism({
  beam,
  warm,
  containerRef,
  parentRef,
}: {
  beam: Beam;
  warm?: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  parentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const beamRef = React.useRef<HTMLDivElement>(null);
  const [collision, setCollision] = React.useState<{
    detected: boolean;
    coordinates: { x: number; y: number } | null;
  }>({ detected: false, coordinates: null });
  const [beamKey, setBeamKey] = React.useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = React.useState(false);

  React.useEffect(() => {
    const checkCollision = () => {
      if (
        beamRef.current &&
        containerRef.current &&
        parentRef.current &&
        !cycleCollisionDetected
      ) {
        const beamRect = beamRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();
        if (beamRect.bottom >= containerRect.top) {
          const relativeX = beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = beamRect.bottom - parentRect.top;
          setCollision({ detected: true, coordinates: { x: relativeX, y: relativeY } });
          setCycleCollisionDetected(true);
        }
      }
    };
    const interval = setInterval(checkCollision, 50);
    return () => clearInterval(interval);
  }, [cycleCollisionDetected, containerRef, parentRef]);

  React.useEffect(() => {
    if (collision.detected && collision.coordinates) {
      const t = setTimeout(() => {
        setCollision({ detected: false, coordinates: null });
        setCycleCollisionDetected(false);
      }, 2000);
      const t2 = setTimeout(() => setBeamKey((p) => p + 1), 2000);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
  }, [collision]);

  return (
    <>
      <motion.div
        key={beamKey}
        ref={beamRef}
        animate="animate"
        initial={{ translateY: "-200px", translateX: `${beam.initialX}px`, rotate: 0 }}
        variants={{
          animate: { translateY: "1800px", translateX: `${beam.translateX}px`, rotate: 0 },
        }}
        transition={{
          duration: beam.duration,
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
          delay: beam.delay,
          repeatDelay: beam.repeatDelay,
        }}
        className={cn(
          "absolute left-0 top-20 m-auto h-14 w-px rounded-full",
          warm
            ? "bg-gradient-to-t from-[var(--brand-orange)] via-[var(--brand-orange-light)] to-transparent"
            : "bg-gradient-to-t from-[var(--brand-blue)] via-[var(--brand-blue-light)] to-transparent",
          beam.className,
        )}
      />
      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
            warm={warm}
            style={{
              left: `${collision.coordinates.x}px`,
              top: `${collision.coordinates.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Explosion({ style, warm }: { style: React.CSSProperties; warm?: boolean }) {
  const spans = React.useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        directionX: Math.floor(Math.random() * 80 - 40),
        directionY: Math.floor(Math.random() * -50 - 10),
      })),
    [],
  );
  const flashColor = warm ? "var(--brand-orange)" : "var(--brand-blue)";
  const partColor = warm
    ? "from-[var(--brand-orange)] to-[var(--brand-orange-light)]"
    : "from-[var(--brand-blue)] to-[var(--brand-blue-light)]";
  return (
    <div className="absolute z-50 h-2 w-2" style={style}>
      <motion.div
        initial={{ opacity: 0.7, scale: 0 }}
        animate={{ opacity: 1, scale: 1.5 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute -inset-x-10 top-0 h-2 w-20 rounded-full blur-sm"
        style={{
          background: `linear-gradient(to right, transparent, ${flashColor}, transparent)`,
        }}
      />
      {spans.map((s) => (
        <motion.span
          key={s.id}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: s.directionX, y: s.directionY, opacity: 0 }}
          transition={{ duration: Math.random() * 1.2 + 0.4, ease: "easeOut" }}
          className={cn("absolute h-1 w-1 rounded-full bg-gradient-to-b", partColor)}
        />
      ))}
    </div>
  );
}
