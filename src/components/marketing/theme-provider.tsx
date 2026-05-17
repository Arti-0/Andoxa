"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes wrapper for the marketing site — system preference on first
 * visit, persisted choice, `.dark` class on <html>.
 */
export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
