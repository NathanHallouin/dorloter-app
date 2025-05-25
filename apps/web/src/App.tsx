import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { CatalogPage } from "@/pages/CatalogPage";
import { PetDetailPage } from "@/pages/PetDetailPage";
import { PensionsPage } from "@/pages/PensionsPage";
import { PensionDetailPage } from "@/pages/PensionDetailPage";
import { MyBookingsPage } from "@/pages/MyBookingsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { VetsPage } from "@/pages/VetsPage";
import { VetDetailPage } from "@/pages/VetDetailPage";
import { SheltersPage } from "@/pages/SheltersPage";
import { ShelterDetailPage } from "@/pages/ShelterDetailPage";
import { SwipePage } from "@/pages/SwipePage";
import { QuizPage } from "@/pages/QuizPage";
import { AboutPage } from "@/pages/AboutPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { MyFosterPage } from "@/pages/MyFosterPage";
import { ApplicationsPage } from "@/pages/ApplicationsPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

// Pages cartographiques : chargées à la demande (MapLibre est volumineux).
const ReportsPage = lazy(() =>
  import("@/pages/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
const ReportDetailPage = lazy(() =>
  import("@/pages/ReportDetailPage").then((m) => ({ default: m.ReportDetailPage })),
);
const CreateReportPage = lazy(() =>
  import("@/pages/CreateReportPage").then((m) => ({ default: m.CreateReportPage })),
);

// Les consoles pro (refuge, pension, admin plateforme) vivent dans apps/pro.

export function App() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-5xl px-4 py-8 text-stone-500">Chargement…</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/adopter" element={<CatalogPage />} />
          <Route path="/adopter/swipe" element={<SwipePage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/adopter/:id" element={<PetDetailPage />} />
          <Route path="/perdus-trouves" element={<ReportsPage />} />
          <Route path="/perdus-trouves/:id" element={<ReportDetailPage />} />
          <Route path="/pensions" element={<PensionsPage />} />
          <Route path="/pensions/:slug" element={<PensionDetailPage />} />
          <Route path="/veterinaires" element={<VetsPage />} />
          <Route path="/veterinaires/:slug" element={<VetDetailPage />} />
          <Route path="/refuges" element={<SheltersPage />} />
          <Route path="/refuges/:slug" element={<ShelterDetailPage />} />
          <Route path="/a-propos" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/perdus-trouves/nouveau" element={<CreateReportPage />} />
            <Route path="/profil" element={<ProfilePage />} />
            <Route path="/favoris" element={<FavoritesPage />} />
            <Route path="/mes-candidatures" element={<ApplicationsPage />} />
            <Route path="/mes-reservations" element={<MyBookingsPage />} />
            <Route path="/famille-accueil" element={<MyFosterPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:id" element={<MessagesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
