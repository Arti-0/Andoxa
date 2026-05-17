import { cn } from "@/lib/utils";

/**
 * Browser-chrome frame for the marketing site. Originally wrapped a static
 * screenshot <Image>; now wraps a live product-UI mockup component
 * (`@/components/marketing/mockups/*`) so the imagery is real, crisp and
 * tweakable. Pass the mockup as `children`.
 */
export function ScreenshotFrame({
  children,
  className,
  url = "andoxa.fr",
}: {
  children: React.ReactNode;
  className?: string;
  url?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--border)] bg-card shadow-[0_18px_48px_-22px_rgba(0,82,217,0.22)]",
        className,
      )}
    >
      {/* Faux Mac chrome */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--border)] bg-[var(--neutral-50)] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#FF5F57]/70" />
        <span className="h-2 w-2 rounded-full bg-[#FEBC2E]/70" />
        <span className="h-2 w-2 rounded-full bg-[#28C840]/70" />
        <div className="ml-2 inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          <span className="h-1 w-1 rounded-full bg-[var(--brand-blue)]" />
          {url}
        </div>
      </div>
      <div className="relative aspect-[16/10] w-full overflow-hidden">{children}</div>
    </div>
  );
}
