import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@shared/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <section className="border-b border-sable-200 bg-linear-to-br from-coral-50 via-white to-lavande-50 px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl space-y-4">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-6 w-44 rounded-full" />
            <Skeleton className="h-12 w-2/3 max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:max-w-2xl">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-sable-200 bg-white px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <Skeleton className="mb-4 h-6 w-44" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <Skeleton className="mb-6 h-6 w-44" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
