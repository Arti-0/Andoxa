import {
  CardGridSkeleton,
  PageHeaderSkeleton,
} from "@/components/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard2Loading() {
  return (
    <div className="p-6 space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <CardGridSkeleton count={2} />
      <CardGridSkeleton count={2} />
    </div>
  );
}
