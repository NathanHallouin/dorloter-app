import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@shared/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mb-6 space-y-2 text-center">
          <Skeleton className="mx-auto h-9 w-72" />
          <Skeleton className="mx-auto h-4 w-56" />
        </div>
        <div className="relative mx-auto aspect-[3/4] w-full max-w-md">
          <Skeleton className="absolute inset-0 rounded-3xl" />
          <Skeleton className="absolute inset-x-2 -bottom-2 h-full -translate-y-1 rounded-3xl opacity-60" />
          <Skeleton className="absolute inset-x-4 -bottom-4 h-full -translate-y-2 rounded-3xl opacity-30" />
        </div>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
      </main>
      <Footer />
    </>
  );
}
