import { Skeleton } from "@shared/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

export default function Loading() {
  return (
    <PageContainer variant="wide" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </PageContainer>
  );
}
