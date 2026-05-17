import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Marketing-site button. Renders an <a>/<Link> when `href` is set, otherwise a
 * <button>. Distinct from the app's shadcn Button (`@/components/ui/button`) —
 * this one is link-first and carries the brand-blue look. Lives under
 * `@/components/marketing/ui` so the two never collide.
 */
type Variant = "default" | "ghost" | "outline";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  default:
    "bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue-dark)] active:bg-[var(--brand-blue-dark)] shadow-[0_8px_24px_-12px_rgba(0,82,217,0.55)]",
  ghost: "bg-transparent text-foreground hover:bg-[var(--neutral-100)]",
  outline:
    "border border-[var(--border)] bg-card text-foreground hover:border-[var(--brand-blue)]/40 hover:bg-[var(--neutral-50)]",
};

const SIZES: Record<Size, string> = {
  md: "h-10 px-4 text-sm gap-1.5",
  lg: "h-12 px-6 text-[15px] gap-2",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsLink = CommonProps & {
  href: string;
  onClick?: () => void;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

function classes(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button(props: ButtonAsLink | ButtonAsButton) {
  const { variant = "default", size = "md", className, children } = props;
  if (props.href) {
    const { href, onClick } = props;
    return (
      <Link href={href} onClick={onClick} className={classes(variant, size, className)}>
        {children}
      </Link>
    );
  }
  const rest: Record<string, unknown> = { ...(props as ButtonAsButton) };
  delete rest.href;
  delete rest.variant;
  delete rest.size;
  delete rest.className;
  delete rest.children;
  return (
    <button
      className={classes(variant, size, className)}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
