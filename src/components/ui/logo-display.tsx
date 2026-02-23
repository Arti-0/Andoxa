"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LogoDisplayProps {
  className?: string;
}

export function LogoDisplay({ className = "" }: LogoDisplayProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use resolvedTheme for more reliable theme detection
  const isDark = resolvedTheme === "dark";

  // Determine which logo to show based on theme
  const logoSrc = isDark
    ? "/assets/logofiles/logo_3.svg"
    : "/assets/logofiles/logo_1.svg";

  const iconSrc = isDark
    ? "/assets/logofiles/logo_mark%203.svg"
    : "/assets/logofiles/logo_mark%201.svg";

  // Show nothing during hydration to prevent mismatch
  if (!mounted) {
    return (
      <>
        {/* Full Logo - Default to light theme during SSR */}
        <Image
          src="/assets/logofiles/logo_1.svg"
          alt="Andoxa Logo"
          width={80}
          height={24}
          className={`h-5 w-auto group-data-[collapsible=icon]:hidden ${className}`}
          priority
        />

        {/* Icon - Default to light theme during SSR */}
        <Image
          src="/assets/logofiles/logo_mark%201.svg"
          alt="Andoxa Icon"
          width={32}
          height={32}
          className={`h-8 w-8 hidden group-data-[collapsible=icon]:block ${className}`}
          priority
        />
      </>
    );
  }

  return (
    <>
      {/* Full Logo */}
      <Image
        src={logoSrc}
        alt="Andoxa Logo"
        width={80}
        height={24}
        className={`h-5 w-auto group-data-[collapsible=icon]:hidden ${className}`}
        priority
      />

      {/* Icon */}
      <Image
        src={iconSrc}
        alt="Andoxa Icon"
        width={32}
        height={32}
        className={`h-8 w-8 hidden group-data-[collapsible=icon]:block ${className}`}
        priority
      />
    </>
  );
}
