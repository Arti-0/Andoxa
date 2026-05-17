import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const settingsFieldClass =
    "w-full bg-card text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 border border-border rounded-[9px] px-3 h-10 text-sm leading-none transition-colors hover:border-muted-foreground/40";

export const settingsSaveButtonClass =
    "inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-4 h-9 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50";

export const settingsLabelClass =
    "text-[13px] font-medium tracking-[-0.005em] text-foreground";

type SettingsCardProps = {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
    variant?: "default" | "danger";
    bodyClassName?: string;
};

export function SettingsCard({
    title,
    description,
    icon,
    action,
    footer,
    children,
    variant = "default",
    bodyClassName,
}: SettingsCardProps) {
    return (
        <section
            className={cn(
                "w-full overflow-hidden rounded-[14px] border bg-card",
                variant === "default" && "border-border",
                variant === "danger" &&
                    "border-[color-mix(in_oklab,var(--destructive)_18%,var(--border))]"
            )}
        >
            <header
                className={cn(
                    "flex items-start justify-between gap-4 border-b border-border px-6 py-5",
                    variant === "danger" &&
                        "bg-[color-mix(in_oklab,var(--destructive)_4%,var(--card))]"
                )}
            >
                <div className="flex min-w-0 items-start gap-3">
                    {icon ? (
                        <div className="mt-0.5 flex shrink-0 text-muted-foreground [&_svg]:size-[18px]">
                            {icon}
                        </div>
                    ) : null}
                    <div className="min-w-0">
                        <h2 className="text-[15px] font-semibold leading-tight tracking-[-0.005em] text-foreground">
                            {title}
                        </h2>
                        {description ? (
                            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </header>
            <div
                className={cn(
                    "flex flex-col gap-4 px-6 py-5",
                    bodyClassName
                )}
            >
                {children}
            </div>
            {footer ? (
                <footer className="flex items-center justify-between gap-3 border-t border-border bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] px-6 py-3.5">
                    {footer}
                </footer>
            ) : null}
        </section>
    );
}
