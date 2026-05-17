import type { ReactNode } from "react";
import Link from "next/link";
import { AndoxaWordmark } from "@/components/marketing/icons/brand-icons";
import { ThemeToggle } from "@/components/marketing/ui/theme-toggle";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { cn } from "@/lib/utils";

/**
 * Shared shell for unauthenticated / pre-org pages (login, password reset,
 * account inactive, auth error). Minimal header (wordmark + theme toggle, no
 * marketing nav), neutral background, centered card column.
 *
 * Use this instead of the archived onboarding header (**`_legacy/marketing-homepage-archive/homepage/UnifiedHeader`**) or `_legacy/auth/auth-layout.tsx` — they are legacy "glass + animated shapes" shells tied to obsolete marketing chrome.
 *
 * `tone="default"` is the standard centered form. `tone="message"` widens the
 * column a touch and is used for inactive / error pages that show a single
 * informational card with multiple actions.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  tone = "default",
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: "default" | "message";
  children: ReactNode;
}) {
  const maxW = tone === "message" ? "max-w-lg" : "max-w-md";

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
        <Container className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)]"
            aria-label="Andoxa — retour à l'accueil"
          >
            <AndoxaWordmark height={22} />
          </Link>
          <ThemeToggle />
        </Container>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
        <div className={cn("w-full", maxW)}>
          <div className="mb-8 text-center">
            {eyebrow ? <Eyebrow className="justify-center">{eyebrow}</Eyebrow> : null}
            <h1 className="font-display mt-3 text-3xl tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
