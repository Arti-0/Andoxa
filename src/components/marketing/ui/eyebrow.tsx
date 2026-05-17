import { cn } from "@/lib/utils";

/** Small uppercase kicker shown above section headings. */
export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("eyebrow", className)}>
      <span aria-hidden="true" className="h-px w-6 bg-[var(--brand-blue)]/40" />
      {children}
    </span>
  );
}
