import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import QueryProvider from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Andoxa",
  description: "CRM moderne pour gérer vos prospects et campagnes",
};

/**
 * Root Layout
 * 
 * Minimal setup:
 * - Theme provider (dark/light mode)
 * - Global styles
 * 
 * Note: Auth and workspace logic is in (protected)/layout.tsx
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
