"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LogoDisplayProps {
  className?: string;
  /** When true, show icon only (for collapsed sidebar). Uses group-data-[collapsible=icon] when not provided. */
  collapsed?: boolean;
}

export function LogoDisplay({ className = "", collapsed }: LogoDisplayProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const logoSrc = isDark
    ? "/assets/logofiles/andoxa-logo-dark.svg"
    : "/assets/logofiles/andoxa-logo-light.svg";

  const iconSrc = isDark
    ? "/assets/logofiles/andoxa-mark-dark.svg"
    : "/assets/logofiles/andoxa-mark-light.svg";

  const iconClasses =
    collapsed === true
      ? "block"
      : collapsed === false
        ? "hidden"
        : "hidden group-data-[collapsible=icon]:block";
  const logoClasses =
    collapsed === true
      ? "hidden"
      : collapsed === false
        ? "block"
        : "group-data-[collapsible=icon]:hidden";

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt="Andoxa Logo"
        className={cn("h-5 w-auto", logoClasses, className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc}
        alt="Andoxa Icon"
        className={cn("h-8 w-8", iconClasses, className)}
      />
    </>
  );
}
