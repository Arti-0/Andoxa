"use client";

import * as React from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 3D-tilted container that un-tilts and scales up as the user scrolls into the
 * section, revealing the content (typically a product mockup).
 */
export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent?: React.ReactNode;
  children: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const scaleDimensions = isMobile ? [0.7, 0.95] : [1.05, 1];
  const rotate = useTransform(scrollYProgress, [0, 0.5], [22, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], scaleDimensions);
  const translate = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-[110vh] items-center justify-center px-4 py-20 sm:py-32"
      style={{ perspective: "1200px" }}
    >
      <div className="relative w-full max-w-6xl" style={{ transformStyle: "preserve-3d" }}>
        {titleComponent && (
          <motion.div style={{ translateY: translate }} className="mx-auto max-w-2xl text-center">
            {titleComponent}
          </motion.div>
        )}
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </section>
  );
}

function Card({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className={cn(
        "mx-auto -mt-12 h-[28rem] w-full rounded-[20px] border border-[var(--border)] bg-card p-2 shadow-2xl sm:h-[36rem] sm:rounded-[24px] sm:p-3",
        "lg:h-[40rem]",
      )}
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-[var(--neutral-50)]">
        {children}
      </div>
    </motion.div>
  );
}
