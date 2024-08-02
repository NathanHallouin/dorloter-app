import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@shared/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-32 md:pb-8">
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-2/3" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="space-y-2 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="space-y-3 pt-6">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
          <div className="hidden space-y-4 md:block">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
