import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { ConsoleHome } from "@/pages/ConsoleHome";

// Console refuge
import { ShelterConsoleLayout } from "@/pages/shelter/ShelterConsoleLayout";
import { ShelterDashboardPage } from "@/pages/shelter/ShelterDashboardPage";
import { ShelterAnnoncesPage } from "@/pages/shelter/ShelterAnnoncesPage";
import { ShelterCandidaturesPage } from "@/pages/shelter/ShelterCandidaturesPage";
import { ShelterAdoptionsPage } from "@/pages/shelter/ShelterAdoptionsPage";
import { ShelterMessagesPage } from "@/pages/shelter/ShelterMessagesPage";
import { ShelterFostersPage } from "@/pages/shelter/ShelterFostersPage";
import { ShelterTeamPage } from "@/pages/shelter/ShelterTeamPage";
import { ShelterProfilePage } from "@/pages/shelter/ShelterProfilePage";

// Console pension
import { PensionConsoleLayout } from "@/pages/pension/PensionConsoleLayout";
import { PensionBookingsPage } from "@/pages/pension/PensionBookingsPage";

// Console admin plateforme
import { AdminConsoleLayout } from "@/pages/admin/AdminConsoleLayout";
import { AdminModerationPage } from "@/pages/admin/AdminModerationPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route index element={<ConsoleHome />} />

        <Route path="/refuge" element={<ShelterConsoleLayout />}>
          <Route index element={<ShelterDashboardPage />} />
          <Route path="animaux" element={<ShelterAnnoncesPage />} />
          <Route path="candidatures" element={<ShelterCandidaturesPage />} />
          <Route path="adoptions" element={<ShelterAdoptionsPage />} />
          <Route path="messages" element={<ShelterMessagesPage />} />
          <Route path="familles" element={<ShelterFostersPage />} />
          <Route path="equipe" element={<ShelterTeamPage />} />
          <Route path="profil" element={<ShelterProfilePage />} />
        </Route>

        <Route path="/pension" element={<PensionConsoleLayout />}>
          <Route index element={<PensionBookingsPage />} />
        </Route>

        <Route path="/admin" element={<AdminConsoleLayout />}>
          <Route index element={<AdminModerationPage />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <div className="grid min-h-screen place-items-center text-muted-foreground">
            Page introuvable
          </div>
        }
      />
    </Routes>
  );
}
