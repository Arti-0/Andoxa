import { cn } from "@/lib/utils";

export const settingsFieldClass =
    "w-full bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:bg-black dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-white/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm";

export const settingsSaveButtonClass =
    "inline-flex shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-100";

export const settingsLabelClass =
    "text-sm font-medium text-zinc-700 dark:text-zinc-300";

type SettingsCardProps = {
    title: string;
    description?: string;
    children: React.ReactNode;
    variant?: "default" | "danger";
};

export function SettingsCard({
    title,
    description,
    children,
    variant = "default",
}: SettingsCardProps) {
    return (
        <section
            className={cn(
                "w-full overflow-hidden rounded-xl border bg-white dark:bg-[#111111]",
                variant === "default" &&
                    "border-zinc-200 dark:border-white/10",
                variant === "danger" && "border-red-500/20"
            )}
        >
            <header className="border-b border-zinc-200 px-6 py-4 dark:border-white/10">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {title}
                </h2>
                {description ? (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {description}
                    </p>
                ) : null}
            </header>
            <div className="flex flex-col gap-4 p-6">{children}</div>
        </section>
    );
}
