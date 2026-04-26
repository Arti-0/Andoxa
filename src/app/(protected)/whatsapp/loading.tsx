import {
  CardGridSkeleton,
  PageHeaderSkeleton,
} from "@/components/skeletons/page-skeleton";

export default function WhatsappLoading() {
  return (
    <div className="p-6 space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={6} />
    </div>
  );
}
