import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@shared/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-44 rounded-full" />
        </div>
        <div className="mb-8 flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Skeleton className="mb-8 h-[420px] w-full rounded-xl" />
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="w-1.5 bg-sable-200" />
              <Skeleton className="aspect-square w-28 rounded-none sm:w-32" />
              <div className="flex-1 space-y-2 p-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
