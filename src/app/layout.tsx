import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import QueryProvider from "@/components/QueryProvider";
import { SentryClientInit } from "@/components/SentryClientInit";
import { Toaster } from "@/components/ui/sonner";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Andoxa",
  description: "CRM moderne pour gérer vos prospects et campagnes",
  icons: {
    icon: [
      { url: "/assets/favicon/icon0.svg", type: "image/svg+xml" },
      { url: "/assets/favicon/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/assets/favicon/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/assets/favicon/favicon.ico", sizes: "any" },
    ],
    apple: "/assets/favicon/apple-touch-icon.png",
  },
  manifest: "/assets/favicon/manifest.json",
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
        <SentryClientInit>
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
        </SentryClientInit>
      </body>
    </html>
  );
}
