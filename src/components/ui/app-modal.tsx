"use client";

/**
 * AppModal — the single, consistent modal shell for the app.
 *
 * Wraps the Radix Dialog primitive with a fixed visual contract so every
 * modal shares the same size system, padding, header, scroll behaviour and
 * sticky footer. Build product modals by composing this rather than styling
 * <DialogContent> ad-hoc (which is how we ended up with a dozen mismatched
 * sizes).
 *
 *   <AppModal open={open} onOpenChange={setOpen} title="…" description="…"
 *             size="lg" footer={<…buttons…/>}>
 *     …scrollable body…
 *   </AppModal>
 *
 * Two sizes cover the app:
 *   • "md"  — forms (create prospect, rename, simple confirms)
 *   • "xl"  — data-heavy flows that need a wide datatable preview (CSV import)
 */

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AppModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AppModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  footer,
  children,
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: AppModalSize;
  /** Sticky footer (usually the Cancel / Confirm buttons). */
  footer?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Consistent contract: full-width on mobile, capped per size, never
          // taller than the viewport — the body scrolls, header/footer pin.
          "flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0",
          SIZE_CLASS[size],
          contentClassName,
        )}
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-[16px]">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-[13px]">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
