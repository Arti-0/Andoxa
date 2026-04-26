import { Skeleton } from "@/components/ui/skeleton";

export default function MessagerieLoading() {
  return (
    <div className="flex h-full">
      <div className="w-80 border-r p-4 space-y-3">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-center py-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 p-6 space-y-3">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-16 ${
                i % 2 === 0 ? "w-3/4" : "w-2/3 ml-auto"
              } rounded-lg`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
