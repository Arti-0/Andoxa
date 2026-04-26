import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

export function CardGridSkeleton({
  count = 6,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="border-b bg-muted/50 p-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="border-b last:border-b-0 p-3 flex gap-4 items-center"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-5 max-w-xl">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function CalendarGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-8 gap-px rounded-lg border overflow-hidden">
        <Skeleton className="h-10 rounded-none" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-none" />
        ))}
        {Array.from({ length: 12 * 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-12 rounded-none"
          />
        ))}
      </div>
    </div>
  );
}

export function CanvasSkeleton() {
  return (
    <div className="w-full h-[600px] rounded-lg border bg-card/40 relative overflow-hidden">
      <div className="absolute inset-0 flex flex-col items-center pt-12 gap-8">
        <Skeleton className="h-[68px] w-[252px]" />
        <Skeleton className="h-[68px] w-[320px]" />
        <div className="flex gap-8">
          <Skeleton className="h-[68px] w-[252px]" />
          <Skeleton className="h-[68px] w-[252px]" />
        </div>
        <Skeleton className="h-[68px] w-[252px]" />
      </div>
    </div>
  );
}
