import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // TODO: Vérifier la session via Better Auth
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8">{children}</main>
      <Footer />
    </>
  );
}
