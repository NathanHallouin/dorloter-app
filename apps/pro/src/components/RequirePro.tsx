import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth, shelterApi } from "@dorloter/client";
import { NoAccessPage } from "@/pages/NoAccessPage";

const PRO_ROLES = new Set(["shelter_admin", "pension_admin", "platform_admin"]);

const Spinner = () => (
  <div className="grid min-h-screen place-items-center text-muted-foreground">
    Chargement…
  </div>
);

/**
 * Garde d'accès à l'espace pro. Les rôles pro entrent directement. Un compte
 * `user` peut être membre d'équipe d'un refuge (role=user + appartenance) :
 * on le détecte en sondant un endpoint refuge (résolu par permission côté API).
 * Sinon, écran « réservé aux professionnels ».
 */
export function RequirePro() {
  const { user, loading } = useAuth();
  const isRolePro = !!user && PRO_ROLES.has(user.role);

  const probe = useQuery({
    queryKey: ["pro-access"],
    queryFn: () => shelterApi.pets(),
    enabled: !!user && !isRolePro,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isRolePro) return <Outlet />;
  if (probe.isPending) return <Spinner />;
  if (probe.isSuccess) return <Outlet />;
  return <NoAccessPage />;
}
