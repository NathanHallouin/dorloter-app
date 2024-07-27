import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { requireAuth } from "@infra/auth/session";

/**
 * Le layout fournit navbar + footer + flex. La largeur + padding sont gérés
 * par les pages via <PageContainer> pour garder la cohérence en responsabilité
 * locale (chaque page choisit sa variante narrow/stream/wide).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
