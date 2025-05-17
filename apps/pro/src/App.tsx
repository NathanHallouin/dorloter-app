import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ConsoleShell } from "@/components/ConsoleShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<ConsoleShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="annonces" element={<PlaceholderPage title="Annonces" />} />
          <Route
            path="candidatures"
            element={<PlaceholderPage title="Candidatures" />}
          />
          <Route path="adoptions" element={<PlaceholderPage title="Adoptions" />} />
          <Route
            path="familles"
            element={<PlaceholderPage title="Familles d'accueil" />}
          />
          <Route path="messages" element={<PlaceholderPage title="Messages" />} />
          <Route path="equipe" element={<PlaceholderPage title="Équipe" />} />
          <Route path="profil" element={<PlaceholderPage title="Profil" />} />
        </Route>
      </Route>

      <Route path="*" element={<PlaceholderPage title="Page introuvable" />} />
    </Routes>
  );
}
