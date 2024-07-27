import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@shared/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <section className="relative">
          <Skeleton className="h-56 rounded-none sm:h-72" />
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="relative -mt-16 flex flex-wrap items-end gap-4 sm:-mt-20">
              <Skeleton className="h-24 w-24 shrink-0 rounded-2xl border-4 border-white sm:h-28 sm:w-28" />
              <div className="min-w-0 flex-1 space-y-2 pb-2">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex flex-wrap gap-2 pb-2">
                <Skeleton className="h-9 w-24 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Skeleton className="mb-4 h-6 w-56" />
              <div className="grid gap-6 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-4/5 rounded-3xl" />
                ))}
              </div>
            </div>
            <aside className="space-y-6">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
