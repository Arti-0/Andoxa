import { Loader2 } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const onboardingContinueButtonClassName = cn(
    'h-10 min-h-10 rounded-xl px-7 text-sm font-semibold tracking-wide shadow-md',
    'ring-1 ring-zinc-900/15 transition-all active:scale-[0.98]',
    'bg-zinc-900 text-white hover:bg-zinc-800',
    'dark:bg-white dark:text-zinc-950 dark:ring-white/20 dark:hover:bg-zinc-200',
    'disabled:pointer-events-none disabled:opacity-45 disabled:active:scale-100'
);

export type OnboardingContinueButtonProps = Omit<
    ComponentProps<typeof Button>,
    'type'
> & {
    loading?: boolean;
};

export function OnboardingContinueButton({
    className,
    loading,
    children,
    disabled,
    ...props
}: OnboardingContinueButtonProps) {
    return (
        <Button
            type="button"
            className={cn(onboardingContinueButtonClassName, className)}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
                children
            )}
        </Button>
    );
}
