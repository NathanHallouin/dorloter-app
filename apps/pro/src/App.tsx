import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequirePro } from "@/components/RequirePro";
import { LoginPage } from "@/pages/LoginPage";
import { ConsoleHome } from "@/pages/ConsoleHome";

// Console refuge
import { ShelterConsoleLayout } from "@/pages/shelter/ShelterConsoleLayout";
import { ShelterDashboardPage } from "@/pages/shelter/ShelterDashboardPage";
import { ShelterAnnoncesPage } from "@/pages/shelter/ShelterAnnoncesPage";
import { ShelterCandidaturesPage } from "@/pages/shelter/ShelterCandidaturesPage";
import { ShelterAdoptionsPage } from "@/pages/shelter/ShelterAdoptionsPage";
import { ShelterContractsPage } from "@/pages/shelter/ShelterContractsPage";
import { ContractDocumentPage } from "@/pages/shelter/ContractDocumentPage";
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
        <Route element={<RequirePro />}>
        <Route index element={<ConsoleHome />} />

        {/* Document imprimable : hors shell console (impression propre, sans sidebar). */}
        <Route path="/refuge/contrats/:id/document" element={<ContractDocumentPage />} />

        <Route path="/refuge" element={<ShelterConsoleLayout />}>
          <Route index element={<ShelterDashboardPage />} />
          <Route path="animaux" element={<ShelterAnnoncesPage />} />
          <Route path="candidatures" element={<ShelterCandidaturesPage />} />
          <Route path="adoptions" element={<ShelterAdoptionsPage />} />
          <Route path="contrats" element={<ShelterContractsPage />} />
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
