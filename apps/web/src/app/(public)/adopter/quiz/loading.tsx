import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@shared/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Skeleton className="mb-4 h-4 w-44" />
        <Skeleton className="mb-3 h-6 w-44 rounded-full" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="mt-3 h-4 w-3/4" />
        <div className="mt-8 rounded-3xl border border-border bg-card p-8">
          <Skeleton className="mb-2 h-3 w-32" />
          <Skeleton className="mb-8 h-1.5 w-full rounded-full" />
          <Skeleton className="mb-6 h-8 w-3/4" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
