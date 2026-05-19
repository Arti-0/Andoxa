import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IntegrationCardProps = {
    logo: ReactNode;
    name: string;
    sub?: string;
    status?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
};

export function IntegrationCard({
    logo,
    name,
    sub,
    status,
    action,
    children,
    className,
    bodyClassName,
}: IntegrationCardProps) {
    return (
        <section
            className={cn(
                "w-full overflow-hidden rounded-[14px] border border-border bg-card",
                className
            )}
        >
            <header className="flex items-center gap-[14px] border-b border-border px-6 py-[18px]">
                <div className="shrink-0">{logo}</div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                            {name}
                        </h3>
                        {status}
                    </div>
                    {sub ? (
                        <p className="mt-0.5 text-[13px] leading-[1.4] text-muted-foreground">
                            {sub}
                        </p>
                    ) : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </header>
            <div className={cn("flex flex-col gap-4 px-6 py-5", bodyClassName)}>
                {children}
            </div>
        </section>
    );
}
