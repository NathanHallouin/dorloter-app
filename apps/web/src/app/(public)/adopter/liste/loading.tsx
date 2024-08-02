import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@shared/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <Skeleton className="mb-6 h-10 w-full max-w-md rounded-lg" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-4/5 rounded-3xl" />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
