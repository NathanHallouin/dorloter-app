import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@shared/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Skeleton className="mb-6 h-4 w-44" />

        <div className="mb-8 overflow-hidden rounded-lg border-l-4 border-sable-200 bg-card">
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-40 rounded-sm" />
            <Skeleton className="h-9 w-2/3" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Skeleton className="col-span-2 row-span-2 aspect-video rounded-lg" />
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="aspect-square rounded-lg" />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
          <aside className="space-y-4">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-44 rounded-lg" />
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
